import type { ConnectionState } from "./types.js";

export async function probeRuntimeHealth(
  endpoint: string,
  fetcher: typeof globalThis.fetch = globalThis.fetch.bind(globalThis),
  timeoutMs = 5_000,
): Promise<ConnectionState> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    const response = await Promise.race([
      fetcher(endpoint, {
        headers: { accept: "application/json" },
        method: "GET",
        signal: controller.signal,
      }),
      new Promise<Response>((_, reject) => {
        timeout = globalThis.setTimeout(() => {
          controller.abort();
          reject(new Error("WORKBENCH_HEALTH_TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
    return response.ok ? "connected" : "unavailable";
  } catch {
    return "unavailable";
  } finally {
    if (timeout !== undefined) {
      globalThis.clearTimeout(timeout);
    }
  }
}
