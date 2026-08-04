import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { attachRuntimeSocket, RUNTIME_SOCKET_PATH } from "./demo-socket.js";
import { createRuntimeHost } from "./runtime.js";
import { createRuntimeHostApp } from "./runtime-host-app.js";
import { RUNTIME_ACTIONS_PATH, RUNTIME_RUNS_PATH } from "./runtime-http.js";

const config = loadConfig();
const host = createRuntimeHost(config);
const server = createServer(createRuntimeHostApp(host, config));
attachRuntimeSocket(server, host);
const localAccessHost = config.host === "0.0.0.0" ? "127.0.0.1" : config.host;

server.listen(config.port, config.host, () => {
  console.log(
    `Agent Runtime Host listening locally at http://${localAccessHost}:${config.port}`,
  );
  console.log(
    `Runtime HTTP endpoints: POST ${RUNTIME_RUNS_PATH}, POST ${RUNTIME_ACTIONS_PATH}`,
  );
  console.log(
    `Runtime WebSocket endpoint: ws://${localAccessHost}:${config.port}${RUNTIME_SOCKET_PATH}`,
  );
  console.log(
    `CopilotKit Headless endpoint: http://${localAccessHost}:${config.port}${config.endpoint}`,
  );
});
