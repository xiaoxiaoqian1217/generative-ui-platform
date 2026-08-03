import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { describe, expect, it } from "vitest";

interface ListeningEvent {
  event: "business-agent.listening";
  address: string;
}

async function startAgentProcess(): Promise<{
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
  const listening = new Promise<ListeningEvent>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(
      () => reject(new Error(`Agent startup timed out. ${stderr}`)),
      10_000,
    );
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
          if (event.event === "business-agent.listening") {
            clearTimeout(timeout);
            resolve(event);
          }
        } catch {
          // Ignore non-protocol startup output from the process loader.
        }
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(
        new Error(`Agent exited before startup with code ${code}. ${stderr}`),
      );
    });
  });
  const event = await listening;
  return { baseUrl: event.address, child };
}

async function stopAgentProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
}

describe("Reference Business Agent process", () => {
  it("serves health, Run and Resume Action without model credentials", async () => {
    const { baseUrl, child } = await startAgentProcess();
    try {
      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({
        status: "ok",
        service: "business-agent-langgraph",
        checkpoint: "memory",
      });

      const run = await fetch(`${baseUrl}/api/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          protocolVersion: "1.0",
          requestId: "request-process-run",
          threadId: "thread-process",
          runId: "run-process",
          input: { message: "生成巡逻计划" },
        }),
      });
      expect(run.status).toBe(200);
      expect(await run.json()).toMatchObject({
        status: "completed",
        content: {
          contentType: "structured-data",
          data: { kind: "patrol-plan-draft" },
        },
      });

      const resume = await fetch(`${baseUrl}/api/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          protocolVersion: "1.0",
          requestId: "request-process-resume",
          threadId: "thread-process",
          runId: "run-process",
          action: {
            actionId: "confirm-patrol-plan",
            actionType: "patrol.confirm",
            surfaceId: "surface-process",
            approved: true,
          },
        }),
      });
      expect(resume.status).toBe(200);
      expect(await resume.json()).toMatchObject({
        status: "completed",
        threadId: "thread-process",
        runId: "run-process",
        content: {
          contentType: "structured-data",
          data: { kind: "patrol-task", status: "confirmed" },
        },
      });
    } finally {
      await stopAgentProcess(child);
    }
  });
});
