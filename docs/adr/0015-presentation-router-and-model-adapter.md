<!-- cspell:ignore backoff jitter -->

# ADR-0015: 固化 Presentation Router 和 Model Adapter 接口

- **状态：** 已接受
- **日期：** 2026-07-29

## 背景

UI Compiler Service 必须在调用 UI Compiler Core 前决定业务 Agent 内容应返回安全 Markdown，还是进入受控的 generative UI 编译链路。
业务 Agent 只提供 Markdown 或 JSON 结构化数据，不提供展示模式、展示意图或 UI Plan Candidate。
Presentation Router 可以对明确场景使用确定性规则，但需要语义分析时必须通过可替换的 Model Adapter 调用模型。

现有 `presentation-contract` 已经拥有 `PresentationDecision`、`UIPlan` 和对应运行时 Schema。
现有 `component-catalog-schema` 已经拥有完整 Catalog Schema 和 `computeCatalogContentHash`。
现有 `compiler-contract` 已经拥有 `CatalogContentHash` 的线路表示。
ADR-0007 要求 Router 和 Core 使用同一份已验证 Catalog 修订版本。
ADR-0014 要求所有 Markdown 在进入 Router、Model Adapter、Core、缓存或日志前完成清理。

如果 Router 接口复制公共类型、让具体供应商 SDK 类型越过 Adapter 边界、把分类和规划拆成两次调用，或者允许模型看到与 Core 不同的 Catalog 修订版本，后续实现将产生不一致的候选 Schema、重复费用、取消失效和难以稳定映射的错误。

本 ADR 只固化 Presentation Router 和 Model Adapter 的 Service 内部接口、候选输出 Schema、Catalog 能力摘要、一次调用语义、超时、有限重试、取消、错误映射和供应商隔离。
本 ADR 不实现 Router、Model Adapter、Markdown Sanitizer、Structured Data Serializer、UI Compiler Core、HTTP Endpoint、业务 Agent 或供应商 SDK。

## 决策驱动因素

- Router 成功结果必须只有 `markdown` 和 `generative-ui` 两个互斥分支。
- generative UI 分支必须在同一次逻辑模型调用中包含完整 UI Plan Candidate。
- 模型输出必须保持不可信，并在进入 Core 前通过现有运行时 Schema 校验。
- Router 和 Core 必须绑定同一份 Catalog ID、版本和内容哈希。
- 供应商请求、响应、错误、流式事件和 SDK 类型不得进入公共契约或 Core。
- 模型调用必须支持调用方取消、确定的总超时和有限重试。
- 错误分类和公共错误代码必须稳定，不能依赖供应商错误文本。
- 原始未清理 Markdown 不得进入 Router、Model Adapter、缓存或日志。
- 接口必须便于使用 Fake Adapter、受控时钟和 AbortSignal 做确定性测试。

## 候选方案

### 候选 A: Router 直接依赖具体供应商 SDK

该方案让 Router 构造供应商请求、解析供应商响应并处理供应商异常。
实现会把展示策略、供应商协议和重试策略混在同一模块中。
替换供应商会修改 Router，供应商类型也容易泄漏到 Presentation Contract 或 Core。
该方案不采用。

### 候选 B: 使用完全通用的 Chat Completion Adapter

该方案只暴露任意消息、任意工具和任意供应商选项。
通用接口无法表达本系统必须一次产生完整候选判别联合的约束，也会允许调用方把分类和规划拆成多个模型步骤。
供应商专有选项通常会通过松散对象重新泄漏到应用层。
该方案不采用。

### 候选 C: 使用展示决策专用的窄 Adapter

该方案让 Router 只依赖一个展示决策专用接口。
Adapter 接收已经安全化且供应商无关的请求，返回 `unknown` 候选或稳定的 Adapter 错误。
Router 使用 `presentation-contract` 的现有 Validator 将候选提升为 `PresentationDecision`。
具体 Adapter 独占供应商请求构造、Structured Output 配置、响应提取、超时、重试和错误归一化。
该方案采用。

## 决策

Presentation Router 和 Model Adapter 都属于 UI Compiler Service 的应用边界。
它们不得放入 `packages/ui-compiler-core`，也不得改变 Core 的职责。
Service 是组合根，负责注入具体 Model Adapter、Model Invocation Policy、Catalog Snapshot 和请求级 AbortSignal。

Router 可以在不调用模型的情况下执行确定性快捷判断。
需要语义分析时，Router 必须调用一次 Model Adapter 逻辑操作，并用同一候选 Schema 同时获得展示决策和可选 UI Plan Candidate。

## 规范接口

以下 TypeScript 形状是实现必须保持的语义接口。
具体文件名和工厂函数名可以由实现 Issue 决定，但不得放宽输入信任边界、输出联合、取消、Catalog 身份或错误语义。

```ts
import type { CatalogContentHash } from "@generative-ui/compiler-contract";
import type {
  CatalogObjectValueSchema,
  ComponentNesting,
} from "@generative-ui/component-catalog-schema";
import type {
  JsonValue,
} from "@generative-ui/shared-types";
import type {
  PresentationContext,
  PresentationDecision,
  UIPlan,
} from "@generative-ui/presentation-contract";

declare const sanitizedMarkdownBrand: unique symbol;

type SanitizedMarkdown = string & {
  readonly [sanitizedMarkdownBrand]: "SanitizedMarkdown";
};

type RoutableAgentContent =
  | {
      contentType: "markdown";
      markdown: SanitizedMarkdown;
    }
  | {
      contentType: "structured-data";
      data: JsonValue;
      fallbackMarkdown?: SanitizedMarkdown;
    };

interface CatalogCapabilitySummary {
  summaryVersion: "1.0";
  catalog: {
    catalogId: string;
    catalogVersion: string;
    catalogContentHash: CatalogContentHash;
  };
  components: readonly {
    componentType: string;
    displayName: string;
    description: string;
    category: "common" | "domain";
    domainTags: readonly string[];
    allowedActions: readonly string[];
    nesting: ComponentNesting;
  }[];
  actions: readonly {
    actionType: string;
    description: string;
    payloadSchema: CatalogObjectValueSchema;
    destructive: boolean;
    requiresApproval: boolean;
  }[];
}

interface PresentationRouteRequest {
  requestId: string;
  content: RoutableAgentContent;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
}

interface PresentationRouteOptions {
  signal: AbortSignal;
}

interface PresentationRouter {
  route(
    request: PresentationRouteRequest,
    options: PresentationRouteOptions,
  ): Promise<PresentationDecision>;
}

interface ModelPresentationRequest {
  requestId: string;
  content: RoutableAgentContent;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
  outputSchema: {
    schemaId: "https://generative-ui.dev/schemas/presentation/decision/1.0";
    schemaVersion: "1.0";
  };
}

interface ModelInvocationPolicy {
  modelTimeoutMs: number;
  modelRetryCount: number;
}

interface ModelCallOptions {
  signal: AbortSignal;
  policy: ModelInvocationPolicy;
}

interface ModelAdapter {
  generatePresentationDecisionCandidate(
    request: ModelPresentationRequest,
    options: ModelCallOptions,
  ): Promise<unknown>;
}
```

`PresentationContext`、`PresentationDecision` 和 `UIPlan` 必须复用 `presentation-contract` 的导出。
`JsonValue` 必须复用 `shared-types` 的导出。
`CatalogContentHash` 必须复用 `compiler-contract` 的线路类型。
`ComponentNesting` 和 `CatalogObjectValueSchema` 必须复用 `component-catalog-schema` 的导出。
实现不得在 Service 内复制这些公共类型或创建语义不同的同名 Schema。

`SanitizedMarkdown` 复用 ADR-0014 的进程内品牌语义。
Router 和 Adapter 的接口不得提供把普通 `string` 强制转换为该品牌的公共辅助函数。
只有 Markdown Sanitizer 成功结果可以创建该值。

`ModelAdapter` 返回 `unknown` 是有意的可信边界。
即使供应商宣称 Structured Output 已通过 Schema，Router 仍必须调用 `validatePresentationDecision`。
只有 Validator 成功返回的值才是 `PresentationDecision`。

## 候选输出 Schema

模型候选输出的唯一规范 Schema 是 `presentation-contract` 已发布的 `presentationDecisionSchema`。
Adapter 可以把该 Schema 转换为供应商 Structured Output 格式，但不得修改必填字段、联合分支或 `additionalProperties` 约束。
Service 不得维护第二份手写 JSON Schema。

候选联合语义如下。

```ts
type PresentationDecisionCandidate =
  | {
      mode: "markdown";
      reason: string;
    }
  | {
      mode: "generative-ui";
      reason: string;
      plan: UIPlan;
    };
```

`mode = "markdown"` 时禁止出现 `plan`。
`mode = "generative-ui"` 时必须出现完整 `UIPlan`。
两个分支都禁止额外字段。
`UIPlan` 必须继续表达语义区域、源数据绑定、组件偏好、布局约束和 Action 意图，不得包含最终权威组件树、UI IR、A2UI、DOM、可执行代码、组件实例或供应商响应对象。

候选通过 Schema 校验后仍然是不可信输入。
Service 只能把 generative UI 分支的 `plan`、安全 `sourceData`、安全 Fallback Markdown 和 Catalog 引用交给 Core。
Core 继续负责 Catalog、组件、Props、Action、结构、绑定和内容哈希的权威校验及 lowering。

## 一次模型调用语义

一次 Router `route` 调用可以走以下两条路径之一。

1. Router 使用确定性规则直接返回一个合法 `PresentationDecision`，模型调用次数为零。
2. Router 构造一个完整的 `ModelPresentationRequest`，执行一次 `generatePresentationDecisionCandidate` 逻辑调用，并校验其完整候选结果。

一次逻辑模型调用必须同时覆盖展示模式判定和 generative UI 分支的 UI Plan Candidate 生成。
禁止先调用模型分类，再调用模型生成 UI Plan。
禁止在得到 `generative-ui` 但缺少或包含非法 `plan` 时执行第二次模型修复调用。
禁止用工具调用、供应商对话续写或隐藏的后续 Completion 绕过一次调用约束。

同一逻辑调用内部可以因符合重试条件的传输或供应商暂时错误产生多个物理请求尝试。
所有重试必须重放相同的语义请求、候选 Schema、Catalog 摘要和安全内容。
重试不属于第二次分类或规划调用，不得改变提示词、降低 Schema 或补充模型生成内容。

候选 JSON 无法解析、候选 Schema 非法或 UI Plan 语义校验失败时不得重试模型。
Service 必须记录稳定错误并降级为安全 Markdown 表示。

## Catalog 能力摘要和修订身份

UI Compiler Service 必须先从授权来源加载完整 Catalog，再使用 `component-catalog-schema` 的运行时 Validator 校验它。
Service 必须对该完整已验证 Catalog 调用共享的 `computeCatalogContentHash`。
禁止对能力摘要单独计算哈希，禁止使用 `JSON.stringify` 或供应商缓存键代替规范 Catalog 内容哈希。

Service 必须从同一个不可变 Catalog Snapshot 派生 `CatalogCapabilitySummary` 和传给 Core 的完整 Catalog。
摘要中的 `catalogId`、`catalogVersion` 和 `catalogContentHash` 必须与该 Snapshot 完全一致。
请求中的 Catalog ID 或版本、加载的 Catalog、摘要身份或传给 Core 的身份存在任何不匹配时，Service 必须在模型调用前失败或安全降级。

能力摘要 Version 1.0 只包含生成 UI Plan Candidate 所需的能力。
组件摘要包含组件类型、展示名称、描述、类别、领域标签、允许 Action 和嵌套约束。
Action 摘要包含 Action 类型、描述、Payload Schema、破坏性标记和审批标记。
摘要不包含组件 Props Schema，因为当前 UI Plan Candidate 不生成权威 Props。
如果未来 Candidate 契约需要生成 Props，必须先修改公共契约和本 ADR，不能静默扩大摘要。

摘要必须由纯确定性投影生成。
组件按 `componentType` 的 Unicode 码点顺序排序，Action 按 `actionType` 的 Unicode 码点顺序排序。
`domainTags`、`allowedActions`、`allowedChildTypes` 和 `allowedParentTypes` 也按相同顺序复制并排序。
投影必须创建只读副本，不能把可变 Catalog 对象直接暴露给 Router 或 Adapter。

摘要 ID、版本和哈希用于证明 Router 看到了哪一个完整 Catalog 修订版本。
摘要内容本身不替代 Core 的完整 Catalog 校验，也不会使模型建议成为权威选择。

## 超时

`modelTimeoutMs` 表示一次逻辑 Model Adapter 调用的总墙钟时限。
该时限包括所有物理尝试、可取消 Backoff、供应商响应读取、响应提取和错误归一化。
它不是每次重试重新开始的时限。

`modelTimeoutMs` 必须是有限正整数。
实现必须在 Service 启动时校验配置，并拒绝零、负数、非整数、非有限值和超过部署硬上限的值。
默认值和部署硬上限由 Model Adapter 实现 Issue 在阶段三集成测试前写入版本化配置。

Adapter 必须把调用方 `signal` 与内部总超时 Signal 组合。
总超时到期后，Adapter 必须取消进行中的供应商请求、停止读取响应、停止 Backoff，并以 `MODEL_TIMEOUT` 结束。
Adapter 不得在超时后启动新尝试，也不得返回超时后才到达的候选结果。

## 有限重试

`modelRetryCount` 表示第一次尝试之外允许的最大额外尝试次数。
总物理尝试次数最多为 `1 + modelRetryCount`。
`modelRetryCount` 必须是有限的非负整数，并受版本化配置中的小型硬上限约束。
实现不得提供无限重试、递归重试或由供应商响应任意扩大重试次数的选项。

只有归一化为 `rate-limited`、`unavailable` 或明确瞬时 `provider-error` 的错误可以在总时限剩余时重试。
认证失败、权限失败、无效请求、内容安全拒绝、候选解析失败、候选 Schema 失败、调用方取消和内部编程错误不得重试。

Backoff 必须可被 `AbortSignal` 立即中断。
实现应使用带 Jitter 的有界指数 Backoff。
供应商 `Retry-After` 可以作为提示，但等待时间必须受剩余总时限和本地 Backoff 上限约束。
Adapter 不得把原始请求、原始响应或错误正文保存到重试状态或日志。

如果可重试错误在达到重试次数上限前仍未恢复，Adapter 返回 `MODEL_RETRY_EXHAUSTED`，并只携带最后一个稳定原因代码和实际尝试次数。
如果总时限先到期，则最终代码是 `MODEL_TIMEOUT`。

## 取消

每次 Router 和 Adapter 调用都必须接收非可选的调用方 `AbortSignal`。
HTTP 请求中止、Service 请求级取消和上层生命周期取消必须通过同一个请求级 Signal 向下传播。

如果 Signal 在调用前已经中止，Router 不得运行确定性分析以外的副作用，Adapter 不得创建供应商请求。
如果 Signal 在调用中中止，Adapter 必须尽力取消供应商请求、响应读取和 Backoff。
取消后不得重试，不得返回迟到候选，也不得继续调用 Core。

调用方取消映射为 `MODEL_CANCELLED`。
`MODEL_CANCELLED` 的 `retryable` 为 `false`，因为同一已取消请求不能继续。
该语义不判断调用方是否可以创建一个全新的业务请求。

当调用方取消和内部总超时竞争时，Adapter 必须先检查调用方 Signal。
已经中止的调用方 Signal 优先映射为 `MODEL_CANCELLED`，否则内部 Deadline 映射为 `MODEL_TIMEOUT`。

## 稳定错误分类

Model Adapter 跨边界抛出的值必须是 Service 自有的规范错误，不得是供应商 SDK Error。
规范错误至少包含以下安全字段。

```ts
type ModelErrorCategory =
  | "cancelled"
  | "timeout"
  | "rate-limited"
  | "unavailable"
  | "authentication"
  | "permission"
  | "invalid-request"
  | "content-filtered"
  | "invalid-response"
  | "provider-error"
  | "retry-exhausted";

type ModelErrorCode =
  | "MODEL_CANCELLED"
  | "MODEL_TIMEOUT"
  | "MODEL_RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_AUTHENTICATION_FAILED"
  | "MODEL_PERMISSION_DENIED"
  | "MODEL_REQUEST_REJECTED"
  | "MODEL_CONTENT_FILTERED"
  | "MODEL_INVALID_RESPONSE"
  | "MODEL_PROVIDER_ERROR"
  | "MODEL_RETRY_EXHAUSTED";

type RetryableModelErrorCode =
  | "MODEL_RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_PROVIDER_ERROR";

type ModelAdapterErrorCase<
  TCategory extends ModelErrorCategory,
  TCode extends ModelErrorCode,
  TRetryable extends boolean,
> = {
  name: "ModelAdapterError";
  category: TCategory;
  code: TCode;
  retryable: TRetryable;
  attempts: number;
};

type ModelAdapterError =
  | ModelAdapterErrorCase<"cancelled", "MODEL_CANCELLED", false>
  | ModelAdapterErrorCase<"timeout", "MODEL_TIMEOUT", true>
  | ModelAdapterErrorCase<"rate-limited", "MODEL_RATE_LIMITED", true>
  | ModelAdapterErrorCase<"unavailable", "MODEL_UNAVAILABLE", true>
  | ModelAdapterErrorCase<
      "authentication",
      "MODEL_AUTHENTICATION_FAILED",
      false
    >
  | ModelAdapterErrorCase<"permission", "MODEL_PERMISSION_DENIED", false>
  | ModelAdapterErrorCase<"invalid-request", "MODEL_REQUEST_REJECTED", false>
  | ModelAdapterErrorCase<"content-filtered", "MODEL_CONTENT_FILTERED", false>
  | ModelAdapterErrorCase<"invalid-response", "MODEL_INVALID_RESPONSE", false>
  | ModelAdapterErrorCase<"provider-error", "MODEL_PROVIDER_ERROR", false>
  | (ModelAdapterErrorCase<
      "retry-exhausted",
      "MODEL_RETRY_EXHAUSTED",
      true
    > & {
      lastRetryableCode: RetryableModelErrorCode;
    });
```

稳定映射如下。

| 规范分类 | 稳定代码 | Adapter 内部可重试 | 公共 `retryable` |
|---|---|---:|---:|
| 调用方取消 | `MODEL_CANCELLED` | 否 | 否 |
| 总时限到期 | `MODEL_TIMEOUT` | 否 | 是 |
| 供应商限流 | `MODEL_RATE_LIMITED` | 是 | 是 |
| 网络失败或供应商暂时不可用 | `MODEL_UNAVAILABLE` | 是 | 是 |
| 认证失败 | `MODEL_AUTHENTICATION_FAILED` | 否 | 否 |
| 权限失败 | `MODEL_PERMISSION_DENIED` | 否 | 否 |
| 供应商拒绝请求参数或上下文限制 | `MODEL_REQUEST_REJECTED` | 否 | 否 |
| 供应商安全策略拒绝 | `MODEL_CONTENT_FILTERED` | 否 | 否 |
| 响应缺失、截断、无法解析或不符合结构化响应约定 | `MODEL_INVALID_RESPONSE` | 否 | 否 |
| 未知且不能证明为瞬时的供应商错误 | `MODEL_PROVIDER_ERROR` | 否 | 否 |
| 可重试错误达到尝试上限 | `MODEL_RETRY_EXHAUSTED` | 否 | 是 |

只有具体 Adapter 能根据供应商稳定状态码或异常类型证明错误是瞬时错误时，才可以把 `provider-error` 标为 Adapter 内部可重试。
依赖供应商自然语言错误文本、区域化消息或堆栈内容判断分类是禁止的。

供应商成功响应中无法提取候选 JSON 时使用 `MODEL_INVALID_RESPONSE`。
已经提取出的候选 JSON 未通过 `validatePresentationDecision` 时使用 `PRESENTATION_DECISION_INVALID`，不伪装成供应商错误。
Router 自身的确定性规则或组合逻辑失败时使用 `PRESENTATION_ROUTING_FAILED`。

Model Adapter 错误映射为公共 `PresentationError` 时，`stage` 使用 `model-analysis`。
Router 自身错误使用 `presentation-routing`。
候选联合或 UI Plan Candidate 校验错误使用 `model-analysis` 或 `ui-plan-validation` 中与失败位置对应的阶段，并保留现有稳定契约错误代码。
只要存在有效安全内容，这些错误都必须由 Service 映射为 degraded Markdown，而不是把供应商错误直接返回调用方。

## 供应商隔离边界

具体 Adapter 实现可以依赖一个供应商 SDK。
供应商依赖只能存在于 UI Compiler Service 的具体 Adapter 模块及其私有测试中。
`presentation-contract`、`component-catalog-schema`、`compiler-contract` 和 `ui-compiler-core` 不得依赖供应商 SDK。

以下内容不得越过 Model Adapter 边界。

- 供应商请求对象。
- 供应商响应对象。
- 供应商流式事件。
- 供应商工具调用对象。
- 供应商 Finish Reason 枚举。
- 供应商 Usage、Header、Request ID 或错误类。
- 供应商原始错误正文、堆栈和响应片段。

Adapter 只可以向 Router 返回候选 JSON 值，或抛出本 ADR 定义的规范错误。
如果可观测性需要 Token、模型名称、尝试次数或耗时，Adapter 必须在内部转换为供应商无关的数值或字符串字段，并通过独立的元数据回调记录。
这些元数据不得加入 `PresentationDecision`、UI Plan Candidate、UICompileRequest 或 Core 输入。

Adapter 不得把原始响应缓存为候选修复材料。
Adapter 不得把供应商对象嵌入 `reason`、`plan`、错误 `details` 或日志。

## Markdown 和结构化数据边界

Service 必须在请求 Schema、请求体限制和结构化数据资源限制校验后，才构造 `PresentationRouteRequest`。
Markdown 内容和结构化数据中的 `fallbackMarkdown` 必须先通过 ADR-0014 Policy 1.0。
Router 和 Adapter 只接受 `RoutableAgentContent`，不得保留接收原始 `AgentContent` 的重载。

Markdown 输入传给 Router 和 Adapter 的唯一值是 `SanitizedMarkdown`。
结构化数据必须是完整且经过 JSON、深度和条目数量校验的 `JsonValue`。
结构化数据的 Fallback 如果存在，必须是 `SanitizedMarkdown`。
Router 和 Adapter 不得重新解析原始 HTTP Body，也不得从日志、缓存或旁路字段恢复原始 Markdown。

`context.userMessage` 是经过请求 Schema 和资源限制校验的普通上下文文本，不是 Markdown Fallback。
Adapter 可以将其用于同一次展示决策，但不得记录原文，也不得把它加入 UI Plan Candidate。

## 失败和降级

Router、Adapter、候选解析、候选 Schema 或 UI Plan Candidate 校验失败时，不得调用 Core。
Service 必须使用已经准备好的安全 Markdown 或确定性结构化数据序列化结果降级。
降级继续遵守 ADR-0009。

Markdown Sanitization 失败时，Service 必须遵守 ADR-0014，且 Router 和 Adapter 调用次数为零。
Catalog 加载、Schema、引用或身份校验失败时，Model Adapter 调用次数也必须为零。
没有安全可消费内容时，Service 返回完整失败和固定安全消息。

## 测试策略

后续实现 Issue 必须通过 Fake Adapter、受控时钟、可观察 AbortSignal 和调用计数器验证本 ADR。

### Router 和候选 Schema

- 确定性 Markdown 决策返回 `mode = "markdown"`，Model Adapter 调用次数为零。
- 确定性 generative UI 决策返回包含完整 `UIPlan` 的联合分支。
- 模型路径只执行一次逻辑 Adapter 调用。
- Markdown 分支包含 `plan` 时校验失败。
- generative UI 分支缺少 `plan` 或包含非法 `UIPlan` 时校验失败且不执行修复调用。
- 候选额外字段、供应商对象、DOM、代码或 UI IR 字段被拒绝。
- Schema 合法候选进入 Core 前仍接受权威 Catalog 和结构校验。

### Catalog 修订身份

- Router 摘要与完整 Catalog 使用相同 ID、版本和内容哈希。
- 请求引用、加载 Catalog、摘要或 Core 注入选项任一不匹配时模型调用次数为零。
- 更改 Catalog 任意字段会改变完整 Catalog 内容哈希。
- 能力摘要投影和排序是确定性的，且不会修改原 Catalog。
- 摘要不替代 Core 对完整 Catalog 的重新计算和校验。

### 超时、重试和取消

- 总超时覆盖所有尝试和 Backoff，并稳定返回 `MODEL_TIMEOUT`。
- `modelRetryCount = 0` 时最多执行一次物理请求。
- 可重试错误最多执行 `1 + modelRetryCount` 次物理请求。
- 认证、权限、请求、内容安全、非法响应和候选 Schema 错误不重试。
- Retry Exhausted 返回实际尝试次数和最后稳定代码，不包含供应商正文。
- 预先中止的 Signal 不创建供应商请求。
- 进行中取消会中止请求和 Backoff，不重试，不返回迟到候选。
- 调用方取消与超时竞争时遵守本 ADR 的优先级。

### 供应商隔离和安全

- 公共包和 Core 的依赖图中不存在供应商 SDK。
- Adapter 返回类型保持为 `unknown`，调用方必须使用运行时 Validator。
- 供应商响应、错误类、Header、Request ID 和 Finish Reason 不进入 Router、Core 或公共结果。
- Router 和 Adapter Spy 只观察到已清理 Markdown。
- Logger Spy 不观察到原始 Markdown、用户消息、结构化业务数据、供应商响应或错误正文。
- Router 或 Adapter 失败时返回安全 Markdown 降级，且 Core 调用次数为零。

## 后果

- Router 的成功输出与现有 `PresentationDecision` 契约完全一致。
- 分类和规划不会被拆成两次模型调用。
- 同一逻辑调用仍可以对明确瞬时错误执行有限且可取消的重试。
- Model Adapter 可以替换供应商，而不修改 Presentation Contract 或 Core。
- Catalog 摘要和 Core 编译通过同一 ID、版本和内容哈希绑定到一个修订版本。
- 原始未清理 Markdown 无法通过 Router 或 Adapter 接口进入模型路径。
- Provider Structured Output 不能取代本地运行时校验。
- Service 需要维护一组稳定的 Adapter 错误映射和供应商无关测试 Fixture。
- 当前任务不新增供应商依赖，也不实现 Router 或 Adapter。

## 取代关系

本 ADR 细化 ADR-0005 的展示路由和一次模型调用决策、ADR-0006 的结构化内容输入、ADR-0007 的 Catalog 注入和内容哈希边界，以及 ADR-0014 的 Markdown 信任边界。
这些 ADR 的其他决策继续有效。
本 ADR 不改变 ADR-0008 至 ADR-0011 的 A2UI、降级、协议和缓存决策。
本 ADR 不改变 ADR-0013 对 AG-UI Run 生命周期的外部归属。
