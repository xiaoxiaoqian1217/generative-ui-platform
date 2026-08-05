import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type {
  RuntimeConversationTurn,
  RuntimePresentationSnapshot,
  RuntimeThread,
  RuntimeThreadDetail,
  RuntimeThreadPage,
} from "@generative-ui/runtime-contract";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");

const CONTRACT_VERSION = "1.0" as const;
const MAX_THREADS = 500;
const MAX_TURNS_PER_THREAD = 200;
const MAX_SNAPSHOT_BYTES = 512 * 1024;
const MAX_DATABASE_BYTES = 64 * 1024 * 1024;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface ThreadRepository {
  close(): void;
  create(title?: string): RuntimeThread;
  list(cursor?: string, limit?: number): RuntimeThreadPage;
  get(threadId: string): RuntimeThreadDetail | undefined;
  rename(threadId: string, title: string): RuntimeThread | undefined;
  archive(threadId: string): RuntimeThread | undefined;
  delete(threadId: string): boolean;
  clear(): number;
  cleanup(now?: Date): number;
  beginTurn(input: {
    threadId: string;
    requestId: string;
    runId: string;
    userMessage: string;
  }): RuntimeConversationTurn;
  finishTurn(input: {
    turnId: string;
    status: "completed" | "failed" | "cancelled" | "history-write-failed";
    errorCode?: string;
    snapshot?: RuntimePresentationSnapshot;
  }): void;
  updateRunSnapshot(
    threadId: string,
    runId: string,
    snapshot: RuntimePresentationSnapshot,
  ): boolean;
}

function now(): string {
  return new Date().toISOString();
}
function titleFrom(message: string): string {
  const compact = message.replace(/\s+/gu, " ").trim();
  return compact.slice(0, 80) || "New debug conversation";
}
function parse<T>(value: string): T {
  return JSON.parse(value) as T;
}
function required(row: Record<string, string | null>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error("RUNTIME_HISTORY_CORRUPT");
  return value;
}

export function createSqliteThreadRepository(file: string): ThreadRepository {
  mkdirSync(dirname(file), { recursive: true });
  const db: InstanceType<typeof DatabaseSync> = new DatabaseSync(file);
  db.exec(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS runtime_thread_schema_migrations (version INTEGER PRIMARY KEY);",
  );
  const migrated = db
    .prepare(
      "SELECT version FROM runtime_thread_schema_migrations WHERE version = 1",
    )
    .get() as { version: number } | undefined;
  if (migrated === undefined)
    db.exec(`BEGIN;
CREATE TABLE IF NOT EXISTS runtime_threads (thread_id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runtime_turns (turn_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES runtime_threads(thread_id) ON DELETE CASCADE, request_id TEXT NOT NULL UNIQUE, run_id TEXT NOT NULL, user_message TEXT NOT NULL, status TEXT NOT NULL, error_code TEXT, snapshot_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS runtime_threads_updated_idx ON runtime_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS runtime_turns_thread_idx ON runtime_turns(thread_id, created_at);
INSERT INTO runtime_thread_schema_migrations(version) VALUES (1);
COMMIT;`);
  const toThread = (row: Record<string, string | null>): RuntimeThread => ({
    contractVersion: CONTRACT_VERSION,
    threadId: required(row, "thread_id"),
    title: required(row, "title"),
    status: required(row, "status") as RuntimeThread["status"],
    createdAt: required(row, "created_at"),
    updatedAt: required(row, "updated_at"),
  });
  const toTurn = (
    row: Record<string, string | null>,
  ): RuntimeConversationTurn => ({
    contractVersion: CONTRACT_VERSION,
    turnId: required(row, "turn_id"),
    threadId: required(row, "thread_id"),
    requestId: required(row, "request_id"),
    runId: required(row, "run_id"),
    userMessage: required(row, "user_message"),
    status: required(row, "status") as RuntimeConversationTurn["status"],
    createdAt: required(row, "created_at"),
    updatedAt: required(row, "updated_at"),
    ...(row.error_code == null ? {} : { errorCode: row.error_code }),
    ...(row.snapshot_json == null
      ? {}
      : { snapshot: parse<RuntimePresentationSnapshot>(row.snapshot_json) }),
  });
  const assertCapacity = () => {
    const count = Number(
      (
        db.prepare("SELECT COUNT(*) AS count FROM runtime_threads").get() as {
          count: number;
        }
      ).count,
    );
    if (count >= MAX_THREADS) throw new Error("HISTORY_RESOURCE_LIMIT");
    const pageCount = Number(
      (db.prepare("PRAGMA page_count").get() as { page_count: number })
        .page_count,
    );
    const pageSize = Number(
      (db.prepare("PRAGMA page_size").get() as { page_size: number }).page_size,
    );
    if (pageCount * pageSize >= MAX_DATABASE_BYTES)
      throw new Error("HISTORY_RESOURCE_LIMIT");
  };
  return {
    close() {
      db.close();
    },
    create(title) {
      assertCapacity();
      const timestamp = now();
      const thread: RuntimeThread = {
        contractVersion: CONTRACT_VERSION,
        threadId: randomUUID(),
        title: title?.trim().slice(0, 120) || "New debug conversation",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.prepare("INSERT INTO runtime_threads VALUES (?, ?, ?, ?, ?)").run(
        thread.threadId,
        thread.title,
        thread.status,
        timestamp,
        timestamp,
      );
      return thread;
    },
    list(cursor, limit = 50) {
      const bounded = Math.max(1, Math.min(limit, 100));
      const cursorParts = cursor?.split("|");
      const rows = (
        cursorParts === undefined ||
        cursorParts[0] === undefined ||
        cursorParts[1] === undefined
          ? db
              .prepare(
                "SELECT * FROM runtime_threads ORDER BY updated_at DESC, thread_id DESC LIMIT ?",
              )
              .all(bounded + 1)
          : db
              .prepare(
                "SELECT * FROM runtime_threads WHERE (updated_at < ? OR (updated_at = ? AND thread_id < ?)) ORDER BY updated_at DESC, thread_id DESC LIMIT ?",
              )
              .all(cursorParts[0], cursorParts[0], cursorParts[1], bounded + 1)
      ) as Record<string, string | null>[];
      const items = rows.slice(0, bounded).map(toThread);
      const last = items.at(-1);
      return {
        items,
        ...(rows.length > bounded && last
          ? { nextCursor: `${last.updatedAt}|${last.threadId}` }
          : {}),
      };
    },
    get(threadId) {
      const thread = db
        .prepare("SELECT * FROM runtime_threads WHERE thread_id = ?")
        .get(threadId) as Record<string, string | null> | undefined;
      if (!thread) return undefined;
      const turns = db
        .prepare(
          "SELECT * FROM runtime_turns WHERE thread_id = ? ORDER BY created_at",
        )
        .all(threadId) as Record<string, string | null>[];
      return { thread: toThread(thread), turns: turns.map(toTurn) };
    },
    rename(threadId, title) {
      const text = title.trim().slice(0, 120);
      if (!text) return undefined;
      db.prepare(
        "UPDATE runtime_threads SET title = ?, updated_at = ? WHERE thread_id = ?",
      ).run(text, now(), threadId);
      return this.get(threadId)?.thread;
    },
    archive(threadId) {
      db.prepare(
        "UPDATE runtime_threads SET status = 'archived', updated_at = ? WHERE thread_id = ?",
      ).run(now(), threadId);
      return this.get(threadId)?.thread;
    },
    delete(threadId) {
      return (
        db
          .prepare("DELETE FROM runtime_threads WHERE thread_id = ?")
          .run(threadId).changes > 0
      );
    },
    clear() {
      return Number(db.prepare("DELETE FROM runtime_threads").run().changes);
    },
    cleanup(at = new Date()) {
      return Number(
        db
          .prepare("DELETE FROM runtime_threads WHERE updated_at < ?")
          .run(new Date(at.getTime() - RETENTION_MS).toISOString()).changes,
      );
    },
    beginTurn(input) {
      if (
        db
          .prepare("SELECT 1 FROM runtime_turns WHERE request_id = ?")
          .get(input.requestId) !== undefined
      )
        throw new Error("DUPLICATE_REQUEST");
      let thread = this.get(input.threadId)?.thread;
      if (!thread) thread = this.create(titleFrom(input.userMessage));
      else if (thread.title === "New debug conversation")
        this.rename(thread.threadId, titleFrom(input.userMessage));
      const count = (
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM runtime_turns WHERE thread_id = ?",
          )
          .get(thread.threadId) as { count: number }
      ).count;
      if (count >= MAX_TURNS_PER_THREAD)
        throw new Error("HISTORY_RESOURCE_LIMIT");
      const timestamp = now();
      const turn: RuntimeConversationTurn = {
        contractVersion: CONTRACT_VERSION,
        turnId: randomUUID(),
        threadId: thread.threadId,
        requestId: input.requestId,
        runId: input.runId,
        userMessage: input.userMessage.slice(0, 16_384),
        status: "pending",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.prepare(
        "INSERT INTO runtime_turns VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)",
      ).run(
        turn.turnId,
        turn.threadId,
        turn.requestId,
        turn.runId,
        turn.userMessage,
        turn.status,
        timestamp,
        timestamp,
      );
      db.prepare(
        "UPDATE runtime_threads SET updated_at = ? WHERE thread_id = ?",
      ).run(timestamp, thread.threadId);
      return turn;
    },
    finishTurn(input) {
      const snapshot =
        input.snapshot === undefined
          ? undefined
          : JSON.stringify(input.snapshot);
      if (
        snapshot !== undefined &&
        Buffer.byteLength(snapshot) > MAX_SNAPSHOT_BYTES
      )
        throw new Error("HISTORY_RESOURCE_LIMIT");
      db.prepare(
        "UPDATE runtime_turns SET status = ?, error_code = ?, snapshot_json = ?, updated_at = ? WHERE turn_id = ?",
      ).run(
        input.status,
        input.errorCode ?? null,
        snapshot ?? null,
        now(),
        input.turnId,
      );
    },
    updateRunSnapshot(threadId, runId, snapshot) {
      const value = JSON.stringify(snapshot);
      if (Buffer.byteLength(value) > MAX_SNAPSHOT_BYTES)
        throw new Error("HISTORY_RESOURCE_LIMIT");
      return (
        db
          .prepare(
            "UPDATE runtime_turns SET status = 'completed', snapshot_json = ?, updated_at = ? WHERE thread_id = ? AND run_id = ?",
          )
          .run(value, now(), threadId, runId).changes > 0
      );
    },
  };
}
