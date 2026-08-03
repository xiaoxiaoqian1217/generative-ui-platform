import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { LangGraphHttpBusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import { afterEach, describe, expect, it } from "vitest";

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
  const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts"], {
    cwd: process.cwd(),
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

  return new Promise((resolve, reject) => {
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
            resolve({ baseUrl: event.address, child });
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

describe("Business Agent Adapter process integration", () => {
  it("runs and resumes the real LangGraph Agent with the same thread and run", async () => {
    const { baseUrl } = await startReferenceAgent();
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl,
      requestTimeoutMs: 5_000,
      maxRetries: 0,
    });

    const run = await adapter.run({
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

    const resumed = await adapter.resumeAction({
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
  }, 15_000);
});
