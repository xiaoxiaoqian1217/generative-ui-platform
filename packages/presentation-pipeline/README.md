# Presentation Pipeline

`@generative-ui/presentation-pipeline` 是可嵌入 Agent Runtime Host 的展示后处理 Package。

它接收 `PresentationRequest`，保留 Markdown 清理、结构化数据校验与序列化、Catalog 加载与校验、展示路由、Model Adapter、不可信候选校验、UI Compiler Core 调用和安全 Markdown 降级边界。

Package 不读取进程环境，不启动端口，也不依赖具体 Business Agent、LangGraph、Web 或任何 App。

## 组装

```ts
import {
  createFixtureModelAdapter,
  createPresentationPipeline,
  FIXTURE_COMPONENT_CATALOG,
} from "@generative-ui/presentation-pipeline";

const pipeline = createPresentationPipeline({
  catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
  modelAdapter: createFixtureModelAdapter(),
  createSurfaceId: (request) => `surface-${request.requestId}`,
});

const result = await pipeline.present({
  requestId: "example",
  content: { contentType: "markdown", markdown: "# Safe content" },
  catalog: { catalogId: "fixture", catalogVersion: "1.0.0" },
});
```

真实运行组合根应注入授权 Catalog Repository、Model Adapter、Surface ID 工厂和显式配置。

`createFixtureModelAdapter` 只提供无需模型密钥的确定性开发验证路径。
