import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(projectRoot, "index.html"), "utf8");

assert.match(html, /new WebSocket\(websocketUrl\)/);
assert.match(html, /ws:\/\/localhost:8200\/ws\/demo/);
assert.match(html, /fetch\(httpUrl/);
assert.match(html, /http:\/\/localhost:8200\/api\/demo\/message/);
assert.match(html, /transport = 'websocket'/);
assert.match(html, /transport = 'http'/);
assert.match(html, /type: "user_message"/);
assert.match(html, /当前未接入真实 Business Agent/);
assert.match(html, /完整文本消息闭环/);

console.log("Web demo smoke contract passed");
