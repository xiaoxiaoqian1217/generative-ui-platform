import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteThreadRepository } from "../src/thread-repository.js";

const resources: Array<{ directory?: string; close: () => void }> = [];
afterEach(() => {
  const closed = resources.splice(0).reverse();
  for (const resource of closed) resource.close();
  for (const resource of closed)
    if (resource.directory !== undefined)
      rmSync(resource.directory, { force: true, recursive: true });
});
function createRepository() {
  const directory = mkdtempSync(join(tmpdir(), "runtime-thread-"));
  const value = createSqliteThreadRepository(join(directory, "threads.sqlite"));
  resources.push({ directory, close: () => value.close() });
  return { file: join(directory, "threads.sqlite"), repository: value };
}

describe("SQLite runtime thread repository", () => {
  it("survives a restart and retains only validated presentation snapshots", () => {
    const { file, repository: first } = createRepository();
    const thread = first.create("Patrol");
    const turn = first.beginTurn({
      threadId: thread.threadId,
      requestId: "request-1",
      runId: "run-1",
      userMessage: "show devices",
    });
    first.finishTurn({
      turnId: turn.turnId,
      status: "completed",
      snapshot: {
        contractVersion: "1.0",
        catalogId: "fixture",
        catalogVersion: "1.0.0",
        compilerVersion: "1.0.0",
        presentation: {
          requestId: "presentation-1",
          status: "completed",
          mode: "markdown",
          markdown: "Safe result",
        },
      },
    });
    const second = createSqliteThreadRepository(file);
    resources.push({ close: () => second.close() });
    const restored = second.get(thread.threadId);
    expect(restored?.turns[0]?.snapshot?.presentation).toEqual({
      requestId: "presentation-1",
      status: "completed",
      mode: "markdown",
      markdown: "Safe result",
    });
  });

  it("supports archive, deletion, and retention cleanup", () => {
    const { repository } = createRepository();
    const thread = repository.create("Delete me");
    expect(repository.archive(thread.threadId)?.status).toBe("archived");
    expect(repository.cleanup(new Date("2099-03-01T00:00:00.000Z"))).toBe(1);
    expect(repository.get(thread.threadId)).toBeUndefined();

    const removable = repository.create("Delete me");
    expect(repository.delete(removable.threadId)).toBe(true);
    expect(repository.get(removable.threadId)).toBeUndefined();
  });

  it("retains a diagnosable terminal state when a presentation snapshot exceeds the history bound", () => {
    const { repository } = createRepository();
    const thread = repository.create("Bounded");
    const turn = repository.beginTurn({
      threadId: thread.threadId,
      requestId: "request-large",
      runId: "run-large",
      userMessage: "large",
    });
    expect(() =>
      repository.finishTurn({
        turnId: turn.turnId,
        status: "completed",
        snapshot: {
          contractVersion: "1.0",
          catalogId: "fixture",
          catalogVersion: "1.0.0",
          compilerVersion: "1.0.0",
          presentation: {
            requestId: "presentation-large",
            status: "completed",
            mode: "markdown",
            markdown: "x".repeat(600_000),
          },
        },
      }),
    ).toThrow("HISTORY_RESOURCE_LIMIT");
    repository.finishTurn({
      turnId: turn.turnId,
      status: "history-write-failed",
      errorCode: "HISTORY_WRITE_FAILED",
    });
    expect(repository.get(thread.threadId)?.turns[0]).toMatchObject({
      status: "history-write-failed",
      errorCode: "HISTORY_WRITE_FAILED",
    });
  });

  it("rejects a duplicate request before creating another turn", () => {
    const { repository } = createRepository();
    const thread = repository.create("Duplicate");
    repository.beginTurn({
      threadId: thread.threadId,
      requestId: "request-duplicate",
      runId: "run-1",
      userMessage: "first",
    });
    expect(() =>
      repository.beginTurn({
        threadId: thread.threadId,
        requestId: "request-duplicate",
        runId: "run-2",
        userMessage: "second",
      }),
    ).toThrow("DUPLICATE_REQUEST");
    expect(repository.get(thread.threadId)?.turns).toHaveLength(1);
  });
});
