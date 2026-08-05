import type {
  RuntimeThread,
  RuntimeThreadDetail,
  RuntimeThreadPage,
} from "@generative-ui/runtime-contract";
import {
  validateRuntimeThreadDetail,
  validateRuntimeThreadPage,
} from "@generative-ui/runtime-contract";

async function json(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error("RUNTIME_THREAD_REQUEST_FAILED");
  return response.json();
}

export async function listRuntimeThreads(
  endpoint: string,
  cursor?: string,
): Promise<RuntimeThreadPage> {
  const url = new URL(endpoint);
  if (cursor !== undefined) url.searchParams.set("cursor", cursor);
  const value = validateRuntimeThreadPage(await json(await fetch(url)));
  if (!value.success) throw new Error("RUNTIME_THREAD_RESPONSE_INVALID");
  return value.value;
}

export async function getRuntimeThread(
  endpoint: string,
  threadId: string,
): Promise<RuntimeThreadDetail> {
  const value = validateRuntimeThreadDetail(
    await json(await fetch(`${endpoint}/${encodeURIComponent(threadId)}`)),
  );
  if (!value.success) throw new Error("RUNTIME_THREAD_RESPONSE_INVALID");
  return value.value;
}

export async function createRuntimeThread(
  endpoint: string,
): Promise<RuntimeThread> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  return (await json(response)) as RuntimeThread;
}

export async function deleteRuntimeThread(
  endpoint: string,
  threadId: string,
): Promise<"completed" | "partial" | "failed"> {
  const response = await fetch(`${endpoint}/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  });
  const body = (await response.json()) as { status?: unknown };
  if (
    body.status !== "completed" &&
    body.status !== "partial" &&
    body.status !== "failed"
  )
    throw new Error("RUNTIME_THREAD_DELETE_INVALID");
  return body.status;
}

export async function renameRuntimeThread(
  endpoint: string,
  threadId: string,
  title: string,
): Promise<void> {
  await json(
    await fetch(`${endpoint}/${encodeURIComponent(threadId)}/rename`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    }),
  );
}

export async function archiveRuntimeThread(
  endpoint: string,
  threadId: string,
): Promise<void> {
  await json(
    await fetch(`${endpoint}/${encodeURIComponent(threadId)}/archive`, {
      method: "POST",
    }),
  );
}
