# Generative UI Workbench 软件需求规格说明书

**文档版本：** 0.2  
**项目阶段：** MVP 规划  
**所属项目：** Generative UI Platform  
**产品名称：** Generative UI Workbench  
**中文名称：** 生成式 UI 开发与验收工作台  
**首个参考领域：** 智慧安防  
**首个参考场景：** 空地多智能体协同巡防指挥  
**目标读者：** 产品负责人、架构师、平台开发者、Business Agent 开发者、前端组件开发者、测试人员和编码 Agent

---

## 1. 文档约定

本文使用以下约束词：

- **必须（MUST）**：不可省略的强制要求。
- **应该（SHOULD）**：原则上应实现，除非存在明确且记录在案的原因。
- **可以（MAY）**：可选能力，不属于当前阶段强制范围。
- **禁止（MUST NOT）**：不得实现或不得形成该依赖关系。

需求编号约定：

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

发生冲突时，优先级依次为：

1. 系统边界与职责；
2. 安全和控制边界；
3. 业务需求；
4. 功能需求；
5. 建议性页面和目录结构。

---

## 2. 编写目的

本文档用于明确 Generative UI Workbench：

- 为什么建设；
- 服务哪些用户；
- 解决哪些用户问题；
- 在 Generative UI Platform 中承担什么职责；
- 与 Agent Runtime Host、Business Agent 和 UI Compiler 的边界；
- MVP 必须提供哪些能力；
- 以什么业务场景验证其价值；
- 达到什么条件才可以验收。

本文档是以下工作的共同基线：

- 产品范围确认；
- 系统架构设计；
- Runtime Host 接口设计；
- Frontend Runtime 和组件开发；
- 智慧安防参考场景建设；
- 测试用例设计；
- 阶段验收和版本回归。

本文档描述“系统必须具备什么能力及满足什么条件”，不替代详细架构设计、接口定义和页面视觉设计。

---

## 3. 产品背景

### 3.1 公司业务背景

公司正在建设智慧安防、空地多智能体协同巡防指挥等 Agent 应用。

典型业务链路包括：

1. 用户以自然语言提出巡防或处置要求；
2. Business Agent 查询区域、设备和任务状态；
3. Agent 生成一个或多个候选方案；
4. 系统展示设备编组、路线、风险和执行约束；
5. 用户比较方案并作出选择；
6. 高风险操作经过人工确认；
7. Runtime Host 调用后端业务工具；
8. 页面持续展示执行状态、异常和处理结果。

这类业务结果不只是普通文本，还可能包含：

- 多个候选方案；
- 设备状态列表；
- 任务草稿；
- 风险提示；
- 地图区域和路线；
- 审批操作；
- 实时状态和异常信息。

仅使用固定聊天气泡或 Markdown，难以稳定承载复杂的比较、确认、操作和状态展示。

### 3.2 平台技术背景

Generative UI Platform 已逐步形成以下能力：

- Agent Runtime Host；
- Business Agent Adapter 扩展位置；
- UI Compiler Service；
- Presentation Router；
- UI Compiler Core；
- Presentation Request 和 Presentation Result 契约；
- UI Plan Candidate；
- UI IR；
- A2UI 编译；
- Component Catalog Schema；
- Markdown 安全处理；
- Schema 校验和降级机制。

现有 `apps/web-demo` 主要用于验证浏览器与 Runtime Host 之间的 HTTP 或 WebSocket 基础通信。

它不能作为长期开发和验收环境，原因包括：

- 主要返回 Mock 文本，不能证明完整业务链路；
- 缺少正式 Frontend Runtime 和 Component Registry；
- 缺少 Markdown 与生成式 UI 的完整渲染闭环；
- 缺少 Action 执行和回传；
- 缺少展示决策、UI Plan、UI IR、A2UI 等诊断信息；
- 缺少标准业务案例和版本回归能力；
- 缺少可持续部署和维护的产品结构。

### 3.3 当前协作方式的问题

没有统一 Workbench 时，各角色通常通过临时页面、接口工具、日志或各模块测试分别验证能力：

```text
Agent 开发者验证 Agent
Runtime 开发者验证 Runtime
Compiler 开发者验证 Compiler
前端开发者验证组件
测试人员人工拼接完整流程
```

这种方式无法稳定回答：

- Runtime Host 是否正确适配了 Business Agent；
- Agent 结果为什么被展示为 Markdown；
- UI Plan 为什么没有通过校验；
- 某个组件为什么没有被选择或渲染；
- 某个 Action 为什么不能执行；
- 用户确认是否真正阻止了高风险操作；
- Compiler 或 Catalog 升级后哪些场景发生了退化；
- 平台是否已经具备可用于真实业务的完整闭环。

因此，需要建设统一、可部署、可重复使用的开发与验收工作台。

---

## 4. 产品目的

### 4.1 总体目的

Generative UI Workbench 的建设目的为：

> 为 Generative UI Platform 提供统一的 Frontend Runtime 参考实现，以及面向 Runtime Host 的开发、联调、诊断、验收和回归环境。

Workbench 应将以下分散能力组成可运行闭环：

```text
用户输入
  ↓
Generative UI Workbench
  ↓
Agent Runtime Host
  ├── Business Agent Adapter → Business Agent
  └── UI Compiler Service
          ↓
    Markdown / A2UI
          ↓
Generative UI Workbench
  ↓
用户操作与 Action 结果
  ↓
Agent Runtime Host
```

### 4.2 业务目的

Workbench 应通过智慧安防参考场景证明：

- Agent 的复杂业务结果能够被转换为清晰、受控的交互界面；
- 用户能够比较方案，而不是只阅读长文本；
- 高风险业务操作能够在执行前获得明确确认；
- 地图、面板和组件操作能够通过受控 Action 完成；
- UI 生成失败时仍能保留有效业务内容；
- 生成式 UI 对真实业务流程具有可验证价值。

### 4.3 工程目的

Workbench 应建立统一的：

- Runtime Host 联调入口；
- Frontend Runtime 参考实现；
- Component Registry；
- Action Registry；
- 编译链路诊断入口；
- 标准案例执行入口；
- 版本回归环境；
- 平台验收证据。

### 4.4 非目的

Workbench 的目的不是：

- 建设完整智慧安防生产系统；
- 代替 Agent Runtime Host；
- 直接适配 Business Agent 私有协议；
- 承担 Agent Run 编排；
- 直接调用后端业务工具；
- 保存权威业务任务状态；
- 建设通用低代码平台；
- 允许模型生成并执行任意前端代码；
- 建设面向市场宣传的产品门户。

---

## 5. 产品定位

### 5.1 核心定位

Generative UI Workbench 定位为：

> 面向 Generative UI Platform 开发者和接入团队的、可发布的生成式 UI 开发与验收工作台。

它同时是：

- Generative UI Platform 的官方 Frontend Runtime 参考实现；
- Runtime Host 的统一 Web 联调客户端；
- Markdown 和 A2UI 的运行与渲染环境；
- Component Catalog 和 Action 的验证环境；
- 完整链路的诊断环境；
- 标准业务场景的验收和回归环境。

它不是：

- Business Agent；
- Agent Runtime Host；
- UI Compiler；
- 最终智慧安防生产系统；
- 单纯的组件展示站；
- 一次性演示 Demo；
- 面向公众的营销门户。

### 5.2 产品方案

产品采用：

> **通用 Workbench 核心 + 智慧安防场景包 + 空地多智能体巡防指挥参考实现。**

其中：

- 通用 Workbench 核心负责 Runtime 通信、渲染、诊断、案例和配置；
- 智慧安防场景包负责领域组件、前端 Action、示例数据和验收案例；
- Agent Runtime Host 负责 Business Agent Adapter、Run 生命周期、Compiler 调用和后端工具；
- UI Compiler 负责展示决策和受控 UI 编译。

### 5.3 一句话价值

> 让生成式 UI 从“各模块能够独立运行”，变成“完整链路可联调、问题可定位、能力可验收、版本可回归”。

---

## 6. 目标用户及其核心问题

### 6.1 用户问题总览

| 用户 | 当前主要问题 | Workbench 提供的价值 |
|---|---|---|
| 平台开发者 | 模块分别可测，但完整链路难以验证；错误跨模块，定位成本高 | 展示完整链路、阶段状态、中间结果、错误和降级原因 |
| Business Agent 开发者 | 不清楚 Agent 经 Runtime Host 接入后最终如何展示；经常需要临时测试页面 | 提供统一运行入口，验证 Agent 结果、展示模式和交互闭环 |
| 前端组件开发者 | 缺少统一环境验证 Catalog、Props、数据状态和 Action | 提供组件目录、预览、Schema 错误和 Action 运行环境 |
| 测试人员 | 缺少稳定案例、预期结果和可重复执行入口 | 提供案例保存、重放、差异比较和通过/失败结果 |
| 架构师和技术负责人 | 难以判断平台是否形成真实闭环，架构边界是否被遵守 | 提供端到端证据、职责边界和平台级验收结果 |
| 业务场景开发团队 | 难以验证生成式 UI 是否真正改善复杂业务交互 | 通过巡防方案、地图联动和任务确认形成参考实现 |

### 6.2 平台开发者

#### 用户问题

- Runtime、Compiler 和 Renderer 分别通过测试，但无法证明组合后可用；
- 失败信息分散在多个服务和日志中；
- 很难判断失败发生在 Agent 输出、展示决策、编译、渲染还是 Action；
- 缺少升级后的标准回归入口。

#### 用户需求

- 查看请求从 Workbench 到 Runtime Host 再返回页面的完整过程；
- 查看 Runtime Host 暴露的 Agent 输出、Presentation Decision、UI Plan、UI IR 和 A2UI；
- 查看每个阶段的耗时、错误和降级原因；
- 重新运行相同案例并比较结果。

### 6.3 Business Agent 开发者

#### 用户问题

- 每个 Agent 都需要临时搭建测试页面；
- 不确定 Agent 返回 Markdown 或结构化数据后会产生什么页面；
- 不清楚为何某次结果只展示 Markdown；
- 不清楚 Action 是否正确回到 Runtime Host；
- 容易把 Business Agent 协议适配错误归因到前端或 Compiler。

#### 用户需求

- 使用 Runtime Host 公开的统一协议运行 Agent；
- 选择或查看 Runtime Host 暴露的 Agent 配置；
- 查看 Agent 原始业务结果及最终展示结果；
- 验证用户操作、人工确认和 Action 回传；
- 不要求 Business Agent 直接实现 A2UI、AG-UI 或 Workbench 私有协议。

### 6.4 前端组件开发者

#### 用户问题

- 组件已经开发，但缺少真实 A2UI 数据验证；
- Props Schema、空状态、错误状态和边界数据容易遗漏；
- Action 参数和注册关系难以统一验证；
- 领域组件容易与通用 Runtime 强耦合。

#### 用户需求

- 查看当前场景加载的 Component Catalog；
- 使用示例数据独立预览组件；
- 查看 Props 和 Action Schema；
- 验证合法、非法、缺失和边界数据；
- 验证组件只能通过 Registry 注册和加载。

### 6.5 测试人员

#### 用户问题

- 验收依赖人工输入和肉眼判断；
- 缺少输入、预期组件、预期 Action 和预期降级的统一记录；
- 平台版本升级后难以确认哪些场景发生回归；
- 很难复现模型或协议相关问题。

#### 用户需求

- 保存和重放标准案例；
- 对比预期与实际展示模式、组件和 Action；
- 查看失败阶段和差异；
- 执行正常、异常、安全和降级案例；
- 对关键业务流程形成可重复验收证据。

### 6.6 架构师和技术负责人

#### 用户问题

- 无法仅凭模块完成度判断平台是否真正可用；
- 难以确认 Business Agent、Runtime Host、Compiler 和 Workbench 的边界是否被破坏；
- 缺少真实业务场景证明平台通用机制有效；
- 缺少阶段性交付的客观验收依据。

#### 用户需求

- 查看端到端闭环；
- 验证新增业务场景不需要修改 UI Compiler Core；
- 验证 Workbench 不直接适配 Business Agent；
- 查看标准场景通过率、降级情况和未完成能力。

---

## 7. 系统边界与职责

### 7.1 正式运行关系

```text
Generative UI Workbench
          │ HTTP / WebSocket / AG-UI Adapter
          ▼
Agent Runtime Host
          ├── Business Agent Adapter ──> Business Agent
          ├── Run 生命周期和上下文编排
          ├── 后端业务工具调用
          └── UI Compiler Service
                    │
                    ├── Markdown
                    └── A2UI / Fallback
          ▼
Generative UI Workbench
          ├── Markdown Renderer
          ├── A2UI Renderer
          ├── Component Registry
          ├── Frontend Action Registry
          └── 人工确认与操作回传
```

### 7.2 Workbench 职责

Workbench 必须负责：

- 连接 Agent Runtime Host；
- 发送用户输入、取消请求和前端事件；
- 展示 Runtime Host 返回的运行状态；
- 渲染安全 Markdown；
- 渲染 A2UI；
- 维护 Frontend Component Registry；
- 维护 Frontend Action Registry；
- 展示 Runtime Host 提供的诊断数据；
- 展示人工确认界面；
- 执行已注册且通过校验的前端 Action；
- 将用户选择和 Action 结果回传 Runtime Host；
- 加载前端场景包；
- 保存、执行和比较验收案例；
- 支持独立构建和部署。

### 7.3 Workbench 非职责

Workbench 禁止承担：

- 直接连接 Business Agent；
- 实现 Business Agent Adapter；
- 适配 Business Agent 私有协议；
- 选择由哪个 Business Agent 处理请求；
- 编排 Agent Run；
- 管理 Agent Checkpoint 或长期记忆；
- 直接调用后端业务工具；
- 保存权威设备、任务或审批状态；
- 决定 Agent 业务结果是否正确；
- 生成 UI Plan；
- 将 UI Plan 编译为 A2UI；
- 执行模型生成的任意代码。

### 7.4 Agent Runtime Host 职责

Agent Runtime Host 负责：

- 向 Workbench 提供统一交互协议；
- 维护 Run 生命周期、线程和上下文；
- 注册和调用 Business Agent Adapter；
- 适配不同 Business Agent 原有协议；
- 调用 Business Agent；
- 聚合运行事件；
- 调用 UI Compiler Service；
- 将 Markdown、A2UI、诊断和错误映射给 Workbench；
- 接收 Workbench Action 结果；
- 调用后端业务工具；
- 维护需要后端权威控制的任务状态。

### 7.5 UI Compiler 职责

UI Compiler 负责：

- 判断 Agent 业务内容应使用 Markdown 还是生成式 UI；
- 生成或接收 UI Plan Candidate；
- 校验 Component Catalog、Props、Action 和结构；
- 将 UI Plan Candidate 转换为 UI IR；
- 将 UI IR 编译为 A2UI；
- 失败时返回安全降级结果；
- 不承担 Business Agent 路由、Run 编排和真实组件渲染。

---

## 8. 建设目标

### 8.1 核心目标

MVP 必须实现：

1. 建立可独立部署的 Web Workbench；
2. 打通 Workbench 与 Runtime Host 的统一通信；
3. 打通 Markdown 和 A2UI 的完整渲染；
4. 打通用户 Action 到 Runtime Host 的回传；
5. 提供 Runtime Host 输出的链路诊断信息；
6. 提供标准案例保存、重放和结果比较；
7. 建立智慧安防参考场景；
8. 完成设备查询、方案生成和任务确认三个连续流程；
9. 保持 Workbench、Runtime Host、Compiler 和场景包的职责边界；
10. 为后续新增业务场景提供可复制的参考结构。

### 8.2 非目标

MVP 不建设：

- 完整生产级智慧安防应用；
- 大规模真实设备控制；
- 多租户、计费和开放注册；
- 通用低代码页面设计器；
- 任意 HTML、CSS、JavaScript、Vue 或 React 代码生成；
- 完整模型管理和 Prompt 管理平台；
- 完整自动化测试管理平台；
- 生产级长期会话和业务状态存储；
- 面向公众的营销和产品介绍门户。

---

## 9. 业务需求

### BR-001 完整链路验证

系统必须提供统一环境，验证用户输入、Runtime Host、Business Agent、UI Compiler、Frontend Runtime 和 Action 回传形成完整闭环。

### BR-002 统一联调入口

系统必须为平台开发者和 Agent 开发者提供统一 Web 联调入口，避免为每个 Agent 重复建设测试页面。

### BR-003 可诊断

系统必须使用户能够判断请求当前状态、失败阶段、错误路径和降级原因。

### BR-004 可验收

系统必须将平台能力和参考业务场景转化为具有预期结果的标准验收案例。

### BR-005 可回归

系统必须支持在 Runtime、Compiler、Catalog、Renderer 或场景包变化后重新执行已有案例。

### BR-006 业务价值验证

系统必须通过真实巡防业务流程验证生成式 UI 对方案比较、地图协同、人工确认和状态展示的价值。

### BR-007 领域解耦

系统必须以场景包提供智慧安防领域组件和案例，不得将领域概念写入通用 Workbench 核心或 UI Compiler Core。

### BR-008 可发布运行

Workbench 必须能够部署为稳定的开发、联调和验收网站，而不是只能在开发人员本地运行的一次性 Demo。

---

## 10. 用户需求

### UR-001 平台开发者查看链路

平台开发者必须能够查看 Runtime Host 返回的主要运行阶段、输入输出摘要、耗时、错误和降级原因。

### UR-002 Agent 开发者验证展示结果

Agent 开发者必须能够通过 Runtime Host 运行指定 Agent 配置，并查看 Agent 业务结果最终被展示为 Markdown 还是生成式 UI。

### UR-003 组件开发者验证 Catalog

组件开发者必须能够查看组件定义、Props Schema、Action Schema、示例数据和渲染预览。

### UR-004 测试人员执行案例

测试人员必须能够运行标准案例，并比较预期与实际展示模式、组件、Action 和降级结果。

### UR-005 架构人员确认职责边界

架构人员必须能够从文档、配置和运行链路确认 Workbench 没有直接连接 Business Agent，也没有承担 Compiler 和后端工具职责。

### UR-006 业务团队验证参考场景

业务团队应该能够使用预设场景验证设备查询、巡防方案和任务确认是否满足基本交互目标。

---

## 11. 主要使用场景

### 11.1 场景一：设备状态查询

用户输入：

```text
查看当前可用的无人机和无人车。
```

系统应通过 Runtime Host 获取业务结果，并展示：

- 可用设备数量；
- 设备类型；
- 在线状态；
- 电量；
- 当前任务状态；
- 位置摘要。

该场景验证：

- 结构化数据展示；
- Markdown 与生成式 UI 分流；
- 设备组件 Catalog；
- 缺失字段和非法组件降级。

### 11.2 场景二：巡防方案生成与比较

用户输入：

```text
使用一架无人机和两台无人车巡查 A 区域。
```

系统应展示：

- 一个或多个候选方案；
- 设备编组；
- 巡防路线摘要；
- 预计时长；
- 风险与限制；
- 方案选择操作。

该场景验证：

- 多方案生成式 UI；
- 地图前端 Action；
- 组件组合；
- Action 参数校验；
- 选择结果回传 Runtime Host。

### 11.3 场景三：任务草稿确认

用户输入：

```text
采用方案二并创建巡防任务。
```

系统必须先展示任务草稿和人工确认界面。

用户确认后，Workbench 只将确认事件回传 Runtime Host，由 Runtime Host 调用后端任务创建工具。

该场景验证：

- 人机协作状态；
- 高风险操作控制边界；
- 用户确认；
- 后端工具调用职责；
- 创建失败后的草稿保留和恢复提示。

---

## 12. 功能需求

### FR-001 Runtime Host 连接

系统必须支持通过配置连接 Agent Runtime Host。

系统不得要求浏览器配置 Business Agent 私有地址或密钥。

### FR-002 用户输入与请求控制

系统必须支持：

- 输入并发送消息；
- 查看请求状态；
- 取消请求；
- 重新执行；
- 防止重复提交。

### FR-003 通信模式

MVP 必须支持仓库当前约定的 HTTP 和 WebSocket 通信。

未来可以通过 Runtime Adapter 支持 AG-UI 等协议，但不得影响页面和 Renderer 核心。

### FR-004 Runtime 配置展示

Workbench 应允许选择或查看 Runtime Host 暴露的：

- 环境；
- Agent 配置标识；
- 场景标识；
- 通信模式；
- 调试能力。

Workbench 不实现对应 Business Agent Adapter。

### FR-005 结果渲染

系统必须支持：

- 安全 Markdown；
- A2UI；
- Fallback Markdown；
- Error。

页面必须明确展示当前结果类型和是否发生降级。

### FR-006 Markdown 安全

Markdown 必须经过安全处理，禁止执行：

- 脚本；
- 危险 HTML；
- 未授权嵌入；
- 危险链接协议。

### FR-007 A2UI 渲染

A2UI Renderer 必须：

- 只从 Component Registry 加载组件；
- 校验组件类型；
- 使用受控 Props；
- 不执行模型生成代码；
- 对未知组件提供明确错误或安全降级。

### FR-008 Component Registry

Workbench 必须维护前端组件类型到真实组件实现的映射。

智慧安防领域组件必须通过场景包注册，不得写入通用 Renderer 判断分支。

### FR-009 Frontend Action Registry

Workbench 必须维护已允许的前端 Action。

每个 Action 至少定义：

- 名称；
- 参数 Schema；
- 风险级别；
- 执行器；
- 是否需要用户确认；
- 执行结果 Schema。

### FR-010 Action 执行和回传

系统必须：

1. 校验 Action 名称；
2. 校验参数；
3. 检查风险和确认要求；
4. 执行已注册前端能力；
5. 记录执行结果；
6. 将结果回传 Runtime Host。

### FR-011 人工确认

涉及任务创建、设备控制或其他高风险行为时，Workbench 必须展示：

- 操作名称；
- 目标对象；
- 关键参数；
- 影响范围；
- 风险提示；
- 确认和取消操作。

Workbench 不得在用户确认前触发后端业务工具。

### FR-012 运行状态

Workbench 至少应支持展示：

- 等待发送；
- 已发送；
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

状态来源由 Runtime Host 协议和前端渲染过程共同提供。

### FR-013 诊断查看

系统必须展示 Runtime Host 提供的诊断信息，包括可用时的：

- 用户输入；
- Agent 原始结果；
- Presentation Decision；
- UI Plan Candidate；
- Schema 校验结果；
- UI IR；
- A2UI；
- Renderer 状态；
- Action 请求与结果；
- 错误和降级信息；
- 各阶段耗时。

Workbench 不直接进入 Runtime Host 或 Compiler 内部读取数据。

### FR-014 错误展示

错误至少应包含：

- requestId；
- 错误阶段；
- 错误代码；
- 用户可理解说明；
- 开发诊断信息；
- 字段路径；
- 是否已降级；
- 建议恢复操作。

### FR-015 Component Catalog 页面

系统应提供 Catalog 查看能力，包括：

- 组件名称和标识；
- 所属场景；
- 版本；
- Props Schema；
- Action 定义；
- 示例数据；
- 渲染预览；
- 可用状态。

### FR-016 场景包

Workbench 必须支持加载前端场景包。

场景包可以包含：

- 领域组件注册；
- 前端 Action 注册；
- 示例输入；
- Mock 或固定验收数据；
- 验收案例；
- 场景说明。

场景包不得包含 Business Agent Adapter 或后端工具实现。

### FR-017 测试案例保存

系统应支持保存运行案例，至少包含：

- 案例名称；
- 场景标识；
- 用户输入；
- Runtime 配置标识；
- 可选固定 Agent 结果；
- 预期结果类型；
- 预期组件；
- 预期 Action；
- 预期错误或降级；
- 实际结果。

### FR-018 测试案例重放

系统应支持：

- 运行单个案例；
- 重新运行；
- 查看通过或失败；
- 比较预期和实际结果；
- 查看最后执行时间；
- 保存失败诊断。

### FR-019 内置案例

MVP 至少提供 10 个内置案例，覆盖：

- Markdown 直出；
- 设备状态 UI；
- 多方案 UI；
- 地图 Action；
- 任务确认；
- 用户取消；
- 非法组件；
- 非法 Props；
- 非法 Action；
- Compiler 失败后降级；
- 后端工具失败。

### FR-020 环境配置

Workbench 必须支持开发、测试和发布环境配置。

至少包括：

- Runtime Host 地址；
- HTTP 或 WebSocket 模式；
- 场景；
- 请求超时；
- 调试信息开关；
- 是否允许固定 Mock 案例。

敏感密钥不得进入浏览器公开构建产物。

### FR-021 可部署网站

Workbench 必须：

- 独立构建；
- 生成可部署资源；
- 支持 Nginx 或容器托管；
- 支持外部环境配置；
- 提供健康检查或可用性验证方式；
- 与本地一次性 Demo 区分。

---

## 13. 页面与信息架构建议

```text
/workbench
├── /playground
├── /inspect
├── /cases
├── /catalog
├── /scenarios
└── /settings
```

### 13.1 Playground

用于输入请求、查看运行状态和最终 Markdown 或生成式 UI。

### 13.2 Inspect

用于查看 Runtime Host 返回的完整诊断链路。

### 13.3 Cases

用于保存、运行和比较验收案例。

### 13.4 Catalog

用于查看和预览当前 Component Catalog。

### 13.5 Scenarios

用于查看通用场景和智慧安防场景包。

### 13.6 Settings

用于配置 Runtime Host、通信方式、超时和调试选项。

页面结构属于建议性要求，可以在详细设计阶段调整，但不得删除对应能力。

---

## 14. 外部接口需求

### IR-001 Workbench 与 Runtime Host

Workbench 必须只通过 Runtime Host 的公开协议交换：

- 用户消息；
- 请求取消；
- 运行状态；
- Markdown 或 A2UI 结果；
- 诊断数据；
- Action 请求；
- Action 结果；
- 用户确认结果；
- 错误和降级信息。

### IR-002 Runtime Host 与 Business Agent

该接口不属于 Workbench 实现范围。

Workbench 只显示 Runtime Host 暴露的 Agent 配置标识和运行结果，不感知 Business Agent 私有协议。

### IR-003 Runtime Host 与 UI Compiler

该接口不属于 Workbench 直接调用范围。

Runtime Host 负责调用 UI Compiler Service，并将结果映射为 Workbench 可消费的协议。

### IR-004 Renderer 与 Registry

Renderer 必须通过 Component Registry 和 Action Registry 使用真实组件和前端能力，不得直接根据字符串执行任意模块或函数。

### IR-005 场景包接口

场景包接口应明确：

- 场景元数据；
- Component Catalog；
- Component Registry 扩展；
- Frontend Action 扩展；
- 示例和验收案例。

---

## 15. 数据与契约需求

### DR-001 通信契约

系统应复用或扩展仓库共享契约，禁止在 Workbench 内重复定义与 Runtime Host 不一致的公共类型。

### DR-002 核心数据

Workbench 需要消费或维护：

- UserMessage；
- RuntimeEvent；
- RuntimeStatus；
- PresentationResult；
- MarkdownResult；
- A2UI Operations；
- DiagnosticTrace；
- Component Catalog；
- Frontend Component Registry；
- Frontend Action Definition；
- ActionRequest；
- ActionResult；
- ConfirmationRequest；
- ConfirmationResult；
- TestCase；
- TestRunResult。

### DR-003 运行时校验

来自 Runtime Host、场景包、案例文件和持久化存储的数据必须进行运行时校验。

### DR-004 版本信息

以下数据应具备可追踪版本：

- Runtime 协议；
- Presentation 契约；
- A2UI Profile；
- Component Catalog；
- 场景包；
- 测试案例格式。

### DR-005 诊断脱敏

诊断数据不得默认展示：

- 模型或业务系统密钥；
- 用户认证令牌；
- 不应暴露的设备控制凭证；
- 后端内部敏感配置。

---

## 16. 非功能需求

### NFR-SEC-001 安全性

- 模型和 Agent 输出必须视为不可信输入；
- 不得执行任意模型生成代码；
- 未注册组件不得渲染；
- 未注册 Action 不得执行；
- Props 和 Action 参数必须校验；
- 高风险操作必须确认；
- Markdown 必须安全处理；
- 浏览器不得持有后端敏感密钥。

### NFR-REL-001 可靠性

- UI 编译或渲染失败不得导致有效业务内容丢失；
- WebSocket 断开必须显示明确状态；
- 请求失败后应允许重试；
- Action 应防止重复提交；
- 用户取消后不得继续执行受控操作。

### NFR-OBS-001 可观察性

每次运行至少应具备：

- requestId；
- sessionId 或 threadId；
- scenarioId；
- runtimeConfigId；
- 各阶段状态和耗时；
- 最终结果类型；
- 错误阶段；
- 降级原因。

### NFR-EXT-001 可扩展性

新增第二个业务场景时，主要工作应是：

- 新增场景包；
- 注册组件；
- 注册前端 Action；
- 增加案例；
- 在 Runtime Host 注册对应 Agent 配置。

不得修改 UI Compiler Core 的领域逻辑。

### NFR-MAINT-001 可维护性

通用 Runtime Client、Renderer、Registry、诊断、案例和场景加载应职责分离。

不得将智慧安防业务类型直接写入通用核心。

### NFR-TEST-001 可测试性

必须支持：

- Registry 和 Schema 单元测试；
- Runtime Client 集成测试；
- Renderer 集成测试；
- Action 回传测试；
- 关键业务场景端到端测试；
- 标准案例重复执行。

### NFR-DEPLOY-001 可部署性

- 支持独立构建；
- 支持 Nginx 或容器部署；
- 支持外部环境配置；
- 测试和发布环境应隔离；
- 构建产物不应包含开发环境密钥。

### NFR-USABILITY-001 易用性

用户无需阅读服务端原始日志即可判断：

- 请求是否成功；
- 当前处于什么阶段；
- 最终展示模式；
- 是否发生降级；
- 失败发生在哪一层；
- 可采取什么恢复操作。

### NFR-PERF-001 性能

MVP 建议目标：

- 页面首次可交互时间不超过 3 秒；
- 本地或测试环境发送请求后 500 毫秒内出现状态反馈；
- 大型诊断 JSON 延迟展开或虚拟化；
- 诊断面板不得阻塞主要结果渲染。

### NFR-COMP-001 兼容性

MVP 优先支持：

- Chrome 最新稳定版本；
- Edge 最新稳定版本；
- Windows 11 开发与测试环境。

---

## 17. 架构和实现约束

### AC-001

Workbench 必须只连接 Agent Runtime Host，不得直接连接 Business Agent。

### AC-002

Business Agent Adapter、Run 编排、后端业务工具和权威业务状态属于 Runtime Host 或 Business Agent 后端。

### AC-003

UI Plan、UI IR 和 A2UI 编译属于 UI Compiler，不得在 Workbench 重复实现。

### AC-004

真实前端组件必须通过 Component Registry 注册。

### AC-005

前端 Action 必须通过 Action Registry 注册并校验。

### AC-006

地图定位、路线显示、区域高亮和打开面板属于前端 Action。

### AC-007

查询权威设备数据、创建任务和调用真实设备属于后端业务工具。

### AC-008

任务创建和设备控制必须经过用户确认。

### AC-009

智慧安防领域能力必须位于场景包或领域组件包，不得进入通用 Workbench 核心。

### AC-010

移除智慧安防场景包后，Workbench 的通用通信、渲染、诊断和案例能力仍必须可运行。

### AC-011

Workbench 的诊断能力不得成为未来生产业务前端运行的强制依赖。

### AC-012

有效 Agent 业务内容不得因 UI 编译或渲染失败而丢失。

---

## 18. 验收需求

### AR-001 可部署

Workbench 可以独立构建，并部署为可访问的测试网站。

### AR-002 Runtime 通信

Workbench 可以通过 HTTP 和 WebSocket 与 Runtime Host 通信。

### AR-003 Markdown

Workbench 可以安全展示 Markdown 结果。

### AR-004 A2UI

Workbench 可以通过 Component Registry 渲染至少一组 A2UI 组件。

### AR-005 Action

Workbench 可以执行至少一个地图前端 Action，并将结果回传 Runtime Host。

### AR-006 人工确认

任务创建流程在用户确认前不得触发 Runtime Host 的后端创建操作。

### AR-007 诊断

失败请求可以识别失败阶段；Schema 错误可以定位字段路径；降级结果可以显示原因。

### AR-008 案例

系统至少提供 10 个内置案例，并支持单案例重放和结果比较。

### AR-009 智慧安防闭环

至少完成以下连续流程：

1. 查询可用设备；
2. 生成并比较巡防方案；
3. 选择方案并确认任务草稿；
4. 将确认结果回传 Runtime Host；
5. 展示创建结果或失败恢复信息。

### AR-010 职责边界

验收时必须确认：

- Workbench 未直接连接 Business Agent；
- Workbench 中不存在 Business Agent Adapter；
- Workbench 未直接调用后端业务工具；
- 智慧安防组件通过场景包注册；
- UI Compiler Core 未增加智慧安防领域判断。

---

## 19. 成功指标

### 19.1 用户价值

- Agent 开发者不再需要为每个 Agent 临时创建联调页面；
- 平台开发者可以从一个界面定位主要失败阶段；
- 测试人员可以重复运行标准案例；
- 架构人员可以依据完整链路进行阶段验收。

### 19.2 平台能力

- 打通 Runtime Host、Compiler、Renderer 和 Action 回传；
- 至少接入一个由 Runtime Host 适配的准真实 Business Agent；
- 至少完成三个智慧安防连续场景；
- UI 失败时能够稳定降级；
- 新增场景不需要修改 Compiler Core。

### 19.3 质量基线

- 核心案例可以重复执行；
- 所有失败案例具有明确错误阶段；
- 所有高风险操作具有人工确认；
- 非法组件和 Action 均被拒绝；
- Workbench 可在测试环境持续发布。

---

## 20. 开发优先级

### P0：运行闭环

- Workbench 应用基础；
- Runtime Client；
- Markdown Renderer；
- A2UI Renderer；
- Component Registry；
- Action Registry；
- 状态和错误展示。

### P0：首个业务闭环

- 设备状态查询；
- 巡防方案生成与比较；
- 地图 Action；
- 任务草稿确认；
- 确认结果回传。

### P1：诊断与验收

- Inspect；
- Catalog；
- 测试案例保存和重放；
- 智慧安防场景包；
- 环境配置。

### P2：增强能力

- 批量案例运行；
- 版本差异比较；
- 截图回归；
- 运行统计；
- 链路性能分析；
- 多场景管理。

---

## 21. 需求追踪矩阵

| 业务需求 | 主要用户 | 对应需求 | 主要验收 |
|---|---|---|---|
| BR-001 完整链路验证 | 平台开发者、架构师 | FR-001～FR-013 | AR-002～AR-007 |
| BR-002 统一联调入口 | Agent 开发者 | FR-001～FR-005 | AR-002～AR-004 |
| BR-003 可诊断 | 平台开发者 | FR-012～FR-014 | AR-007 |
| BR-004 可验收 | 测试人员 | FR-017～FR-019 | AR-008 |
| BR-005 可回归 | 测试人员、平台开发者 | FR-018、FR-019 | AR-008 |
| BR-006 业务价值验证 | 业务团队、架构师 | 第 11 节 | AR-009 |
| BR-007 领域解耦 | 架构师 | FR-016、AC-009、AC-010 | AR-010 |
| BR-008 可发布运行 | 所有目标用户 | FR-020、FR-021 | AR-001 |

---

## 22. 最终产品决策

Generative UI Workbench 采用：

> **通用平台核心 + 智慧安防场景包 + 空地多智能体巡防指挥参考实现。**

采用该方案的原因：

1. 纯通用 Playground 无法证明生成式 UI 的真实业务价值；
2. 直接将 Workbench 建成智慧安防业务系统会破坏平台通用性；
3. 真实场景可以形成明确、连续、可重复的验收标准；
4. 场景包可以隔离通用机制和领域能力；
5. 巡防场景能够覆盖地图、设备、方案、任务、审批、状态和工具调用；
6. Workbench 可以成为后续业务接入的 Frontend Runtime 参考实现；
7. Runtime Host 继续负责 Business Agent 接入和运行编排，避免前端与业务 Agent 协议耦合。

最终定义：

> Generative UI Workbench 是 Generative UI Platform 的官方 Frontend Runtime 参考实现和端到端开发验收环境。它连接 Agent Runtime Host，渲染 Markdown 和受控生成式 UI，执行前端 Action，展示诊断信息并运行标准验收案例；它不直接连接 Business Agent，不承担 Agent 编排、UI 编译或后端业务工具职责。平台以空地多智能体巡防指挥作为首个参考场景，验证生成式 UI 在复杂业务展示、方案比较、地图协同、人工确认和操作回传中的价值。
