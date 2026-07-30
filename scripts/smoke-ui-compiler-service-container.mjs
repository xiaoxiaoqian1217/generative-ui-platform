import { execFileSync } from "node:child_process";

const image = "ui-compiler-service:smoke";
const container = `ui-compiler-service-smoke-${process.pid}`;
const port = "18080";

function docker(...arguments_) {
  return execFileSync("docker", arguments_, { encoding: "utf8" }).trim();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // The container can still be binding the local port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Container health check did not become ready.");
}

try {
  docker(
    "build",
    "-f",
    "apps/ui-compiler-service/Dockerfile",
    "-t",
    image,
    ".",
  );
  docker(
    "run",
    "-d",
    "--rm",
    "--name",
    container,
    "-p",
    `127.0.0.1:${port}:3000`,
    image,
  );
  await waitForHealth();
  const version = await (
    await fetch(`http://127.0.0.1:${port}/version`)
  ).json();
  if (version.service !== "ui-compiler-service")
    throw new Error("Unexpected version response.");
  const response = await fetch(
    `http://127.0.0.1:${port}/api/ui-compiler/present`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "container-smoke",
        content: { contentType: "markdown", markdown: "# hello" },
        catalog: { catalogId: "test", catalogVersion: "1.0.0" },
      }),
    },
  );
  const result = await response.json();
  if (!response.ok || result.mode !== "markdown")
    throw new Error("Unexpected presentation response.");
  if (docker("inspect", "--format", "{{.Config.User}}", container) !== "node")
    throw new Error("Container must use the node user.");
  process.stdout.write("UI Compiler Service container smoke test passed.\n");
} finally {
  try {
    docker("stop", container);
  } catch {
    /* The container may not have started. */
  }
}
