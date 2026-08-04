<!-- cspell:ignore dashscope Doubao Kimi Moonshot Qwen volces -->

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

## Fixture 故障模拟

`createFixtureModelAdapter` 的默认行为保持确定性不变。
测试可以通过 `fault` 显式模拟 `timeout`、`rate-limited`、`invalid-candidate` 或 `provider-failure`。
超时、重试和候选校验仍由 `createModelPresentationRouter` 统一负责，Fixture 不建立平行策略。

## OpenAI-compatible Provider

`createPresentationModelProviderRegistry` 可以在同一进程内注册 Kimi、豆包、GLM、通义千问或自定义 OpenAI-compatible Provider。
内置 Base URL 分别来自 [Kimi API](https://platform.kimi.com/docs/api/overview)、[火山方舟](https://www.volcengine.com/docs/82379/1795150)、[智谱 OpenAI API](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction) 和 [阿里云百炼](https://help.aliyun.com/en/model-studio/base-url) 官方文档。
模型名、Base URL、Endpoint ID 和 API Key 是独立配置项。
Endpoint ID 存在时仅作为兼容请求的 `model` 值，`modelName` 继续作为供应商无关的安全诊断标识。
Qwen 的 JSON 输出请求会显式设置 `enable_thinking: false`，避免 thinking 模型与 JSON mode 冲突。

```ts
import {
  createModelPresentationRouter,
  createPresentationModelProviderRegistry,
} from "@generative-ui/presentation-pipeline";

const registry = createPresentationModelProviderRegistry([
  {
    registrationId: "doubao-primary",
    provider: "doubao",
    modelName: runtimeConfig.presentationModelName,
    endpointId: runtimeConfig.presentationEndpointId,
    baseUrl: runtimeConfig.presentationBaseUrl,
    apiKey: secrets.presentationApiKey,
  },
]);

const router = createModelPresentationRouter(
  registry.resolve("doubao-primary"),
  { modelTimeoutMs: 30_000, modelRetryCount: 1 },
);
```

Package 不读取 `process.env`，Runtime Host 组合根应从安全配置源读取值后显式注入。
Registry 的 `list()` 只返回 Registration ID、Provider 和 Model Name，不返回 API Key、Base URL 或 Endpoint ID。
Adapter 不记录完整 Prompt、Authorization、Provider 原始响应或错误正文。
可选的 `onInvocationSummary` 只接收供应商无关的耗时、Token Usage、安全 Response ID 和稳定错误码。
Provider 候选保持为 `unknown`，必须继续通过 Router 的 `validatePresentationDecision` 和 UI Compiler Core 的 Catalog 约束。

## 真实 Provider 本地联调

常规 `pnpm test` 不产生模型费用，真实调用默认跳过。
专用命令会在缺少必填配置时失败，避免把未执行误报为通过。

```powershell
$env:PRESENTATION_PROVIDER_SMOKE_PROVIDER = "kimi"
$env:PRESENTATION_PROVIDER_SMOKE_MODEL_NAME = "<configured-model-name>"
$env:PRESENTATION_PROVIDER_SMOKE_API_KEY = "<secret>"
$env:PRESENTATION_PROVIDER_SMOKE_BASE_URL = "<optional-https-base-url>"
$env:PRESENTATION_PROVIDER_SMOKE_ENDPOINT_ID = "<optional-endpoint-id>"
真实 Provider 仅在 Workbench 本地联调中使用，不提供独立 smoke 命令。
```

`PRESENTATION_PROVIDER_SMOKE_PROVIDER` 支持 `kimi`、`doubao`、`glm`、`qwen` 和 `openai-compatible`。
自定义 `openai-compatible` Provider 必须提供 `PRESENTATION_PROVIDER_SMOKE_BASE_URL`。
