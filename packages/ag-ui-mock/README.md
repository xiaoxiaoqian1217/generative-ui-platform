# AGUIMock

`@generative-ui/ag-ui-mock` 是可复用的确定性 AG-UI 协议测试替身。
它用于本地开发、自动化测试和演示，不拥有 Runtime Truth，也不执行真实业务副作用。

## CLI

```bash
pnpm --filter @generative-ui/ag-ui-mock build
pnpm --filter @generative-ui/ag-ui-mock start -- --port 4800 --scenario locate-device
```

可用场景:

- `echo` 返回输入文本；
- `locate-device` 调用 `locateDevice({ deviceId: "01" })`，消费浏览器 Tool Result 后返回完成消息。

服务暴露:

- `GET /health`；
- `GET /api/copilotkit/info`；
- `POST /api/copilotkit/agent/default/run`，使用 AG-UI SSE 事件流。

## Server API

```ts
import { createAguiMockServer } from "@generative-ui/ag-ui-mock";

const server = createAguiMockServer({ scenario: "locate-device" });
const address = await server.listen({ port: 0 });

console.log(address.url);
await server.close();
```
