import { afterEach, describe, expect, it, vi } from "vitest";
import { probeRuntimeHealth } from "../../src/runtime/health.js";

describe("Runtime health probe", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats unsuccessful HTTP responses as unavailable", async () => {
    await expect(
      probeRuntimeHealth(
        "https://runtime.example/health/dependencies",
        async () => new Response(null, { status: 503 }),
      ),
    ).resolves.toBe("unavailable");
  });

  it("stops waiting when the health endpoint hangs", async () => {
    vi.useFakeTimers();
    const result = probeRuntimeHealth(
      "https://runtime.example/health/dependencies",
      () => new Promise<Response>(() => {}),
      25,
    );

    await vi.advanceTimersByTimeAsync(25);

    await expect(result).resolves.toBe("unavailable");
  });
});
