import type { RuntimeHostConfig } from "./config.js";

export type DependencyHealthStatus =
  | "ready"
  | "unreachable"
  | "unconfigured"
  | "initialization-failed";

export interface DependencyHealth {
  readonly kind: "remote" | "in-process";
  readonly status: DependencyHealthStatus;
  readonly code?: string;
}

export interface RuntimeDependenciesHealth {
  readonly status: "ok" | "degraded";
  readonly dependencies: {
    readonly businessAgent: DependencyHealth;
    readonly presentationPipeline: DependencyHealth;
    readonly modelProvider: DependencyHealth;
    readonly catalog: DependencyHealth;
  };
}

const REMOTE_PROBE_TIMEOUT_MS = 1_500;

function inProcessReady(): DependencyHealth {
  return { kind: "in-process", status: "ready" };
}

export function createRuntimeDependenciesHealth(
  config: RuntimeHostConfig,
): Promise<RuntimeDependenciesHealth> {
  return probeBusinessAgent(config.businessAgentContractUrl).then(
    (businessAgent) => ({
      status: businessAgent.status === "ready" ? "ok" : "degraded",
      dependencies: {
        businessAgent,
        presentationPipeline: inProcessReady(),
        modelProvider: inProcessReady(),
        catalog: inProcessReady(),
      },
    }),
  );
}

async function probeBusinessAgent(baseUrl: string): Promise<DependencyHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(new URL("/health", baseUrl), {
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        kind: "remote",
        status: "unreachable",
        code: "BUSINESS_AGENT_UNREACHABLE",
      };
    }
    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      (body as { status?: unknown }).status !== "ok"
    ) {
      return {
        kind: "remote",
        status: "unreachable",
        code: "BUSINESS_AGENT_UNHEALTHY",
      };
    }
    return { kind: "remote", status: "ready" };
  } catch {
    return {
      kind: "remote",
      status: "unreachable",
      code: "BUSINESS_AGENT_UNREACHABLE",
    };
  } finally {
    clearTimeout(timer);
  }
}
