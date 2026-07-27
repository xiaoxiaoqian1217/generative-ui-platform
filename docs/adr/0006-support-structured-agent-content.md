# ADR-0006: 支持结构化 Agent 内容

- **状态：** 已接受
- **日期：** 2026-07-24

## 背景

ADR-0005 假设业务 Agent 只提供 Markdown。
部分业务 Agent 还可以返回 JSON 结构化数据。
拒绝此类数据或强制 Agent 将其转换为 Markdown，会丢失有用的结构并降低 UI 规划质量。

支持结构化内容不得重新引入业务 Agent 理解 Compiler 专用展示模式、展示意图、组件类型或 UI Plan 的假设。

## 决策

业务 Agent 内容契约接受由 Markdown 和 JSON 结构化数据组成的判别联合。

```ts
type AgentContent =
  | {
      contentType: "markdown";
      markdown: string;
    }
  | {
      contentType: "structured-data";
      data: JsonValue;
      fallbackMarkdown?: string;
    };
```

不得要求业务 Agent 提供 `presentationMode`、`presentationIntent`、组件选择或 UI Plan。

UI Compiler Service 必须先校验结构化数据，再将其传给 Presentation Router 或 Model Adapter。
校验内容包括 JSON 兼容性、配置的嵌套深度、配置的条目数量和请求大小。

Presentation Router 处理两种内容变体。
它返回简单 Markdown 展示决策，或包含 UI Plan Candidate 的 generative UI 决策。
Router 可以使用确定性规则或可替换的 Model Adapter。

结构化数据未转换为 generative UI 时，UI Compiler Service 必须生成确定且安全的 Markdown 表示。
如果存在有效的 `fallbackMarkdown`，Service 将使用它。
Service 必须拒绝空的 Fallback，并在返回或将 Markdown 传给编译降级路径之前执行安全清理。
否则，Service 执行稳定的 JSON 到 Markdown 序列化。
序列化不得执行输入、静默截断数据或静默汇总业务事实。

结构化数据转换为 generative UI 时，适用 ADR-0005 中相同的 UI Plan Candidate、Catalog、Props、Action、UI IR 和 A2UI 校验规则。
UI Compiler Core 与业务 Agent 的原始内容契约和传输格式保持独立。
Core 接收已经选定、Schema 合法但仍不可信的 UI Plan Candidate，以及规范化且已校验的 `sourceData`、`sourceKind`、Fallback Markdown 和 Catalog 引用。
结构化输入的 `sourceData` 保留完整 JSON；Markdown 输入的 `sourceData` 精确为 `{ "markdown": sanitizedMarkdown }`。
未经安全清理的原始 Markdown 不得进入 Core。

如果路由、模型分析、UI Plan Candidate 校验或编译失败，且存在有效源内容，Service 将返回经过安全清理的 Markdown 或确定性 Markdown 序列化结果。

## 后果

- `PresentationRequest` 从仅支持 Markdown 的结构变为 `AgentContent` 判别联合。
- 结构化数据在展示分析和 UI 规划期间保留其结构。
- Markdown 和结构化数据共用相同的 Presentation Router 和 Model Adapter 接缝。
- Structured Data Validator 和 Structured Data Serializer 成为明确的 Service 模块。
- 前端仍消费相同的 `PresentationResult` 联合，不需要单独的原始 JSON 渲染路径。
- 资源限制测试必须覆盖调用模型前的结构化 Agent 内容。
- 可执行展示契约必须连同 Schema 测试、changeset 和明确的版本决策一起引入。

## 取代关系

本 ADR 仅取代 ADR-0005 中仅支持 Markdown 输入的假设。
ADR-0005 在展示路由、模型隔离、UI 编译、校验和降级方面仍具有权威性。
ADR-0007 进一步定义传入 Core 的 `sourceData` 规范和 Catalog 注入边界。
