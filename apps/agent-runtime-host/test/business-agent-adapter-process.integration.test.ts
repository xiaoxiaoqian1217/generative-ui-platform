import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeHost } from "../src/runtime.js";
import {
  createTestPresentationPipeline,
  testRuntimeHostConfig,
} from "./test-runtime-dependencies.js";

interface ListeningEvent {
  event: "business-agent.listening";
  address: string;
}

const children: ChildProcess[] = [];

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}

async function startReferenceAgent(): Promise<{
  baseUrl: string;
  child: ChildProcess;
}> {
  const agentDirectory = resolve(process.cwd(), "../business-agent-langgraph");
  const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts"], {
    cwd: agentDirectory,
    env: {
      ...process.env,
      BUSINESS_AGENT_HOST: "127.0.0.1",
      BUSINESS_AGENT_PORT: "0",
      ANTHROPIC_API_KEY: "",
      OPENAI_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  return new Promise((resolveStartup, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      void stopChild(child).finally(() =>
        reject(new Error(`Reference Agent startup timed out. ${stderr}`)),
      );
    }, 10_000);
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      const lines = stdout.split(/\r?\n/u);
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as ListeningEvent;
          if (!settled && event.event === "business-agent.listening") {
            settled = true;
            clearTimeout(timeout);
            resolveStartup({ baseUrl: event.address, child });
          }
        } catch {
          // Ignore non-protocol output from the TypeScript process loader.
        }
      }
    });
    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          `Reference Agent exited before startup with code ${code}. ${stderr}`,
        ),
      );
    });
  });
}

afterEach(async () => {
  await Promise.all(children.splice(0).map(stopChild));
});

describe("Runtime Host Business Agent Adapter process integration", () => {
  it("runs and resumes the real Agent through the Host's contract-only seam", async () => {
    const { baseUrl } = await startReferenceAgent();
    const host = createRuntimeHost(
      testRuntimeHostConfig({ businessAgentContractUrl: baseUrl }),
      { presentationPipeline: createTestPresentationPipeline() },
    );

    const run = await host.runBusinessAgent({
      protocolVersion: "1.0",
      requestId: "request-process-run",
      threadId: "thread-process-adapter",
      runId: "run-process-adapter",
      input: { message: "Create a patrol plan" },
    });
    expect(run).toMatchObject({
      requestId: "request-process-run",
      threadId: "thread-process-adapter",
      runId: "run-process-adapter",
      status: "completed",
      content: {
        contentType: "structured-data",
        data: { kind: "patrol-plan-draft" },
      },
    });

    const resumed = await host.resumeBusinessAgentAction({
      protocolVersion: "1.0",
      requestId: "request-process-resume",
      threadId: "thread-process-adapter",
      runId: "run-process-adapter",
      action: {
        actionId: "confirm-patrol-plan",
        actionType: "patrol.confirm",
        surfaceId: "surface-process-adapter",
        approved: true,
      },
    });
    expect(resumed).toMatchObject({
      requestId: "request-process-resume",
      threadId: "thread-process-adapter",
      runId: "run-process-adapter",
      status: "completed",
      content: {
        contentType: "structured-data",
        data: { kind: "patrol-task", status: "confirmed" },
      },
    });
  }, 20_000);
});
