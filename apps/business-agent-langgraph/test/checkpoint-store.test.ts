import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ReferenceBusinessAgent } from "../src/agent.js";
import { SqliteCheckpointStore } from "../src/checkpoint-store.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function request(threadId: string) {
  return {
    protocolVersion: "1.0" as const,
    requestId: "request",
    threadId,
    runId: "run",
    input: { message: "生成巡逻计划" },
  };
}

describe("SQLite Business Agent checkpoints", () => {
  it("restores a paused workflow after process-equivalent recreation", async () => {
    const directory = mkdtempSync(join(tmpdir(), "business-checkpoint-"));
    directories.push(directory);
    const file = join(directory, "checkpoints.sqlite");
    const firstStore = new SqliteCheckpointStore(file);
    await new ReferenceBusinessAgent(firstStore).run(request("thread-1"));
    firstStore.close();
    const secondStore = new SqliteCheckpointStore(file);
    const resumed = await new ReferenceBusinessAgent(secondStore).resume({
      protocolVersion: "1.0",
      requestId: "resume",
      threadId: "thread-1",
      runId: "run",
      action: {
        actionId: "confirm-patrol-plan",
        actionType: "patrol.confirm",
        surfaceId: "surface",
        approved: true,
      },
    });
    secondStore.close();
    expect(resumed.status).toBe("completed");
  });

  it("deletes a persisted thread checkpoint without affecting another thread", async () => {
    const directory = mkdtempSync(join(tmpdir(), "business-checkpoint-"));
    directories.push(directory);
    const store = new SqliteCheckpointStore(
      join(directory, "checkpoints.sqlite"),
    );
    const agent = new ReferenceBusinessAgent(store);
    await agent.run(request("thread-delete"));
    await agent.run(request("thread-keep"));
    await agent.deleteThread("thread-delete");
    store.close();

    const reopened = new SqliteCheckpointStore(
      join(directory, "checkpoints.sqlite"),
    );
    const restarted = new ReferenceBusinessAgent(reopened);
    const deleted = await restarted.resume({
      protocolVersion: "1.0",
      requestId: "resume-delete",
      threadId: "thread-delete",
      runId: "run",
      action: {
        actionId: "confirm-patrol-plan",
        actionType: "patrol.confirm",
        surfaceId: "surface",
        approved: true,
      },
    });
    const kept = await restarted.resume({
      protocolVersion: "1.0",
      requestId: "resume-keep",
      threadId: "thread-keep",
      runId: "run",
      action: {
        actionId: "confirm-patrol-plan",
        actionType: "patrol.confirm",
        surfaceId: "surface",
        approved: true,
      },
    });
    reopened.close();

    expect(deleted.status).toBe("failed");
    expect(kept.status).toBe("completed");
  });
});
