# ADR-0019: 将 UI Compiler Service 重构为 Agent Runtime Host 内部 Presentation Pipeline

- **状态：** 部分被 ADR-0027 取代
- **日期：** 2026-07-31

## ADR-0027 取代说明

ADR-0027 不否定本 ADR 对 Package 边界和当前 Reference Integration 组合方式的决策，但取代以下长期产品结论：

- Agent Runtime Host 是 Generative UI Platform 长期统一后端和唯一产品宿主；
- Presentation Pipeline 必须依附完整 Agent Run / Runtime Truth 生命周期才能成立。

以下结论继续有效：

- `packages/presentation-pipeline` 是独立可嵌入 Package；
- 当前 Reference Integration Host 可以进程内嵌入 Presentation Pipeline；
- Packages 不依赖 Apps；
- UI Compiler Core、Presentation Router、Model Adapter、Catalog 和公共契约保持独立边界；
- 当前不为未经验证的远程调用场景同时维护 Embedded / Remote 两套 Compiler 部署模式；
- ADR-0015 的 Router / Model Adapter 语义继续有效。

因此，本文后续“Runtime Host 成为平台统一后端”等表述应理解为 2026-07-31 Runtime-first 阶段的参考组合决策，不再定义 ADR-0027 下的 Generative UI Core 产品边界。

## 背景

ADR-0018 将仓库范围从单一 Generative UI Compiler MVP 扩展为平台全链路开发验证环境。
ADR-0018 同时沿用了原 Compiler MVP 的独立服务部署假设，即 Agent Runtime Host 通过 HTTP Client 调用 UI Compiler Service。

当时平台确认了以下产品和运行边界：

- Web 只连接 Agent Runtime Host。
- Business Agent 通过 Business Agent Adapter 接入 Agent Runtime Host。
- Business Agent 只返回 Markdown 或结构化业务数据。
- 展示决策、Model Adapter、UI Plan Candidate 和 A2UI 编译属于平台对 Business Agent 输出的后处理链路。
- 当时没有脱离 Agent Runtime Host 的已确认独立远程调用方。
- 当时业务规模、团队边界、发布周期和运行规模不需要为 UI Compiler 建立独立服务 SLA 或独立扩容单元。

在该前提下继续保留独立 UI Compiler Service，会为一次 Agent Run 增加内部 HTTP 调用、独立端口、服务发现、健康检查、部署配置、跨服务超时、跨服务追踪和额外故障边界。
这些成本不能直接提高当时平台的核心验证价值。

UI Compiler 的公共性来自稳定契约、独立 Packages 和明确依赖方向，而不是必须通过独立网络服务体现。

## 决策驱动因素

- 当时业务前端只接入一个平台后端入口。
- 当时 Reference Integration 中 Business Agent 输出和展示编译属于同一次 Agent Run 的处理生命周期。
- 当时 Agent Run 的 requestId、runId、取消信号、超时预算、降级和可观测上下文在同一进程内连续传递。
- 当前阶段应减少部署、联调、E2E 和故障定位成本。
- UI Compiler Core、Model Adapter、Catalog 和公共契约仍必须保持独立、可测试和可复用。
- 不得形成 `apps/agent-runtime-host` 直接依赖 `apps/ui-compiler-service` 的应用到应用依赖。
- 不应为了未经验证的未来远程调用场景同时维护 Embedded 和 Remote 两套运行模式。
- 如果未来出现明确的独立调用方、扩容或团队边界，应能够基于独立 Packages 重新建立远程服务。

## 决策

### 运行和部署边界

取消 `apps/ui-compiler-service` 作为目标架构中的独立部署应用。

在当时的 Runtime-first Reference Integration 中，Agent Runtime Host 作为应用组合根，在完成 Business Agent Run 或收到可展示的 AgentContent 后直接调用进程内 Presentation Pipeline。

参考链路为：

```text
Web / Frontend
        |
        v
Agent Runtime Host
        |
        +---- Business Agent Adapter ----> Business Agent
        |                                      |
        |                                      v
        |                           Markdown / Structured Data
        |
        +---- Presentation Pipeline
                 |
                 +---- Markdown Sanitizer
                 +---- Structured Data Validator / Serializer
                 +---- Presentation Router
                 +---- Model Adapter
                 +---- Catalog Repository
                 +---- UI Compiler Core
                 |
                 v
          PresentationResult
                 |
                 v
        Frontend Markdown / A2UI Renderer
```

当前仍不保留独立 UI Compiler HTTP Service、UI Compiler Client 或 `UI_COMPILER_MODE=remote` 双模式。
未来是否重新建立远程服务，必须由新的需求证据和 ADR 决定。

ADR-0027 之后，这一 Runtime Host 嵌入方式属于 Reference Integration，不再等价于 Generative UI Core 的长期唯一部署形态。

### 代码和模块边界

原 `apps/ui-compiler-service` 中与 HTTP、CLI 和独立进程生命周期无关的展示应用能力，迁移为独立 Package：

```text
packages/presentation-pipeline
```

该 Package 负责：

- 接收 `PresentationRequest` 或等价内部展示请求；
- 清理 Markdown；
- 校验和安全序列化结构化数据；
- 加载并校验 Component Catalog；
- 调用 Presentation Router；
- 在需要语义分析时调用 Model Adapter；
- 校验模型产生的候选 Presentation Decision 和 UI Plan Candidate；
- 调用 UI Compiler Core；
- 生成 `PresentationResult`；
- 在模型、路由或编译失败时执行安全 Markdown 降级；
- 提供供应商无关的可观测性 Port。

Reference Integration Host 负责组装该 Package 的具体依赖，但不得把展示规则、Catalog 规则、模型供应商响应类型或 Core 编译逻辑复制到 Runtime 层。

### 依赖方向

目标依赖方向为：

```text
apps/agent-runtime-host
        |
        v
packages/presentation-pipeline
        |
        +---- packages/presentation-contract
        +---- packages/component-catalog-schema
        +---- packages/ui-compiler-core
        +---- packages/compiler-contract
        +---- packages/shared-types
```

必须遵守：

- Packages 不得依赖 Apps；
- `ui-compiler-core` 不得依赖 Agent Runtime Host；
- `ui-compiler-core` 不得调用模型、网络或 Business Agent；
- Presentation Pipeline 不得依赖具体 Business Agent 实现；
- Agent Runtime Host 不得直接构造 UI Plan Candidate、UI IR 或 A2UI。

未来如果 Presentation Pipeline 被其他 Integration Host 或 Package API 调用，这些依赖规则继续保持不变。

### Model Adapter 归属

Model Adapter 的逻辑归属仍是展示决策和 UI 编译子系统。

在当前 Reference Integration 中，它运行在 Agent Runtime Host 进程内，但只能由 Presentation Router 或 Presentation Pipeline 调用。

Model Adapter 只负责：

```text
已清理 AgentContent
+ 展示上下文
+ Catalog 能力摘要
        |
        v
Presentation Decision Candidate
```

`Presentation Decision Candidate` 的具体联合语义以 ADR-0015 为准：Router 可先做确定性判断，需要语义分析时才调用 Model Adapter；只有 `generative-ui` 分支携带完整 UI Plan Candidate。

Model Adapter 不负责 Business Agent 意图识别、业务工具调用、业务状态、任务规划或流程恢复。
Business Agent 如需大模型，必须使用独立业务模型客户端和业务契约，不得复用 Presentation Model Adapter 的提示词和职责。

### A2UI 权威边界

UI Compiler Core 继续是唯一可信 A2UI 生产者。

模型输出始终是不可信候选输入。
模型输出必须经过运行时 Schema、Component Catalog、Props、Action、Binding 和结构校验后，才能被 Core 降低为 UI IR 并编译为 A2UI。

Agent Runtime Host、Business Agent、Model Adapter 和 Frontend Runtime 均不得绕过 Core 直接产生可信 A2UI。

### 生命周期、错误和降级

在当前 Reference Integration 中，Presentation Pipeline 可以共享一次 Agent interaction 的关联标识、取消信号、超时预算和必要观察上下文。

ADR-0027 之后，这种共享不再意味着 Presentation Pipeline 的公共契约必须依赖 Runtime Thread / Turn / Operation / Surface。
纯 Presentation Integration 所需 metadata 与 Deferred Runtime metadata 的进一步解耦需要独立任务审查。

Business Agent 已产生有效业务内容后，展示编译失败不得使有效业务结果丢失。
默认失败语义为：

```text
Model / Router / Compiler 失败
        |
        v
安全 Markdown 降级
        |
        v
返回可消费 PresentationResult 和安全诊断
```

只有输入本身无法安全消费、Catalog 无法建立可信边界或 Integration Host 无法生成任何安全结果时，才允许返回失败结果。

### 可观测性

ADR-0017 的敏感数据限制、稳定字段、阶段耗时和供应商无关 Observability Port 继续有效。

当前 Reference Integration 的 HTTP 请求生命周期由 Agent Runtime Host 统一拥有。
Presentation Pipeline 只记录展示阶段事件，不拥有独立 UI Compiler HTTP 请求终局。

事件命名可以随宿主变化，但不得放宽以下限制：

- 不记录原始或清理后的完整业务内容；
- 不记录 API Key、Authorization、模型原始响应和模型隐藏推理；
- 不向应用层暴露具体日志、追踪或指标 SDK 类型；
- 可观测性失败不得改变业务结果、展示结果、降级路径或 HTTP 状态。

## 备选方案

### 方案一：继续独立部署 UI Compiler Service

该方案具有独立扩容、故障隔离和跨语言远程调用优势。

当前未采用，因为没有已确认的独立 SLA、独立团队或独立扩容需求。
当前为这些假设承担内部 HTTP 和运维成本属于过早服务化。

### 方案二：同时支持 Embedded 和 Remote 两种模式

该方案可以同时保留简单部署和远程复用能力。

当前未采用，因为它需要长期维护两套组合根、配置、测试、错误路径和部署文档。
在没有第二个真实调用场景前，双模式会扩大当前验证范围并降低确定性。

### 方案三：把全部 Compiler 代码直接移动进 Agent Runtime Host

该方案最容易减少目录和部署数量。

当前未采用，因为它会破坏 Compiler Core、Model Adapter、Catalog 和契约的独立复用能力，并容易把 Business Agent、Runtime 和展示编译职责耦合在同一个应用模块中。

## 与既有决策的关系

本 ADR 部分取代 ADR-0018 中以下结论：

- Generative UI Compiler 在当时平台阶段保持独立部署；
- Runtime Host 通过 UI Compiler Client 调用 UI Compiler Service；
- Model Adapter 的进程归属固定为独立 UI Compiler Service。

ADR-0027 进一步部分取代本 ADR 的长期 Runtime Host 产品定位；具体取代范围见本文开头“ADR-0027 取代说明”。

本 ADR 部分取代 ADR-0016 中以独立 UI Compiler HTTP Service 为前提的 HTTP 生命周期归属。
ADR-0016 的客户端断开、取消、超时、优雅关闭和稳定错误语义继续作为适用宿主的安全要求。

本 ADR 部分取代 ADR-0017 中以独立 UI Compiler HTTP 请求为终局的事件命名和请求所有权。
ADR-0017 的安全字段、敏感数据限制、阶段耗时、清理测试和供应商无关 Observability Port 继续有效。

ADR-0014 的 Markdown 清理安全边界继续有效，其适用宿主从 UI Compiler Service 调整为 Presentation Pipeline。

ADR-0015 的 Presentation Router、Model Adapter 和供应商隔离边界继续有效，其适用宿主从 UI Compiler Service 调整为 Presentation Pipeline。

UI Compiler Core、Compiler Contract、Presentation Contract、Component Catalog 和 A2UI Profile 相关 ADR 不受本次部署决策影响。

## 后果

### 正面影响

- 当前 Reference Integration 通常只需部署一个后端 Host；
- 开发验证环境减少一个独立后端进程、端口和健康检查；
- 不再需要内部 UI Compiler HTTP Client 和跨服务错误映射；
- 本地开发、调试、E2E、发布和故障定位更简单；
- Compiler Core、Presentation Pipeline、Model Adapter 和公共契约仍可作为独立 Packages 复用；
- ADR-0027 允许未来替换 Reference Integration Host，而不改变 Presentation Core。

### 代价和风险

- 当前 Agent Runtime Host 进程承担更多 CPU、内存和模型调用压力；
- 模型供应商故障可能在同一进程内占用 Runtime 资源；
- Reference Integration Host 与 Presentation Pipeline 需要严格的超时、并发和异常隔离；
- 当前不支持 Compiler 独立扩容和独立发布；
- 如果未来出现跨语言或企业共享 Compiler 场景，需要重新建立远程服务宿主；
- Presentation Contract / Pipeline 中可能仍残留 Runtime-first metadata，需要后续解耦审查。

## 重新评估触发条件

出现以下任一明确需求时，应重新评估独立 UI Compiler Service 或新的 Presentation API Host：

- 非当前 Reference Integration Host 系统需要通过网络直接调用 Presentation 能力；
- 两个或以上逻辑独立 Runtime 需要共享统一 Presentation 能力；
- Python、Java、Go 或其他非 Node Runtime 需要使用同一实现；
- Compiler 模型调用需要独立资源池、限流、扩容或 SLA；
- Runtime Host 与 Presentation Core 由不同团队维护或采用不同发布周期；
- Presentation / Compiler 需要成为企业公共远程服务或对外 API；
- 模型调用故障已经无法通过进程内超时、并发隔离和降级策略控制。

满足触发条件只代表需要评估，不代表自动恢复独立服务。
任何重新拆分都必须通过新的 ADR 明确调用方、契约、状态、部署、故障和迁移策略。

## 迁移要求

历史 Runtime-first 迁移已按本 ADR完成 Presentation Pipeline Package 提取和 Runtime Host 组合。
ADR-0027 之后的后续迁移按以下顺序：

1. 保持现有 Presentation 主链路和测试通过；
2. 保持 `packages/presentation-pipeline`、Router、Model Adapter、Catalog 和 Core 的独立 Package 边界；
3. 不新增依赖 Runtime Thread / Operation / Surface 才能执行纯 Presentation 的公共契约；
4. 审查 Presentation Contract / Pipeline 中现存 Runtime-first metadata；
5. 如果出现新的独立调用方，再通过 ADR 决定 Package API、REST Host 或其他 Integration 形态。

## 验证要求

该决策通过以下证据持续验证：

- 当前 Reference Integration 不要求独立 UI Compiler Service 进程或端口；
- Reference Integration Host 通过独立 Presentation Pipeline 接口处理 AgentContent；
- `ui-compiler-core` 不依赖 Runtime Host、Business Agent、模型 SDK 或网络框架；
- Model Adapter 只被 Presentation Pipeline / Router 调用；
- Business Agent Contract 不包含 UI Plan Candidate 或 A2UI；
- Router 语义与 ADR-0015 一致；
- UI Compiler Core 仍是唯一可信 A2UI 生产者；
- 展示失败可以返回安全 Markdown 降级结果；
- Packages 不依赖 Apps，且不存在 `apps/agent-runtime-host -> apps/ui-compiler-service` 依赖；
- Core 可以在不把 Runtime Host 当作产品语义的前提下独立测试；
- `pnpm check:boundaries`、`pnpm typecheck`、`pnpm test`、`pnpm build` 和 `pnpm docs:check` 通过。