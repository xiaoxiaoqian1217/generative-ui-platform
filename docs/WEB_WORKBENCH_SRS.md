# Generative UI Workbench 软件需求规格说明书

**文档版本：** 0.1  
**项目阶段：** MVP 规划  
**所属项目：** Generative UI Platform  
**产品名称：** Generative UI Workbench  
**中文名称：** 生成式 UI 开发与验收工作台  
**首个参考领域：** 智慧安防  
**首个参考场景：** 空地多智能体协同巡防指挥  
**目标读者：** 产品负责人、架构师、开发人员、测试人员和编码 Agent

---

## 1. 文档约定

本文使用以下约束词：

- **必须（MUST）**：不可省略的强制要求。
- **应该（SHOULD）**：原则上应实现，除非存在明确且记录在案的原因。
- **可以（MAY）**：可选能力，不属于当前阶段强制范围。
- **禁止（MUST NOT）**：不得实现或不得形成该依赖关系。

需求编号使用以下前缀：

| 前缀 | 含义 |
|---|---|
| BR | 业务需求 |
| UR | 用户需求 |
| FR | 功能需求 |
| IR | 外部接口需求 |
| DR | 数据与契约需求 |
| NFR | 非功能需求 |
| AC | 架构和实现约束 |
| AR | 验收需求 |

出现需求冲突时，优先级依次为：

1. 系统边界与职责划分；
2. 安全和控制边界；
3. 架构约束；
4. 功能需求；
5. 页面和交互建议。

---

## 2. 编写目的

本文用于明确 Generative UI Workbench 的建设原因、产品定位、系统边界、目标用户、功能需求、接口需求、数据要求、质量属性、实现约束和验收标准。

本文是以下工作的共同依据：

- 产品范围确认；
- 系统架构设计；
- 开发任务拆分；
- Runtime Host 接口设计；
- Frontend Runtime 和组件实现；
- 智慧安防参考场景建设；
- 测试用例设计；
- 阶段验收和版本回归。

本文定义系统必须具备什么能力，不替代详细架构设计、接口详细设计和组件视觉设计。

---

## 3. 项目背景

Generative UI Platform 已逐步形成以下基础能力：

- UI Compiler Service；
- Presentation Router；
- UI Compiler Core；
- Presentation Request 和 Presentation Result 契约；
- Component Catalog Schema；
- UI Plan Candidate；
- UI IR；
- A2UI 编译；
- Markdown 安全清理；
- Agent Runtime Host；
- 最小 Web Demo。

当前最小 Web Demo 主要用于验证浏览器与 Agent Runtime Host 之间的 HTTP 和 WebSocket 通信，尚不能证明以下平台级闭环已经形成：

- Runtime Host 是否能够稳定适配 Business Agent；
- Agent 业务结果是否能够进入展示决策和 UI 编译流程；
- Markdown 与生成式 UI 是否能够正确分流；
- A2UI 是否能够映射为真实前端组件；
- 用户操作是否能够通过 Runtime Host 回传；
- 高风险业务操作是否能够经过用户确认；
- 错误是否能够定位到具体阶段；
- 平台升级后是否能够重复执行标准案例。

如果继续只维护一次性的 Web Demo，将产生以下问题：

- 每次联调都需要临时增加页面和测试代码；
- Agent、Runtime、Compiler 和 Renderer 的问题难以区分；
- 业务组件缺少统一验证入口；
- 生成式 UI 的业务价值缺少真实场景证明；
- 平台修改缺少稳定回归基线；
- 演示代码容易与正式开发能力混合。

因此，需要建设一个可独立部署、可持续维护、面向开发联调和质量验收的 Web 工作台。

---

## 4. 产品定位

### 4.1 核心定位

Generative UI Workbench 定位为：

> 面向 Agent 应用的生成式 UI 开发、联调、诊断和验收工作台。

Workbench 是 Generative UI Platform 的官方 Frontend Runtime 参考实现和端到端验证环境，用于验证从 Runtime Host 接收运行结果，到 Markdown 或生成式 UI 渲染，再到用户操作回传的完整前端闭环。

Workbench 主要承担以下角色：

- **参考实现**：展示 Frontend Runtime、Component Registry 和 Action Registry 的推荐实现方式；
- **联调环境**：为 Runtime Host、UI Compiler 和业务场景组件提供统一联调入口；
- **诊断工具**：查看由 Runtime Host 暴露的运行阶段、编译结果、错误和降级信息；
- **验收平台**：执行标准场景和边界案例，判断平台能力是否达到要求；
- **回归环境**：在协议、Catalog、Compiler、Renderer 或 Runtime 变化后重复验证。

### 4.2 一句话价值

> 让生成式 UI 从“各模块能够独立运行”，转变为“完整链路可连接、可观察、可交互、可验收、可回归”。

### 4.3 参考业务定位

Workbench 采用以下产品方案：

> 通用工作台核心 + 智慧安防领域场景包 + 空地多智能体协同巡防指挥参考实现。

智慧安防场景用于证明生成式 UI 能够支持真实业务中的设备状态展示、方案比较、地图协同、任务确认和异常处理，但不得成为 Workbench 的唯一业务边界。

### 4.4 产品性质

Workbench 是可发布和可部署的工程产品，但其主要用户是研发、测试和架构人员，而不是最终巡防指挥业务用户。

Workbench 不以营销展示、官网介绍或完整生产业务运营为首要目标。

---

## 5. 核心决策与选择理由

### 5.1 决策一：不建设纯通用 Playground

纯通用 Playground 只能证明卡片、表格和表单可以生成，无法证明平台能够支持真实任务、地图操作、人工审批和 Action 回传。

因此，MVP 必须包含至少一个真实或准真实业务闭环。

### 5.2 决策二：不将 Workbench 建设为智慧安防生产系统

如果直接将无人机、无人车、巡防路线和告警规则写入通用核心，会导致：

- Frontend Runtime 与具体业务模型耦合；
- Component Catalog 退化为安防专用组件集合；
- Compiler 或协议出现领域特判；
- 后续增加其他领域时需要修改核心；
- Workbench 无法继续作为平台级参考实现。

因此，智慧安防能力必须通过独立场景包、领域组件和测试案例扩展。

### 5.3 决策三：Workbench 不直接接入 Business Agent

Business Agent 的技术接入属于 Agent Runtime Host 和 Business Agent Adapter 的职责。

Workbench 只能通过 Runtime Host 暴露的统一接口进行通信，并验证 Runtime Host 对 Business Agent 的适配结果。

该决策避免：

- Web 前端依赖不同 Agent 的私有协议；
- Agent Adapter 散落在浏览器端；
- 前端承担 Agent Run 编排；
- Business Agent 被迫实现 AG-UI、CopilotKit 或浏览器协议；
- 同一 Agent 在不同前端中重复适配。

### 5.4 决策四：运行链路只通过 Runtime Host

Workbench 的运行请求、状态事件、Presentation Result、Action 回传和诊断数据必须通过 Agent Runtime Host 交换。

Workbench 不应在正式运行链路中绕过 Runtime Host，直接调用 Business Agent 或 UI Compiler Service。

如需独立验证 Compiler，应该由测试工具或 Runtime Host 的诊断接口提供，不应改变正式运行边界。

### 5.5 决策五：场景包不包含 Business Agent Adapter

Workbench 场景包可以包含：

- 场景说明；
- 示例问题；
- 前端组件注册；
- 前端 Action 注册；
- 示例和测试数据；
- 内置验收案例；
- 预期结果规则。

Business Agent Adapter 的实现和注册必须位于 Agent Runtime Host 一侧。

---

## 6. 系统上下文与职责边界

### 6.1 总体关系

```text
Generative UI Workbench
          │
          │ HTTP / WebSocket / AG-UI compatible events
          ▼
Agent Runtime Host
          │
          ├── Business Agent Adapter ──> Business Agent
          │
          └── Presentation Request ────> UI Compiler Service
                                            │
                                            └── Presentation Result
          │
          └── Runtime events / Presentation Result / diagnostics
          ▼
Generative UI Workbench
          │
          ├── Markdown Renderer
          ├── A2UI Renderer + Component Registry
          └── Action Registry ──────────> Agent Runtime Host
```

### 6.2 Workbench 职责

Workbench 必须负责：

- 连接 Agent Runtime Host；
- 发送用户输入；
- 展示运行状态；
- 展示 Runtime Host 返回的 Markdown 或生成式 UI；
- 维护前端 Component Registry；
- 执行已注册的前端 Action；
- 展示人工确认界面；
- 将用户选择和 Action 结果回传 Runtime Host；
- 展示 Runtime Host 提供的诊断信息；
- 管理内置案例和执行结果；
- 加载前端场景包；
- 为平台能力提供参考实现。

Workbench 禁止负责：

- 直接调用 Business Agent；
- 实现 Business Agent Adapter；
- 适配 Business Agent 私有协议；
- 选择应由哪个 Business Agent 处理请求；
- 编排 Agent Run 生命周期；
- 维护 Agent 权威会话和任务状态；
- 执行业务后端工具；
- 直接控制真实设备；
- 代替 UI Compiler 规划或编译 UI；
- 执行模型生成的任意代码。

### 6.3 Agent Runtime Host 职责

Agent Runtime Host 负责：

- 向 Workbench 提供统一通信入口；
- 管理会话和 Agent Run 生命周期；
- 通过 Business Agent Adapter 调用业务 Agent；
- 适配业务 Agent 原有协议；
- 聚合 Agent 输出和运行事件；
- 调用 UI Compiler Service；
- 将 Presentation Result 映射为前端事件；
- 接收 Workbench 的用户选择和 Action 结果；
- 调用后端业务工具或继续 Agent Run；
- 暴露经过控制的诊断信息。

### 6.4 UI Compiler Service 职责

UI Compiler Service 负责：

- 接收 Presentation Request；
- 执行展示模式决策；
- 对 Markdown 进行安全处理；
- 对 UI Plan Candidate 进行受控编译；
- 生成 UI IR 和 A2UI；
- 在失败时生成安全降级结果；
- 返回协议无关的 Presentation Result。

### 6.5 Business Agent 职责

Business Agent 负责：

- 业务理解和推理；
- 查询业务数据；
- 调用业务工具；
- 维护权威业务状态；
- 生成 Markdown 或 JSON 结构化业务结果。

Business Agent 不需要输出 Workbench 专用页面结构，也不需要直接连接 Workbench。

---

## 7. 建设目标

系统必须实现以下目标：

1. 提供可独立部署的 Web 工作台。
2. 通过 Runtime Host 运行 Mock、测试或真实业务 Agent 场景。
3. 渲染安全 Markdown 和受控 A2UI。
4. 展示运行阶段和 UI 编译诊断数据。
5. 支持已注册前端 Action 的执行和结果回传。
6. 支持高风险操作的人工确认。
7. 提供标准案例和重复执行能力。
8. 以智慧安防巡防指挥验证完整业务闭环。
9. 保持通用工作台与具体业务领域解耦。
10. 为后续其他业务场景提供可复制的接入样板。

---

## 8. 非目标

MVP 不建设以下能力：

- 完整 Interaction Gateway；
- 多 Business Agent 自动路由和协作；
- Business Agent Adapter 的前端实现；
- 完整智慧安防生产系统；
- 真实大规模设备控制；
- 完整 GIS 指挥平台；
- 完整任务调度中心；
- 完整告警处置中心；
- 多租户和商业化计费；
- 开放用户注册；
- 通用低代码页面设计器；
- 拖拽式 UI 编排；
- 任意 HTML、CSS、JavaScript、Vue 或 React 代码生成；
- 完整模型管理平台；
- 完整 Prompt 管理平台；
- 生产级测试管理系统；
- 大规模并发压测平台。

---

## 9. 目标用户

### 9.1 平台开发者

平台开发者需要：

- 验证 Runtime、Compiler 和 Renderer 的完整链路；
- 查看请求阶段、耗时、错误和降级原因；
- 调试协议和数据契约；
- 验证 Component Catalog 和 Action Registry；
- 在平台升级后执行回归案例。

### 9.2 Runtime Host 和 Agent Adapter 开发者

该角色需要：

- 验证 Runtime Host 是否正确适配 Business Agent；
- 查看 Runtime Host 暴露的 Agent 配置；
- 验证业务结果是否正确进入 UI Compiler；
- 验证 Action 结果能否返回 Agent Run；
- 定位 Agent、Runtime 或 Compiler 的责任边界。

### 9.3 前端组件开发者

前端组件开发者需要：

- 注册真实 Vue 组件；
- 验证 Props 和 Action Schema；
- 测试组件的加载、渲染和错误边界；
- 验证基础组件与领域组件的兼容性；
- 查看场景组件的示例数据和运行结果。

### 9.4 测试人员

测试人员需要：

- 执行内置正常、异常和降级案例；
- 比较预期结果和实际结果；
- 验证非法组件、非法 Props 和非法 Action 被阻止；
- 验证用户取消、超时和后端工具失败；
- 对版本修改执行重复验证。

### 9.5 架构师和项目负责人

该角色需要：

- 判断平台级闭环是否形成；
- 查看核心职责是否越界；
- 验证业务场景与通用核心是否解耦；
- 根据验收结果判断阶段目标是否完成。

---

## 10. 业务需求

### BR-001 完整前端运行闭环

系统必须验证从 Runtime Host 接收运行结果，到 Markdown 或 A2UI 渲染，再到用户操作回传 Runtime Host 的完整闭环。

### BR-002 统一联调入口

系统必须为 Runtime Host、UI Compiler、Frontend Runtime 和业务组件提供统一联调入口，避免重复建设临时页面。

### BR-003 问题责任定位

系统必须帮助用户判断问题发生在 Agent、Runtime Host、Presentation Router、UI Compiler、Renderer、Component Registry 或 Action 执行阶段。

### BR-004 标准验收基线

系统必须将代表性业务流程和边界条件转化为可重复执行的验收案例。

### BR-005 版本回归验证

当协议、Catalog、Compiler、Renderer、Runtime Host 或场景组件变化时，系统应该支持重复执行已有案例。

### BR-006 业务价值验证

系统必须通过真实或准真实巡防场景，证明生成式 UI 能够支持复杂状态展示、方案比较、地图联动、人工审批和操作回传。

### BR-007 平台领域解耦

通用工作台核心必须独立于智慧安防领域，领域能力必须通过场景包和注册机制扩展。

### BR-008 可发布开发环境

系统必须能够部署为长期可访问的开发和测试环境，而不是只能在开发者本机运行的一次性 Demo。

---

## 11. 用户需求

### UR-001

平台开发者必须能够从一次运行中查看最终结果和主要处理阶段。

### UR-002

Runtime Host 开发者必须能够选择或查看 Runtime Host 暴露的运行配置，但 Workbench 不实现对应 Agent Adapter。

### UR-003

组件开发者必须能够确认 A2UI 中的组件类型是否成功映射为真实前端组件。

### UR-004

测试人员必须能够执行内置案例并判断是否通过。

### UR-005

用户必须能够在任务创建或设备控制前查看操作内容并确认或取消。

### UR-006

用户必须能够在 UI 生成失败时继续查看有效业务内容。

### UR-007

开发者必须能够在不同 Runtime Host 环境之间切换，而无需重新构建前端代码。

---

## 12. 总体运行流程

### 12.1 正常运行流程

1. 用户在 Workbench 选择环境和场景。
2. Workbench 从 Runtime Host 获取可用运行配置。
3. 用户输入自然语言请求。
4. Workbench 将请求发送给 Runtime Host。
5. Runtime Host 通过已注册 Adapter 调用 Business Agent。
6. Runtime Host 将 Agent 结果发送给 UI Compiler Service。
7. Runtime Host 将运行事件和 Presentation Result 返回 Workbench。
8. Workbench 根据结果类型渲染 Markdown 或 A2UI。
9. 用户触发组件 Action 或确认操作。
10. Workbench 校验前端 Action 并发送结果给 Runtime Host。
11. Runtime Host 调用后端工具或继续 Agent Run。
12. Workbench 展示后续状态和最终结果。

### 12.2 降级流程

1. Runtime Host、Router、Compiler 或 Renderer 发生错误。
2. 系统记录错误阶段和错误标识。
3. 有效 Agent 内容不得丢失。
4. Runtime Host 优先返回安全 Markdown 降级结果。
5. Workbench明确显示已发生降级。
6. 用户可以查看诊断信息并重新执行。

### 12.3 用户确认流程

1. Runtime Host 返回需要用户批准的操作请求。
2. Workbench 展示操作目标、关键参数、影响范围和风险。
3. 用户选择确认、取消或返回修改。
4. Workbench 将用户决策返回 Runtime Host。
5. Runtime Host 根据决策调用后端工具或终止操作。
6. Workbench 不直接执行后端业务工具。

---

## 13. 功能范围与页面模块

建议 Workbench 包含以下逻辑模块：

```text
/workbench
├── /playground
├── /inspect
├── /cases
├── /catalog
├── /scenarios
└── /settings
```

页面路径是建议，不构成强制路由实现要求。

### 13.1 Playground

用于输入请求、观察运行状态并操作最终 UI。

### 13.2 Inspect

用于查看 Runtime Host 暴露的运行轨迹、Presentation Result、编译诊断、Action 和错误信息。

### 13.3 Cases

用于查看、执行和比较内置验收案例。

### 13.4 Catalog

用于查看当前场景对应的 Component Catalog 和前端 Component Registry 映射状态。

### 13.5 Scenarios

用于查看和切换可用前端场景包。

### 13.6 Settings

用于配置 Runtime Host 地址、通信模式、请求超时和调试显示选项。

---

## 14. 功能需求

### FR-001 Runtime Host 连接

Workbench 必须连接 Agent Runtime Host，不得直接连接 Business Agent。

Workbench 应支持通过部署配置设置 Runtime Host 地址。

### FR-002 通信模式

MVP 必须支持以下至少一种正式通信模式，并保留另一种兼容能力：

- HTTP；
- WebSocket。

如 Runtime Host 使用 AG-UI 兼容事件，Workbench 应通过协议适配层消费事件，不应将协议细节散落到页面组件中。

### FR-003 运行配置发现

Workbench 应能够读取 Runtime Host 暴露的运行配置元数据，例如：

- 配置标识；
- 配置名称；
- Mock、Test 或 Business 类型；
- 可用状态；
- 支持的能力；
- 所属场景。

Workbench 只负责选择或展示运行配置，不负责实现 Adapter。

### FR-004 用户消息输入

Workbench 必须支持：

- 输入用户消息；
- 发送请求；
- 防止空消息提交；
- 显示发送状态；
- 在允许时取消请求；
- 重新执行最近请求。

### FR-005 运行状态展示

Workbench 应支持展示以下状态：

- 未开始；
- 正在连接；
- Agent 运行中；
- 展示决策中；
- UI 编译中；
- 渲染中；
- 等待用户确认；
- Action 执行中；
- 已完成；
- 已取消；
- 已失败；
- 已降级。

状态名称可以根据实际协议映射，但不得混淆运行中、失败和降级。

### FR-006 Presentation Result 渲染

Workbench 必须支持以下结果类型：

- 安全 Markdown；
- Generative UI；
- Fallback Markdown；
- Error。

页面必须明确标识最终展示模式。

### FR-007 Markdown 渲染

Workbench 必须使用安全 Markdown Renderer。

必须阻止：

- 未授权脚本；
- 危险 HTML；
- 危险协议链接；
- 任意嵌入代码执行。

### FR-008 A2UI 渲染

Workbench 必须通过 A2UI Renderer 和 Component Registry 渲染生成式 UI。

Workbench 禁止：

- 执行模型生成代码；
- 加载未注册组件；
- 绕过 Props Schema；
- 绕过 Action Schema；
- 根据任意字符串动态导入组件文件。

### FR-009 Component Registry

Workbench 必须维护组件类型到真实前端组件实现的受控映射。

每个组件映射至少应包含：

- 组件类型；
- 组件实现；
- 支持版本；
- Props Schema 标识；
- 支持的 Action；
- 所属基础或领域场景。

### FR-010 Catalog 兼容状态

Workbench 应能够展示当前 Component Catalog 与 Component Registry 的映射状态，包括：

- 已实现组件；
- 缺失实现组件；
- 版本不兼容组件；
- Schema 不一致组件；
- 未使用组件。

### FR-011 前端 Action Registry

Workbench 必须通过 Action Registry 执行前端 Action。

前端 Action 示例包括：

- 地图定位；
- 路线显示；
- 区域高亮；
- 设备高亮；
- 打开详情面板；
- 选择候选方案。

### FR-012 Action 校验

Action 执行前必须校验：

- Action 名称已注册；
- 参数符合 Schema；
- 当前场景允许该 Action；
- 当前运行状态允许执行；
- 操作风险等级满足要求。

### FR-013 Action 结果回传

Workbench 必须将用户操作和前端 Action 结果返回 Runtime Host。

Workbench 不得直接调用 Business Agent 或后端业务工具。

### FR-014 用户确认

对于任务创建、任务下发、设备控制等高风险操作，Workbench 必须展示人工确认界面。

确认界面至少包含：

- 操作名称；
- 操作目标；
- 关键参数；
- 影响范围；
- 风险提示；
- 确认操作；
- 取消操作。

### FR-015 重复提交保护

Workbench 必须阻止相同确认操作被重复提交。

在 Runtime Host 返回最终状态前，确认按钮应进入不可重复触发状态。

### FR-016 运行诊断

Workbench 应展示 Runtime Host 返回的诊断数据。

诊断阶段可以包括：

- 用户输入；
- Runtime 请求；
- Agent Adapter 状态；
- Agent 原始结果摘要；
- Presentation Decision；
- UI Plan Candidate；
- Schema 校验结果；
- UI IR；
- A2UI；
- Renderer 状态；
- Action 事件；
- Runtime 回传结果。

Workbench 不要求 Runtime Host 暴露敏感推理过程、密钥或受保护业务数据。

### FR-017 诊断详情

每个可用诊断阶段应展示：

- 阶段名称；
- 阶段状态；
- 开始和结束时间；
- 执行耗时；
- 输入摘要；
- 输出摘要；
- 错误标识；
- 降级原因。

### FR-018 Schema 错误展示

Schema 错误应尽可能展示：

- 错误阶段；
- 字段路径；
- 预期类型或约束；
- 实际值摘要；
- 可理解的错误说明。

### FR-019 诊断数据操作

诊断数据应支持：

- 展开和折叠；
- 格式化查看；
- 复制；
- 下载脱敏后的 JSON；
- 按阶段筛选。

### FR-020 场景包加载

Workbench 必须支持通过注册机制加载前端场景包。

场景包可以提供：

- 场景元数据；
- 示例问题；
- Component Registry 扩展；
- 前端 Action 扩展；
- 内置案例；
- Mock 展示数据；
- 预期验收规则。

场景包不得包含 Business Agent Adapter 实现。

### FR-021 场景切换

Workbench 应允许用户切换可用场景。

场景切换后应同步更新：

- 示例问题；
- 可用运行配置；
- Component Registry；
- Action Registry；
- 内置案例；
- Catalog 映射状态。

### FR-022 内置案例

MVP 必须提供至少 10 个内置案例，覆盖：

- Markdown 直出；
- 正常生成式 UI；
- 设备状态展示；
- 多方案比较；
- 前端地图 Action；
- 用户确认；
- 用户取消；
- 非法组件；
- Props 校验失败；
- UI 编译失败并降级；
- Runtime Host 超时；
- 后端工具失败。

单个案例可以覆盖多个条件。

### FR-023 案例执行

用户必须能够运行单个内置案例，并查看：

- 案例说明；
- 输入；
- 运行配置；
- 预期结果；
- 实际结果；
- 是否通过；
- 差异信息。

### FR-024 案例重放

Workbench 应支持重新执行已运行案例。

MVP 可以使用仓库内置案例，不强制建设完整数据库和案例管理服务。

### FR-025 当前运行保存

Workbench 可以将一次运行导出为脱敏案例文件。

将自定义案例持久化到服务端不属于 MVP 强制要求。

### FR-026 环境配置

Workbench 必须支持通过构建或运行时配置设置：

- Runtime Host 地址；
- HTTP 或 WebSocket 模式；
- 请求超时时间；
- 默认场景；
- 是否显示诊断面板；
- 环境名称。

### FR-027 环境切换

如果部署环境允许，Workbench 应支持在已授权的 Runtime Host 环境之间切换。

敏感地址、令牌和密钥不得硬编码在前端仓库中。

### FR-028 请求取消和超时

Workbench 必须处理：

- 用户主动取消；
- 请求超时；
- WebSocket 断开；
- Runtime Host 不可用；
- 重复请求；
- 页面刷新后的非权威状态丢失。

### FR-029 错误边界

单个生成组件渲染失败时，Workbench 应优先：

1. 隔离失败组件；
2. 展示可理解错误；
3. 保留其他有效内容；
4. 在可能时展示 Markdown 降级内容。

### FR-030 发布形态

Workbench 必须能够构建为可部署 Web 应用，并支持：

- 静态资源部署；
- Nginx 部署；
- 容器化部署；
- 开发、测试和演示环境隔离。

此处的“演示环境”指可访问的产品能力验证环境，不要求建设营销门户。

---

## 15. 智慧安防参考场景

### 15.1 场景目标

智慧安防场景用于验证以下能力：

- 自然语言任务输入；
- 结构化设备状态展示；
- 多方案生成和比较；
- 地图前端 Action；
- 人机共享任务草稿；
- 人工审批；
- 后端工具调用结果展示；
- 异常、超时和降级处理。

### 15.2 场景一：设备状态查询

用户输入示例：

```text
查看当前可用的无人机和无人车。
```

预期展示内容：

- 可用设备总数；
- 设备类型；
- 在线状态；
- 电量；
- 当前任务状态；
- 位置摘要。

建议组件：

- `DeviceSummary`；
- `DeviceStatusList`；
- `DeviceStatusCard`。

验收重点：

- 结构化数据能够生成受控 UI；
- 缺失必要字段时能够明确报错或降级；
- 不支持的组件不能被渲染；
- Workbench 不直接查询设备接口。

### 15.3 场景二：巡防方案生成与比较

用户输入示例：

```text
使用一架无人机和两台无人车巡查 A 区域。
```

预期展示内容：

- 巡防方案概要；
- 设备编组；
- 路线摘要；
- 预计时长；
- 风险提示；
- 一个或多个候选方案。

建议组件：

- `PatrolPlanCard`；
- `PatrolPlanComparison`；
- `DeviceFormation`；
- `RouteSummary`；
- `RiskNotice`；
- `MapView`。

前端 Action 示例：

- `map.focusArea`；
- `map.showRoute`；
- `map.highlightDevice`；
- `panel.openPlanDetail`；
- `plan.select`。

验收重点：

- 多方案能够对比；
- 用户能够选择方案；
- 地图 Action 通过前端 Action Registry 执行；
- Action 结果返回 Runtime Host；
- Workbench 不负责生成业务巡防方案。

### 15.4 场景三：任务草稿确认

用户输入示例：

```text
采用方案二并创建巡防任务。
```

预期流程：

1. Business Agent 通过 Runtime Host 形成任务草稿；
2. Runtime Host 返回需要用户批准的展示结果；
3. Workbench 展示任务确认组件；
4. 用户确认、取消或返回修改；
5. Workbench 将决策返回 Runtime Host；
6. Runtime Host 调用任务创建工具；
7. Workbench 展示执行结果。

任务草稿至少包含：

- 任务名称；
- 巡防区域；
- 设备编组；
- 巡防路线；
- 执行时间；
- 风险提示。

建议组件：

- `TaskDraft`；
- `TaskConfirmation`；
- `ApprovalPanel`；
- `ExecutionResult`；
- `ErrorNotice`。

用户操作示例：

- `task.confirm`；
- `task.cancel`；
- `task.edit`；
- `plan.back`。

验收重点：

- 用户确认前 Runtime Host 不得执行任务创建工具；
- 用户取消后不得创建任务；
- 重复确认必须被阻止；
- 创建失败时应保留任务草稿；
- Workbench 不直接调用任务创建接口。

---

## 16. 外部接口需求

### IR-001 Workbench 与 Runtime Host

Workbench 的唯一正式后端运行入口是 Agent Runtime Host。

接口必须支持：

- 获取运行配置元数据；
- 发送用户消息；
- 接收运行状态；
- 接收 Presentation Result；
- 发送取消请求；
- 发送用户确认结果；
- 发送前端 Action 结果；
- 接收错误和降级信息；
- 在调试模式下接收诊断数据。

### IR-002 Runtime Host 与 Business Agent

该接口不属于 Workbench 实现范围。

Workbench 只验证 Runtime Host 对该接口的最终适配结果。

### IR-003 Runtime Host 与 UI Compiler Service

该接口不属于 Workbench 的直接调用接口。

Workbench 可以展示 Runtime Host 返回的 Presentation Decision、UI Plan Candidate、UI IR 或 A2UI 诊断信息，但不得依赖 UI Compiler Service 的私有网络接口。

### IR-004 Renderer 与 Component Registry

A2UI Renderer 必须通过受控 Component Registry 查找真实组件实现。

### IR-005 Renderer 与 Action Registry

组件 Action 必须通过 Action Registry 执行，不得从声明式数据直接解析并执行任意函数。

### IR-006 部署配置

Workbench 应支持使用环境变量、构建配置或外部运行时配置文件注入 Runtime Host 地址和非敏感环境信息。

---

## 17. 数据与契约需求

### DR-001 基础契约

Workbench 应使用或适配仓库共享契约，不得在页面中重复定义语义相同的公共类型。

涉及的数据包括：

- Runtime Message；
- Runtime Event；
- Presentation Result；
- A2UI Operations；
- Component Catalog；
- Action Request；
- Action Result；
- Validation Error；
- Runtime Error；
- Scenario Metadata；
- Test Case；
- Test Run Result。

### DR-002 运行标识

每次运行至少应具备：

- `requestId` 或 `runId`；
- `sessionId`；
- `scenarioId`；
- `runtimeProfileId`；
- 开始时间；
- 当前状态。

### DR-003 Action 数据

Action 回传至少应包含：

- 运行标识；
- Action 标识；
- Action 名称；
- Action 参数；
- 用户决策；
- 执行状态；
- 前端执行结果或错误。

### DR-004 诊断数据

诊断数据必须与正常业务结果分离，避免业务页面依赖诊断字段运行。

### DR-005 数据脱敏

导出诊断数据和测试案例时必须支持移除：

- 认证信息；
- 密钥和令牌；
- 敏感人员信息；
- 受保护设备标识；
- 不允许外泄的业务数据。

### DR-006 契约版本

Workbench 应识别关键契约版本，并在版本不兼容时提供明确错误，不得静默使用不兼容数据。

---

## 18. 非功能需求

### NFR-PERF-001 页面性能

在目标开发设备和正常网络条件下，页面首次可交互时间应该不超过 3 秒。

### NFR-PERF-002 状态反馈

用户发送请求后，Workbench 应在 500 毫秒内显示已发送或正在连接状态，不要求 Agent 在该时间内返回业务结果。

### NFR-PERF-003 大型诊断数据

大型 JSON 和运行轨迹应采用延迟展开、分页或虚拟化方式，避免阻塞主渲染。

### NFR-REL-001 有效内容保留

UI 编译或组件渲染失败不得导致有效 Agent 业务内容全部丢失。

### NFR-REL-002 断线处理

WebSocket 断开时必须显示明确状态，并允许用户重新连接或重新执行。

### NFR-REL-003 状态权威性

Workbench 中的运行状态属于展示状态，Runtime Host 或后端业务系统持有权威运行和任务状态。

### NFR-SEC-001 不可信输入

模型输出、Agent 输出中的 UI 建议和外部 A2UI 数据必须视为不可信输入。

### NFR-SEC-002 任意代码禁止

Workbench 禁止执行模型或 Agent 生成的任意 HTML 脚本、JavaScript、Vue、React 或其他可执行代码。

### NFR-SEC-003 组件和 Action 白名单

组件和 Action 必须来自当前受控 Registry，并通过 Schema 校验。

### NFR-SEC-004 高风险确认

任务创建、设备控制和其他高风险操作必须经过明确人工确认。

### NFR-SEC-005 凭据保护

密钥、令牌和服务端凭据不得写入浏览器构建产物或仓库代码。

### NFR-MAINT-001 模块边界

Workbench 应至少区分以下职责：

- 应用外壳；
- Runtime Client；
- Renderer；
- Component Registry；
- Action Registry；
- Diagnostics；
- Cases；
- Scenario Loader；
- Settings。

### NFR-MAINT-002 领域隔离

通用模块不得直接判断无人机、无人车、巡防区域或告警等级等领域类型。

### NFR-EXT-001 新场景扩展

新增场景应主要通过场景包、组件注册、Action 注册和案例实现，不应修改 UI Compiler Core。

### NFR-TEST-001 自动化测试

Workbench 必须具备：

- 核心工具单元测试；
- Renderer 和 Registry 测试；
- Action 校验测试；
- Runtime Client 集成测试；
- 至少一个完整端到端测试。

### NFR-OBS-001 可观察性

Workbench 应关联显示运行标识、阶段耗时、最终状态、错误阶段和降级原因。

### NFR-DEPLOY-001 可部署性

Workbench 必须能够独立构建和部署，并支持开发、测试和稳定演示环境。

### NFR-COMP-001 浏览器兼容

MVP 优先支持：

- Chrome 最新稳定版本；
- Edge 最新稳定版本；
- Windows 11 开发和测试环境。

### NFR-USE-001 可理解性

开发者无需阅读完整服务端日志，即可判断：

- 请求是否成功；
- 当前处于哪个阶段；
- 最终采用何种展示模式；
- 是否发生降级；
- 失败可能属于哪个模块。

---

## 19. 架构和实现约束

### AC-001

Workbench 必须只通过 Agent Runtime Host 参与正式运行链路。

### AC-002

Workbench 禁止直接调用 Business Agent。

### AC-003

Business Agent Adapter 的实现和注册必须位于 Agent Runtime Host 一侧。

### AC-004

Workbench 不负责 Agent Run 编排、业务工具调用和权威任务状态维护。

### AC-005

Workbench 禁止直接调用 UI Compiler Service 的私有接口完成正式业务运行。

### AC-006

业务组件必须通过 Component Registry 注册。

### AC-007

前端 Action 必须通过 Action Registry 注册和校验。

### AC-008

地图定位、路线显示、区域高亮和打开面板属于前端 Action。

### AC-009

查询设备、创建任务和控制设备属于后端工具，由 Runtime Host 和 Business Agent 侧处理。

### AC-010

任务创建和设备控制必须经过用户确认。

### AC-011

智慧安防场景包不得改变 Presentation Result、UI IR 或 A2UI 的基础语义。

### AC-012

移除智慧安防场景后，Workbench 的通用运行、渲染和诊断能力仍必须可以工作。

### AC-013

Workbench 的诊断模块不得成为正式业务渲染的强制依赖。

### AC-014

有效业务内容不得因生成式 UI 失败而丢失。

### AC-015

初始化 Workbench 工程时应优先复用仓库现有工具链和共享契约，不得无必要引入第二套工程体系。

---

## 20. 验收需求

### 20.1 平台级验收

MVP 完成时必须满足：

1. Workbench 可以独立构建和部署。
2. Workbench 只连接 Runtime Host，不直接连接 Business Agent。
3. Workbench 可以获取 Runtime Host 暴露的运行配置。
4. Workbench 可以发送用户消息并显示运行状态。
5. Workbench 可以正确展示安全 Markdown。
6. Workbench 可以使用真实前端组件渲染至少一种 A2UI 结果。
7. Workbench 可以展示最终展示模式。
8. Workbench 可以展示 Runtime Host 提供的主要诊断阶段。
9. Workbench 可以显示 Schema 错误字段路径。
10. Workbench 可以识别缺失组件和版本不兼容组件。
11. Workbench 可以执行已注册前端 Action。
12. Workbench 可以将用户操作和 Action 结果返回 Runtime Host。
13. 非法组件和非法 Action 可以被阻止。
14. 高风险操作必须展示确认界面。
15. UI 生成失败时可以展示安全降级内容。
16. Workbench 可以运行和重放内置测试案例。
17. 智慧安防能力通过独立场景包加载。
18. 移除智慧安防场景后通用功能仍可运行。

### 20.2 智慧安防场景验收

| 案例 | 预期结果 |
|---|---|
| 查询可用设备 | 展示设备状态列表或卡片 |
| 生成巡防方案 | 展示方案、设备编组和路线摘要 |
| 对比多个方案 | 展示差异并允许选择 |
| 查看地图路线 | 通过前端 Action Registry 展示路线 |
| 选择候选方案 | 选择结果返回 Runtime Host |
| 创建巡防任务 | 先展示任务草稿并要求确认 |
| 用户取消任务 | Runtime Host 不调用任务创建工具 |
| 重复点击确认 | Workbench 阻止重复提交 |
| Agent 返回非法组件 | 拒绝渲染并安全降级 |
| Props 不符合 Schema | 显示字段级错误 |
| Compiler 失败 | 保留有效 Markdown |
| 后端工具失败 | 保留任务草稿并展示恢复路径 |

### 20.3 架构边界验收

必须通过以下检查：

- Workbench 源码不存在 Business Agent 私有协议适配实现；
- Workbench 源码不存在后端任务创建和设备控制调用；
- 场景包不包含 Runtime Host 的 Business Agent Adapter；
- 通用模块不直接依赖智慧安防领域类型；
- UI Compiler Core 不因 Workbench 或智慧安防场景增加领域依赖。

---

## 21. 成功指标

### 21.1 链路完整性

- 至少通过 Runtime Host 运行一个准真实 Business Agent Adapter；
- 至少完成设备查询、方案生成和任务确认三个连续场景；
- 至少完成一次前端 Action 回传；
- 至少完成一次人工确认后的后端工具调用。

### 21.2 可诊断性

- 所有标准失败案例都能够识别主要失败阶段；
- Schema 错误能够定位到具体字段路径；
- 所有降级案例都能够显示降级原因。

### 21.3 可回归性

- 至少维护 10 个内置案例；
- 核心案例能够重复执行；
- Runtime、Compiler、Catalog 或 Renderer 修改后能够重新运行案例。

### 21.4 可扩展性

- 智慧安防通过独立前端场景包加载；
- 新增第二个场景不需要修改 UI Compiler Core；
- 新增 Business Agent Adapter 不需要修改 Workbench 核心页面。

---

## 22. 开发优先级

### P0：工程和运行基础

- 初始化 `apps/web-workbench`；
- 建立 Runtime Client；
- 建立应用外壳和基础路由；
- 实现 Markdown Renderer；
- 实现 A2UI Renderer 接入；
- 建立 Component Registry；
- 建立 Action Registry；
- 实现错误和降级展示。

### P0：首个业务闭环

- 设备状态查询；
- 巡防方案生成和比较；
- 地图前端 Action；
- 任务草稿确认；
- 用户决策回传 Runtime Host。

### P1：诊断和验收

- Inspect 页面；
- Catalog 映射状态；
- 内置案例；
- 单案例执行和重放；
- 场景切换；
- 环境配置。

### P2：增强能力

- 批量案例执行；
- 版本差异比较；
- 视觉截图回归；
- 多 Runtime 环境结果对比；
- 运行统计和性能分析；
- 案例服务端持久化。

---

## 23. 需求追踪矩阵

| 业务需求 | 主要功能需求 | 主要验收需求 |
|---|---|---|
| BR-001 完整前端运行闭环 | FR-001～FR-015 | 平台验收 1～15 |
| BR-002 统一联调入口 | FR-001～FR-006、FR-016 | 平台验收 2～8 |
| BR-003 问题责任定位 | FR-016～FR-019 | 平台验收 8～10 |
| BR-004 标准验收基线 | FR-022～FR-025 | 平台验收 16 |
| BR-005 版本回归验证 | FR-023～FR-025 | 可回归性指标 |
| BR-006 业务价值验证 | 第 15 节 | 智慧安防场景验收 |
| BR-007 平台领域解耦 | FR-020～FR-021、AC-011～AC-012 | 架构边界验收 |
| BR-008 可发布开发环境 | FR-026～FR-030 | 平台验收 1 |

---

## 24. MVP 完成定义

只有同时满足以下条件，Generative UI Workbench MVP 才视为完成：

1. 已形成可独立部署的 Web 工程，而不是单文件 Demo；
2. 已通过 Runtime Host 打通至少一个完整运行链路；
3. 已实现安全 Markdown 和真实组件 A2UI 渲染；
4. 已实现用户 Action 返回 Runtime Host；
5. 已实现至少一个需要人工确认的业务流程；
6. 已提供可定位主要失败阶段的诊断能力；
7. 已提供不少于 10 个内置验收案例；
8. 已完成设备查询、巡防方案和任务确认三个参考场景；
9. 已证明 Workbench 不直接接入 Business Agent；
10. 已证明智慧安防场景可以从通用工作台中移除或替换。

---

## 25. 最终产品定义

> Generative UI Workbench 是 Generative UI Platform 的官方 Frontend Runtime 参考实现和端到端开发验收环境。它只通过 Agent Runtime Host 参与运行链路，负责生成式 UI 的展示、前端交互、诊断和验收，不承担 Business Agent 接入、Agent Run 编排或后端业务工具调用。平台以空地多智能体协同巡防指挥作为首个领域参考场景，在保持 Runtime、Compiler 和 Renderer 领域独立性的前提下，验证设备状态、方案比较、地图协同、用户审批和操作回传的完整闭环。
