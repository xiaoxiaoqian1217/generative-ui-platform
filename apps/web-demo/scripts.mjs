import { copyFile, mkdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const sourceFile = join(projectRoot, "index.html");
const outputDirectory = join(projectRoot, "dist");
const outputFile = join(outputDirectory, "index.html");

async function build() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await copyFile(sourceFile, outputFile);
  console.log(`Web demo built at ${outputFile}`);
}

function startDevelopmentServer() {
  const port = Number(process.env.WEB_DEMO_PORT ?? "5173");

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid WEB_DEMO_PORT value: ${process.env.WEB_DEMO_PORT ?? ""}`);
  }

  const server = createServer(async (request, response) => {
    if (request.url !== "/" && request.url !== "/index.html") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const html = await import("node:fs/promises").then(({ readFile }) =>
      readFile(sourceFile, "utf8"),
    );

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    });
    response.end(html);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Web demo listening at http://localhost:${port}`);
  });
}

const command = process.argv[2];

if (command === "build") {
  await build();
} else if (command === "dev") {
  startDevelopmentServer();
} else {
  throw new Error("Usage: node scripts.mjs <build|dev>");
}
