# Issue #175：编码 Agent 审批与恢复模式对比

## 研究问题

本文比较 Gemini CLI、Codex 和 Claude Code 如何处理受保护工具调用的审批、暂停后的继续执行以及会话恢复。
研究目的是为 Issue #175 的 Conversation Turn、Operation、Run 和 Business Surface 生命周期提供参考，不直接规定最终平台契约。

## 共同模式

三个产品都把普通自然语言消息与受保护工具调用的审批决定分开。
审批绑定到一个具体工具调用、命令、文件变更或权限请求，而不是把聊天中的“同意”当作通用授权凭证。
常规交互式审批发生时，当前 Agent 执行仍然挂起，宿主在收到结构化决定后继续或拒绝原工作项。
允许一次、允许更大作用域和拒绝通常是不同的结构化决定。
权限边界由宿主、策略引擎或沙箱执行，而不是由模型自行解释和执行。

## Gemini CLI

Gemini CLI 在模型请求工具调用时先应用安全策略。
修改文件或执行 Shell 命令等工具默认需要用户确认，并展示具体命令或变更内容。
Shell 确认提供 Allow once、Allow always 和 Deny 等结构化选项。
Gemini CLI 的 Policy Engine 可以对具体工具和命令前缀执行 allow、deny 或 ask_user 决策。
Plan Mode 的正式退出通过 `exit_plan_mode` 工具展示计划并请求正式批准，聊天中的非正式共识不是最终执行授权。
这些行为说明普通自然语言可以促使 Agent 提出审批请求，但不能替代具体工具调用的确认结果。

官方来源：

- [Gemini CLI Tools Reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/tools.md)
- [Gemini CLI Shell Commands](https://geminicli.com/docs/cli/tutorials/shell-commands/)
- [Gemini CLI Policy Engine](https://geminicli.com/docs/reference/policy-engine/)
- [Gemini CLI Planning Tools](https://geminicli.com/docs/tools/planning/)

## Codex

Codex 通过沙箱与 approval policy 决定命令、文件变更、权限请求以及带副作用的 App 或 MCP 工具是否需要批准。
Codex App Server 以服务端 JSON-RPC 请求向客户端发布结构化审批。
命令审批请求包含 `itemId`、`threadId` 和 `turnId`，客户端返回 accept、acceptForSession、decline 或 cancel 等决定。
服务端收到决定后继续或拒绝原工作，并以 `item/completed` 发布该工作项的最终状态。
审批是当前 Turn 中具体 Item 的生命周期事件，不是新的普通用户消息。
Codex 还可以通过审批策略或自动审批审查器改变审批者，但这不会扩大原有权限边界。

官方来源：

- [Codex Agent Approvals and Security](https://learn.chatgpt.com/docs/agent-approvals-security)
- [Codex App Server](https://developers.openai.com/codex/app-server/)

## Claude Code

Claude Code 对 Bash、文件修改和其他工具使用细粒度 permission rules 与 permission modes。
Claude Code 官方文档明确说明权限规则由 Claude Code 宿主执行，而不是由模型执行。
Prompt 或 `CLAUDE.md` 可以影响模型尝试做什么，但不能改变宿主实际允许什么。
常规权限提示允许对具体工具调用进行一次性或更大作用域批准，并在当前挂起执行中继续。
Claude Code 也支持恢复已有 session，但 session 恢复身份与单次受保护工具调用的审批身份是不同概念。

官方来源：

- [Claude Code Permissions](https://code.claude.com/docs/en/permissions)
- [Claude Code CLI Reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage)
- [Claude Code Settings](https://code.claude.com/docs/en/settings)

## 与 AG-UI Interrupt 的差异

编码 Agent 的常规工具审批通常保持当前执行挂起，并在审批后继续同一次执行。
AG-UI 的持久 Interrupt 可以让原 Run 以 interrupt 结果终结，再由后续 `RunAgentInput.resume` 启动新的 Run 来恢复同一 thread 中的工作流。
因此“恢复同一业务工作流”不必等于“复用同一个平台 runId”。

官方来源：

- [AG-UI Interrupts](https://docs.ag-ui.com/concepts/interrupts)
- [AG-UI Events](https://docs.ag-ui.com/concepts/events)

## 补充案例：Google Search AI Mode Generative UI

### 结论

Google Search AI Mode 与本平台在产品目标和用户体验上属于同一类 Generative UI。
两者都不满足于把模型结果固定显示成 Markdown，而是根据当前问题选择更合适的视觉布局、数据图表或交互工具。
不过，两者公开可见的信任模型和实现路径并不相同。
Google 公开研究实现让模型生成完整网页代码并在浏览器渲染，本平台则禁止执行模型生成代码，只允许不可信 UI Plan Candidate 经过 Schema、Policy、Component Catalog 和 UI Compiler Core 后形成受控 A2UI。
因此更准确的判断是“展示意图高度相似，安全架构明显不同”，而不是“Google 已经验证了本平台的具体 Compiler 架构”。

### 产品演进与当前边界

Google 在 2025 年 5 月首先宣布 AI Mode 可以针对体育和金融查询生成定制交互图表。
Google 在 2025 年 11 月正式把 Gemini 3 驱动的动态视觉布局、交互工具和模拟称为 Generative UI，并说明模型会在判断交互工具有助于理解问题时实时编码该工具。
首批 Generative UI 能力面向美国 Google AI Pro 和 Ultra 用户，并要求在 AI Mode 中选择 Thinking 模型。
Google 随后在 2025 年 12 月把美国的 Gemini 3 Pro 访问扩展到非订阅用户，并为订阅用户保留更高使用限额，同时把订阅用户访问扩展到近 120 个国家和地区。
Google 在 2026 年 3 月把 Canvas 开放给美国英语用户，允许用户在 Search 中创建可继续修改的工具或仪表盘、运行原型并查看底层代码。
Google 在 2026 年 5 月宣布将使用 Gemini 3.5 Flash 和 Antigravity 扩大 Search Generative UI，使 Search 实时组合交互视觉、表格、图形和模拟，并进一步支持可持续返回的仪表盘、跟踪器和其他 mini app。
截至 2026 年 6 月 8 日，Google 的最新明确表述仍是这些能力“当前”面向 AI Mode Pro 和 Ultra 用户，并计划在 2026 年夏季免费开放给所有 Search 用户。
截至本文核查日期 2026 年 8 月 5 日，未找到 Google 官方页面确认该全量开放已经在所有地区、账户和查询上完成。

用户只在部分搜索中看到这类界面与官方说明一致。
AI Mode 会分析查询并选择布局，只有在模型判断交互工具有帮助时才生成工具，而且功能还受到模型选择、账户资格、地区和渐进发布的共同约束。
不能仅根据单次界面观察判断某个结果使用了哪一内部模型或完整生产架构。

还需要区分三类外观相似的结果。
视觉地点卡片、商品卡片和购物网格可以随查询和数据动态更新，但仍可能来自预定义产品组件，不能仅凭外观认定为实时生成的 UI。
2025 年 6 月上线的查询定制金融交互图表已经超出静态答案，但仍是面向特定数据类型的专用呈现能力，当时 Google 尚未使用 Generative UI 这一名称。
2025 年 11 月公布的查询专属模拟器和计算器才明确属于模型实时设计布局并编码交互工具的 Generative UI。

官方来源：

- [Google I/O 2025：AI Mode 的定制图表与交互图形](https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/)
- [Google 2025 年 6 月：查询定制的金融交互图表](https://blog.google/products-and-platforms/products/search/ai-mode-data-visualization/)
- [Google 2025 年 9 月：视觉探索与购物结果](https://blog.google/products-and-platforms/products/search/search-ai-updates-september-2025/)
- [Google Search with Gemini 3：AI Mode Generative UI](https://blog.google/products-and-platforms/products/search/gemini-3-search-ai-mode/)
- [Google 2025 年 12 月：美国 Gemini 3 Pro 与动态布局访问扩展](https://blog.google/products-and-platforms/products/search/google-ai-mode-update-gemini-3-flash/)
- [Gemini 3 in AI Mode：近 120 个国家和地区的订阅用户访问](https://blog.google/products-and-platforms/products/search/gemini-3-ai-mode-more-countries/)
- [Canvas in AI Mode](https://blog.google/products-and-platforms/products/search/ai-mode-canvas-writing-coding/)
- [Google I/O 2026：Search 的 Agentic Coding 与 Generative UI](https://blog.google/products-and-platforms/products/search/search-io-2026/)
- [Google 2026 年 6 月发布状态说明](https://blog.google/products-and-platforms/products/search/soccer-tournament-google-tools-2026/)

### Google 公开研究实现

Google Research 把 Generative UI 定义为模型不仅生成内容，还生成完整用户体验，包括网页、游戏、工具和应用。
其论文公开的研究实现为每次请求生成一个完整网页及相关资产，并把该页面原样交给用户浏览器渲染。
论文明确描述模型输出 HTML、CSS 和 JavaScript，而不是从固定组件库中选择模板。
该实现包含三个主要补充机制：提供 Web Search 和图像生成等工具的服务端、包含规划与技术规范的详细系统指令，以及修正常见问题的后处理器。
论文列举的后处理器会注入客户端错误检测、修复 JavaScript 与 CSS 错误、转义 HTML 属性、处理 API 问题和幻觉资产。
这些后处理器表明模型输出并非无条件信任，但公开论文没有描述与本平台等价的受控 UI IR、Component Catalog 白名单或唯一可信 A2UI Compiler。
论文还明确把自己的方法与从固定库调用预定义交互组件的 Templated UI 区分开来，目标是生成不受固定模板约束的定制界面。

这里必须区分研究实现和 Google Search 的完整生产实现。
Google 表示该研究在 AI Mode 中落地，但没有公开 AI Mode 的全部沙箱、内容安全策略、浏览器隔离、权限校验或生产后处理细节。
因此可以确认“产品使用实时编码式 Generative UI”，但不能据公开资料断言 Search 生产环境只是无隔离地执行模型输出。

官方来源：

- [Google Research：Generative UI 研究与产品落地](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/)
- [论文：Generative UI: LLMs are Effective UI Generators](https://generativeui.github.io/static/pdfs/paper.pdf)

### 与本平台的架构对比

| 维度 | Google AI Mode 公开信息 | Generative UI Platform | 判断 |
| --- | --- | --- | --- |
| 展示目标 | 针对查询动态生成布局、图表、工具和模拟 | 针对结构化 AgentContent 路由并编译合适的受控 UI | 高度相似 |
| 展示决策 | 模型分析问题，并在交互工具有帮助时实时创建工具 | Presentation Router 选择 Markdown 或 Generative UI，只有 Generative UI 分支调用 Presentation Model | 原则相似 |
| 输入与业务推理 | Search 查询、Query Fan-out、Web、Knowledge Graph 和产品数据共同参与 | Business Agent 负责业务推理和权威业务数据，Presentation Model 不负责业务推理 | 职责划分不同 |
| 中间产物 | 公开研究实现直接生成完整 HTML、CSS、JavaScript 和资产 | 模型只能生成不可信 UI Plan Candidate | 关键差异 |
| 信任边界 | 公开研究实现通过指令、工具和后处理器改善输出，生产安全细节未完全公开 | UI Compiler Core 校验 Schema、Policy 和 Component Catalog，并且是唯一可信 A2UI 生产者 | 本平台约束更明确 |
| 组件策略 | 研究论文明确追求超越固定组件库，2026 产品说明虽提到组合组件，但未公开固定白名单 | 只允许 Component Catalog 中的组件与能力 | 方向不同 |
| 生成代码 | 公开研究实现生成并运行页面 JavaScript | 明确禁止执行模型生成代码 | 相反 |
| 用户交互 | 支持浏览器内计算器、模拟、图表、Canvas 原型和持续 mini app | Frontend Runtime 只执行注册 Action，并把业务 Action 交给 Runtime Host 校验与恢复 | 表面相似，业务语义不同 |

### 对 Issue #175 的设计启示

Google AI Mode 证明了“同一对话入口按意图返回不同交互界面”是用户可理解且有价值的产品形态。
它也支持本平台把 Markdown 与 Generative UI 作为 Presentation Pipeline 的两条最终展示路径，而不是要求 Business Agent 自己选择前端组件。
Canvas、仪表盘和可持续 mini app 还说明生成式 Surface 可能从一次性回答发展为可再次进入的长期工作对象。

但是，Google AI Mode 不能直接回答 Issue #175 的审批与恢复语义。
Google 的公开资料没有说明 Generative UI 中的普通点击是否绑定 `threadId`、`runId`、`surfaceId`、`actionId` 和 Payload 摘要，也没有说明它是否以原子方式消费审批 Surface。
Google 展示的计算器和模拟可以只是浏览器内局部交互，而预约或购买等有副作用能力又可能通过独立的 Agentic Search 与合作方流程完成。
因此不能因为界面是动态生成的，就把任意交互控件等同于受保护业务 Action，更不能把自然语言后续消息当成审批凭证。

Google 对有副作用的 Agentic Checkout 仍保留了明确确认边界。
其官方说明表示系统总是先请求许可，并且只有在用户确认购买和收货信息后才会执行购买。
Google 的 Universal Commerce Protocol 还用标准化能力和强类型请求响应连接消费者界面与商家后端，并继续让商家拥有业务逻辑和 Merchant of Record 身份。
这支持“动态生成的展示不应直接拥有权威业务副作用”的原则，但公开资料仍没有给出可映射到 Issue #175 的 Run、Interrupt、Resume 或幂等语义。

官方来源：

- [Google Agentic Checkout：许可与购买确认](https://blog.google/products-and-platforms/products/shopping/agentic-checkout-holiday-ai-shopping/)
- [Google Developers：Universal Commerce Protocol](https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/)

本平台当前不应因为 Google 的案例而放松“Business Agent 不生成 UI”“模型输出不可信”“不执行模型生成代码”和“Runtime Host 校验 Action”的边界。
Google 案例更适合作为产品方向的外部验证，而本平台的差异化价值仍是把相似的动态展示体验建立在协议中立、组件受控、可诊断和可恢复的编译链路上。

## 对 Issue #175 的设计启示

平台应区分 Inline Approval Resolution 与 Durable Action Resume。
Inline Approval Resolution 发生在原 Run 尚未终局时，结构化决定可以继续同一个 Run。
Durable Action Resume 发生在原 Run 已经发布终局 PresentationResult 后，应创建新的 Run，并通过 `sourceRunId`、来源 Presentation、Surface 和 Action 身份恢复同一业务工作流。
普通自然语言消息始终是新的 Conversation Turn，不应直接充当受保护 Action 的批准凭证。
自然语言可以让 Business Agent解释意图、提出澄清或生成新的审批 Surface，但 Runtime Host 只能接受绑定到具体 Active Surface 和 Action 的结构化批准。
审批决定至少需要绑定 `threadId`、`turnId`、`operationId`、`runId`、`surfaceId`、`actionId` 和精确 Payload 或其稳定摘要。
Runtime Host 必须原子消费来源 Surface，并使用业务幂等键保护有副作用的命令。
框架提供的 session、run、item 或 tool-call ID 只解决关联问题，不能单独提供 exactly-once 业务语义。

## 推荐结论

Issue #175 当前讨论的 PresentationResult 后置 Business Surface Action 属于 Durable Action Resume，而不是编码 Agent 常见的同一 Run 内联工具审批。
因此它应创建新 Operation 和新 Run，同时继续相同 `threadId` 与 Business Agent checkpoint。
若平台未来引入真正保持 Run 挂起的实时 Interrupt，应单独定义 Inline Approval Resolution，不应与当前 Surface Action Resume 共用含糊的 Resume 语义。
