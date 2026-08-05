import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { deserialize, serialize } from "node:v8";
import { MemorySaver } from "@langchain/langgraph";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");

/**
 * Persists LangGraph's own opaque checkpoint representation.
 * This store intentionally has no Runtime or Presentation dependencies.
 */
export class SqliteCheckpointStore extends MemorySaver {
  readonly #database: InstanceType<typeof DatabaseSync>;

  constructor(file: string) {
    super();
    mkdirSync(dirname(file), { recursive: true });
    this.#database = new DatabaseSync(file);
    this.#database.exec(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS business_checkpoints (id INTEGER PRIMARY KEY CHECK (id = 1), storage_blob BLOB NOT NULL, writes_blob BLOB NOT NULL);",
    );
    const saved = this.#database
      .prepare(
        "SELECT storage_blob, writes_blob FROM business_checkpoints WHERE id = 1",
      )
      .get() as
      | { storage_blob: Uint8Array; writes_blob: Uint8Array }
      | undefined;
    if (saved !== undefined) {
      this.storage = deserialize(saved.storage_blob) as typeof this.storage;
      this.writes = deserialize(saved.writes_blob) as typeof this.writes;
    }
  }

  #flush(): void {
    this.#database
      .prepare(
        "INSERT INTO business_checkpoints (id, storage_blob, writes_blob) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET storage_blob = excluded.storage_blob, writes_blob = excluded.writes_blob",
      )
      .run(serialize(this.storage), serialize(this.writes));
  }

  override async put(
    ...args: Parameters<MemorySaver["put"]>
  ): ReturnType<MemorySaver["put"]> {
    const result = await super.put(...args);
    this.#flush();
    return result;
  }

  override async putWrites(
    ...args: Parameters<MemorySaver["putWrites"]>
  ): ReturnType<MemorySaver["putWrites"]> {
    const result = await super.putWrites(...args);
    this.#flush();
    return result;
  }

  override async deleteThread(
    ...args: Parameters<MemorySaver["deleteThread"]>
  ): ReturnType<MemorySaver["deleteThread"]> {
    const result = await super.deleteThread(...args);
    this.#flush();
    return result;
  }

  close(): void {
    this.#database.close();
  }
}
