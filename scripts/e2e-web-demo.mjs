import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import process from "node:process";

const runtimePort = 18_200;
const webPort = 15_173;
const runtimeBaseUrl = `http://127.0.0.1:${runtimePort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const children = [];

function startProcess(name, command, args, env) {
  const output = [];
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  children.push({ child, name, output });
  return child;
}

async function waitForHttp(url, name, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        return response;
      }
      lastError = new Error(`${name} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `${name} did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

function waitForWebSocketMessage(socket, predicate, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for WebSocket message"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("error", onError);
    }

    function onMessage(event) {
      try {
        const message = JSON.parse(String(event.data));
        if (predicate(message)) {
          cleanup();
          resolve(message);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    }

    function onError() {
      cleanup();
      reject(new Error("WebSocket connection failed"));
    }

    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", onError);
  });
}

async function openWebSocket(url) {
  const socket = new WebSocket(url);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out opening WebSocket"));
    }, 5_000);

    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket connection failed"));
      },
      { once: true },
    );
  });

  return socket;
}

async function stopChildren() {
  await Promise.all(
    children.map(
      ({ child }) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve();
            return;
          }

          const timeout = setTimeout(() => child.kill("SIGKILL"), 3_000);
          child.once("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
          child.kill("SIGTERM");
        }),
    ),
  );
}

try {
  startProcess(
    "Agent Runtime Host",
    process.execPath,
    ["apps/agent-runtime-host/dist/main.js"],
    {
      HOST: "127.0.0.1",
      PORT: String(runtimePort),
      COPILOTKIT_TELEMETRY_DISABLED: "true",
      PRESENTATION_MODEL_PROVIDER: "fixture",
    },
  );
  startProcess(
    "Web Demo",
    process.execPath,
    ["apps/web-demo/scripts.mjs", "dev"],
    { WEB_DEMO_PORT: String(webPort) },
  );

  const healthResponse = await waitForHttp(
    `${runtimeBaseUrl}/health`,
    "Agent Runtime Host",
  );
  const health = await healthResponse.json();
  assert.deepEqual(
    {
      businessAgentConnected: health.businessAgentConnected,
      demoHttpPath: health.demoHttpPath,
      demoSocketPath: health.demoSocketPath,
      status: health.status,
    },
    {
      businessAgentConnected: false,
      demoHttpPath: "/api/demo/message",
      demoSocketPath: "/ws/demo",
      status: "ok",
    },
  );

  const pageResponse = await waitForHttp(`${webBaseUrl}/`, "Web Demo");
  const html = await pageResponse.text();
  assert.match(html, /Generative UI Platform Web Demo/);
  assert.match(html, /HTTP POST/);
  assert.match(html, /WebSocket/);
  assert.match(html, /当前未接入真实 Business Agent/);

  const httpMessageId = "e2e-http-1";
  const httpResponse = await fetch(`${runtimeBaseUrl}/api/demo/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "user_message",
      messageId: httpMessageId,
      content: "HTTP 端到端测试",
    }),
  });
  assert.equal(httpResponse.status, 200);
  const httpMessage = await httpResponse.json();
  assert.equal(httpMessage.type, "agent_message");
  assert.equal(httpMessage.replyTo, httpMessageId);
  assert.match(httpMessage.content, /当前未接入真实 Business Agent/);

  const socket = await openWebSocket(`ws://127.0.0.1:${runtimePort}/ws/demo`);
  try {
    const systemMessage = await waitForWebSocketMessage(
      socket,
      (message) => message.type === "system_message",
    );
    assert.match(systemMessage.content, /当前未接入真实 Business Agent/);

    const webSocketMessageId = "e2e-websocket-1";
    const agentMessagePromise = waitForWebSocketMessage(
      socket,
      (message) =>
        message.type === "agent_message" &&
        message.replyTo === webSocketMessageId,
    );
    socket.send(
      JSON.stringify({
        type: "user_message",
        messageId: webSocketMessageId,
        content: "WebSocket 端到端测试",
      }),
    );

    const webSocketMessage = await agentMessagePromise;
    assert.match(webSocketMessage.content, /当前未接入真实 Business Agent/);
  } finally {
    socket.close();
  }

  console.log("Web Demo end-to-end validation passed");
} catch (error) {
  for (const { name, output } of children) {
    process.stderr.write(`\n--- ${name} output ---\n${output.join("")}\n`);
  }
  throw error;
} finally {
  await stopChildren();
}
