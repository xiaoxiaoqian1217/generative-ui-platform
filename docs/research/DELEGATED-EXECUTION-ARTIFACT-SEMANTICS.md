# 委托执行与 Artifact 语义讨论记录

- **性质：** 非规范性讨论记录（research）
- **日期：** 2026-08-19
- **背景：** 对 `AGENT-INTERACTION-GENERALIZATION.md` 五类交互模式中"委托执行"的追问式深化，围绕交付物的语义定位、契约归属、呈现生成边界与事件合成纪律展开

## 起点

本文记录以下追问的推演过程与结论：

1. 委托执行与其他四类模式的判别标准是什么？
2. 交付结果由 `RUN_FINISHED` 携带还是由 `ACTIVITY_SNAPSHOT.content` 携带？
3. Artifact 到底是什么，它是不是 AG-UI 协议概念？
4. contentType 契约由谁理解，谁是消费侧？
5. `schemaVersion` 能否外包给 Runtime，让 Agent 完全脱离 UI？
6. Runtime 在 `RUN_FINISHED` 检查点合成全新事件，这种方式是否合理？

本文所有协议事实均对照仓库实际安装的 `@ag-ui/core` 类型定义与当前 Runtime / Workbench 实现验证。

## 委托执行的判别标准

委托执行的核心是：用户交出的不是一个"问题"，而是一个"任务"；任务有自己的生命周期、进度和交付物，对话只是任务的入口和出口。

与单轮问答的区别（最易混淆的一组）：

| | 单轮问答 | 委托执行 |
| --- | --- | --- |
| 输入 | 问题 | 任务 |
| 输出 | 回答就是文本本身（streaming text） | 交付物（Artifact，结构化结果） |
| 过程 | 即答，无中间态 | 有执行过程，可观察（Activity） |
| 结束 | 话说完即结束 | RUN_FINISHED 时交付结果，RUN_ERROR 时任务失败 |

判别标准：输出是否是一个独立于对话的"交付物"，过程是否需要被观察。

与其余三类的一句话区分：工具中介行动的动作发生在用户眼前的前端，用户观察即时结果；征询等待是 agent 中途停下等用户输入；打断纠偏是用户主动终止 run。委托执行中 agent 全程不停、自主跑完，工作发生在 agent 侧。

## 委托执行的深度结构：任务是一等对象

判别标准回答"是不是委托执行"，深度结构回答"委托执行由什么构成"。

委托执行的本质：任务成为一等对象，对话只是任务的入口和出口。
一个任务必须同时具备三个组成，缺一不可：

| 组成 | 语义 | 协议 / 现状载体 |
| --- | --- | --- |
| 生命周期 | 提交 -> 执行中 -> 中断 / 恢复 -> 完成 / 失败 | Run lifecycle + 服务端 durable Task |
| 进度 | 执行过程的可观察叙述 | ACTIVITY_*（ephemeral，run 级） |
| 交付物 | 任务的产物本体 | 语义上 Artifact，协议上借 Activity 信封 |

三层生命周期的嵌套关系是委托执行最深的结构：

```text
Task（durable，服务端持久）
  ├─ Run #1：RUN_STARTED -> RUN_FINISHED (interrupt)
  ├─ Run #2：RUN_STARTED -> RUN_FINISHED (success)
  └─ ...
Activity：随每个 run 生灭（ephemeral，run 级）
Artifact：跨 run 存续（v1 草稿 -> v2 -> ... -> 定稿）
```

关键推论：run 是任务的执行段，不是任务本身。
中断 / 恢复、断线重连都发生在 run 层；任务和交付物在更高层存续。
一次"委托"在时间上可能对应任意多个 run。

由此派生出委托执行特有的可靠性语义：

- 任务持久在服务端，浏览器断开只中止观察，不取消任务（Issue #200 验收标准之一：browser disconnect 不被错误映射为 Task cancellation）；
- 同一 runId + 相同输入可 replay / 查询绑定的 Task；
- resume 是以新 run 续接同一任务，不是新任务。

与 Issue #200 Task interaction 链路的对应：

```text
User intent -> SACS -> SDAR Task -> status / published state / artifacts -> Workbench
```

- 给任务 = 用户意图变成 Task 提交（RUN_STARTED）；
- 看进度 = ACTIVITY_* + published state；
- 收结果 = artifact 进入 Conversation / Inline Presentation。

## 完整示例：生成这份巡检总结

一个贯穿全部概念的时序，含征询等待分支：

```text
用户："生成这份巡检总结"

RUN_STARTED                              (runId = r1，任务进入执行中)
ACTIVITY_SNAPSHOT  messageId="prog-1"    activityType="progress"
              content={ step: "查询告警", done: 1/5 }          <- 进度面开始存在
ACTIVITY_SNAPSHOT  messageId="prog-1"    replace: true
              content={ step: "聚类分析", done: 3/5 }          <- 同一 surface 持续刷新
ACTIVITY_SNAPSHOT  messageId="summary-1" activityType="inspection-summary"
              content={ contentType, schemaVersion: "1.2",     <- 版本随数据走
                        payload: {...草稿} }                   <- 交付物草稿
RUN_FINISHED (success)                   <- 定稿检查点
  Runtime 校验结构 -> Secondary LLM 转换 -> 缝合：
ACTIVITY_SNAPSHOT  messageId="dynamic-a2ui-r1"  activityType="a2ui-surface"
              content={ operations }                          <- 合成的呈现面
  补发 RUN_FINISHED

中途征询等待的分支：
RUN_FINISHED (outcome=interrupt)         <- summary-1 停在草稿版
resume -> 新 runId = r2，继续 replace 同一 "summary-1"
（此处正是 run 级 messageId 冒充交付物身份的力不从心之处）
```

示例同时标注了三个身份（runId / messageId / 交付物语义）与版本声明的位置。

## RUN_FINISHED：检查点而非交付物载体

协议事实（`@ag-ui/core` 的 `RunFinishedEventSchema`）：

- `runId` / `threadId` 必填；
- `outcome` 为 `success | interrupt`（interrupt 携带 interrupts 列表，即征询等待的协议钩子）；
- `result` 存在但为 `ZodAny`，无任何结构契约。

由此得出控制面与数据面的分工：

- RUN_* 是控制面，回答"运行结局如何"；
- 交付物是数据面，回答"产出了什么"，由 `ACTIVITY_SNAPSHOT.content`（经应用层契约约束）与 `STATE_*`（共享状态同步）承载；
- `RUN_FINISHED.result` 是无类型的不透明逃生舱，把呈现建立在它上面等于把可视化建立在未定义类型上。

正确形态下 RUN_FINISHED 与交付物的关系是按引用（artifact ID 列表）而非按值（内嵌 payload）关联：控制面指向数据面，而不是复制数据面。

## Artifact 是语义概念，不是协议概念

AG-UI 协议没有 `ARTIFACT_*` 事件类型。
Artifact 不是协议名词，是业务语义概念：任务产出的、有独立存在价值的数据对象。

与三个兄弟概念的对照：

| 概念 | 语义 | AG-UI 协议有专属事件吗 |
| --- | --- | --- |
| 文本 | agent 说的话 | 有：`TEXT_MESSAGE_*` |
| 进度 | agent 做事的过程叙述 | 有：`ACTIVITY_*` |
| 状态 | 前后端共享的工作状态 | 有：`STATE_*` |
| 交付物（Artifact） | agent 产出的东西 | 没有 |

判断一段数据是不是 artifact，不看它坐哪个事件，看三点：

1. 生命周期：run 结束后它还有没有价值；
2. 被取用：后续是否按身份引用它；
3. 定稿语义：有没有"最终版"概念（v1 / v2 / v3）。

当前仓库的三层事实：

```text
协议层：没有 Artifact 通道        @ag-ui/core 无 ARTIFACT_* 事件
业务层：有 artifact 概念          SACS 的 SDAR Task 产出 artifacts
实现层：交付物搭乘 Activity 的车   inspection-summary ACTIVITY_SNAPSHOT
                                 + contentType/schemaVersion/payload 约定
```

"理想终态是独立 Artifact 通道"的含义：当交付物的语义需求（独立身份、版本、可寻址检索）长到 Activity 信封装不下时，协议应给它专属信封（`ARTIFACT_STARTED / SNAPSHOT / END` 事件族 + 按 ID 离线检索）。
当前用约定弥补，是最接近正确形态的近似，不是终态。

## 身份三轴：runId / messageId / artifactId

```text
runId             一次执行的身份（协议有）
activity messageId 呈现面身份（协议有）：同一 ID 的 snapshot 以 replace 语义
                  持续刷新同一块 UI 区域，run / thread 级
artifactId        交付物身份（协议缺口，理想终态）：跨 run / 跨连接可寻址、
                  可检索、可定稿
```

surface id 与 artifactId 不是同一个东西：前者是"一块可更新的 UI 区域"的身份，后者是"交付物本体"的身份。
当前实现用 activity messageId 冒充交付物身份，缺陷正是 run 级身份撑不起跨 run / 重连寻址。

SACS 的 durable 身份在业务层已经存在：durable run 三元组 `(principal, thread, runId)` 与 SDAR Task ID 即跨 run 持久身份，`getTask()` 即按 ID 检索。
缺的不是服务端能力，是协议层的一等表达。

## 契约族与最小理解面

语义靠契约，且不是一份契约，是一族契约：

| 契约 | 内容 | 谁写 | 谁读 / 校验 |
| --- | --- | --- | --- |
| 内容结构 | `contentType + schemaVersion + payload` | Agent（SACS） | Runtime 结构校验 |
| activityType 词汇 | `inspection-summary` / `a2ui-surface` / `a2ui-generation-error` | Agent 与 Runtime | Workbench |
| 呈现闭集 | Metric / StatusBadge / InfoRow | - | A2UI Renderer |
| 能力协商 | `clientCapabilities.a2ui` / `requestedMode` | Workbench | Runtime |
| 降级契约 | generation-error 事件 + 错误码 | Runtime | Workbench |
| 检查点契约 | 成功 RUN_FINISHED 触发一次、native passthrough 规则 | - | Runtime |

呈现闭集契约的载体是 `packages/a2ui-catalog`，Workbench 与 Runtime 引用同一来源，防止消费生态内部的理解漂移。

契约多却不失控的原因：每方只理解自己那一薄片。

```text
Agent          写契约字段，不需要知道前端有什么组件
Runtime        只做结构校验，不理解业务语义（never inspects natural language）
Secondary LLM 唯一读业务内容做转换的角色（受控边界内）
Workbench      只理解呈现词汇（Catalog），不理解 contentType 的业务含义
Catalog        闭集不含业务字段（domain fields intentionally absent）
```

业务语义全程只出现在两处：Agent 的 payload 内容层，和 Secondary LLM 的受控输入。
它永远不进入 Runtime、不进入 Catalog、不进入模式结构。

契约族的存在不是为了减少契约数量，而是让每一方的理解面最小化：契约多而薄，好过契约少而厚。
若某份契约开始膨胀（例如 Runtime 需要理解业务字段才能工作），那是 Runtime 滑向已删除 Runtime Platform 的信号。

## 契约由谁理解：HTTP 类比

生产侧按契约写（声明"我这是什么"），消费侧按契约读（决定"怎么呈现"），契约定义在应用生态文档里，不定义在协议里。

| HTTP 世界 | 本系统 |
| --- | --- |
| 服务器写 `Content-Type: text/html` | SACS 写 `contentType: "inspection-summary"` |
| 浏览器读 Content-Type，分发到内置渲染器 | Workbench 前端读 activityType / contentType，分发到已注册渲染器 |
| 未知类型触发下载 / 裸显示 | 未知 contentType 显式降级（纯文本 / Inspect 裸 JSON / "无契约边界"标记） |
| IANA 公共注册表 | Catalog + 受控契约，应用生态内的闭集 |

与 HTTP 的关键差异是闭集：只有消费端已注册渲染器的类型才可能被呈现，未知类型显式降级，生产端不能单方面推送新呈现形态。
这是受控渲染安全边界的实现方式，不是缺陷。

系统比 HTTP 多一个角色：Runtime 的 Presentation Policy 相当于会做校验和转换的代理（校验结构、在检查点转换内容、缝合合成事件）。

## schemaVersion 随数据走，不能外包给 Runtime

版本是关于"数据形状"的事实，事实只能归生产者。
Runtime 可以配置"我支持哪些版本"，但无法声明"你产的是哪个版本"。

决定性论据是 durable replay：

- 事件比配置活得久；
- 重放半年前的事件流时，Runtime 的"当前版本"配置无法解释旧 payload；
- 版本随数据走，历史数据才能被安全解释。

schemaVersion 不是 UI 耦合，是数据自描述，其服务对象是任何未来的消费方（另一个 Agent、审计日志、下游数据库、前端）。
Agent 的"脱离 UI"靠的是不输出呈现语义（组件、布局、主题、呈现意图），这一点当前已经成立；把 schemaVersion 挪走换来的自由是零，付出的代价是事实错位加 replay 不可用。

契约是 opt-in 的：想做受控交付物，三字段（contentType / schemaVersion / payload）是入场费；不想被呈现，就只发 TEXT_MESSAGE。
入场费买到的是消费侧的可演进性。

## 呈现生成的确定性边界

Secondary LLM 的智能被围在四堵确定性墙里：

| 墙 | 约束 | 实现 |
| --- | --- | --- |
| 触发 | 协议事实，不问内容 | 成功 RUN_FINISHED 才触发 |
| 输入 | 结构已校验的受控内容 | contentType / schemaVersion / payload |
| 输出 | 闭集 | 必须落在 Catalog 内，否则丢弃 |
| 时机 | 终态 | 内容定稿后才转换 |

LLM 本身是非确定性的，用它的理由是"内容到呈现的映射需要判断"。
墙保证的是非确定性的爆炸半径有限：失败可降级、可测试（e2e 用确定性 fake 替代真实 Secondary LLM）。

Run 过程中的呈现走确定性通道，理由有四条：

1. 时延：LLM 调用秒级，进度更新高频流式，套 LLM 等于卡顿；
2. 成本：一个 run 几十次进度更新就是几十次调用；
3. 稳定性：草稿内容反复变化，LLM 每次生成形态可能不同，固定组件靠 replace 语义平滑更新；
4. 没必要：进度到 UI 的映射是显然的，LLM 的价值密度在于映射不显然的地方。

完整分工：

```text
run 过程中：  固定受控组件 / 协议原生渲染 / 前端工具调用的可见效果   确定性
run 定稿后：  Secondary LLM 在闭集内生成 a2ui-surface              受控智能
```

交互与 UI 呈现是不同的层：交互模式是对话层（谁发起、谁等待、生命周期闭环），UI 是呈现层。
locateDevice 是交互（工具中介行动），地图变化只是它在呈现层的投影。

## 事件合成的三条纪律

Runtime 在 `RUN_FINISHED` 检查点的完整动作（`apps/copilot-runtime/src/presentation-policy.ts`）：

```text
Agent (SACS) 输出：
  ACTIVITY_SNAPSHOT { messageId, activityType: "inspection-summary",
                       content: { contentType, schemaVersion, payload } }
        ↓
Runtime Presentation Policy 拦截，扣下 RUN_FINISHED：
  - 校验业务 content 结构
  - 交给 Secondary LLM 转换
  - 以 Runtime 自己的名义合成全新事件：
  ACTIVITY_SNAPSHOT { messageId: "dynamic-a2ui-${runId}",   <- Runtime 生成，agent 无感知
                       activityType: "a2ui-surface",
                       content: { operations } }
  - 补发被扣住的 RUN_FINISHED
        ↓
Workbench 按 activityType 分发渲染
```

三条纪律：

1. 生命周期事件不承载交付物（控制面 / 数据面分离）：RUN_* 只回答"运行结局如何"，交付物按引用关联，永远不按值内嵌。禁止把 a2ui-surface 内容挂到 RUN_FINISHED 上。
2. 事件流是不可变日志：中间件对流的合法操作只有透传、扣留、追加，永不改写已发生的事件。禁止把 operations 注回 agent 的原始事件。
3. 呈现留在数据面（流内交付）：一切可呈现的内容必须是流内事件，不走流外旁路。禁止 run 结束后另发 HTTP 请求取呈现。

三条纪律各自保护的能力：

- 纪律 1 保护终局语义：interrupt / error / replay 等组合状态不会把终局事件的 schema 撕裂；
- 纪律 2 保护审计与降级：Inspect 审计、durable replay、降级路径（original content is preserved）全部依赖事件原样；
- 纪律 3 保护重连一致：重放 / 重连后呈现一致，呈现逻辑只需在一处实现。

合成新事件是三条纪律同时成立时唯一的解，不是比较出来的最优，而是排除法剩下的唯一种子：

```text
中间件想"把生成的呈现送进 run 的产出"，动作空间共四种：

改写 RUN_FINISHED 挂 result     违反纪律 1
改写业务事件注入 operations      违反纪律 2
流外旁路交付呈现                 违反纪律 3
追加合成新事件                   唯一幸存
```

且纪律 1 还约束了追加的形态：合成的必须是数据面事件（ACTIVITY_SNAPSHOT），不能是生命周期事件。

## hold 机制与封底语义

Secondary LLM 确实在收到 RUN_FINISHED 之后才调用（上游视角），但下游看到的是 a2ui-surface 出现在 RUN_FINISHED 之前。

```text
上游（agent 视角）                     下游（Workbench 视角）
──────────────────────────            ──────────────────────────
ACTIVITY_SNAPSHOT (inspection-summary)  -> 原样透传
RUN_FINISHED (success)                  <- 被扣下，不转发
（上游流 complete）
   ↓ 此时才调 Secondary LLM
   ↓ 转换完成
                                           ACTIVITY_SNAPSHOT (a2ui-surface) <- 合成事件先到
                                           RUN_FINISHED (success)           <- 最后才放行
```

RUN_FINISHED 是事件流的封底，消费端的契约是"句号之后流即完整"。
若句号先到、内容后补，消费端要处理"run 结束后又冒出新事件"的乱序。
Runtime 想在句号前插入一段话，只能先把句号扣住，写完，再放行。

被 hold 换来的代价是下游看到 run 终结的时延增加一次 LLM 调用的时长，换来的是事件序正确：surface 必须先于 run 终结进入流。

## 与当前实现的对照

| 本文论点 | 实现位置 |
| --- | --- |
| 结构校验而非语义理解 | `apps/copilot-runtime/src/presentation-policy.ts` 的 `serializeControlledBusinessActivity` |
| 成功检查点判定 | 同文件 `isSuccessfulRunFinished` |
| 合成事件与 messageId 约定 | 同文件 `dynamic-a2ui-${runId}` 与 `a2ui-surface` activityType |
| hold / 补发机制 | 同文件 `heldFinished` 与 `complete` 回调 |
| 可检查契约事件集（不含 RUN_FINISHED） | `apps/web-workbench/src/inspect/turn-inspection.ts` 的 `CONTRACT_ARTIFACT_EVENT_TYPES` |
| RUN_FINISHED 仅在 interrupt 或带 result 时算 hasArtifact | 同文件 `runFinishedFacts` |
| 呈现闭集单一来源 | `packages/a2ui-catalog` |
| e2e 中的确定性 Secondary LLM | `apps/web-workbench/tests/e2e/secondary-llm-fake.mjs` |

## 对后续演进的含义

1. Issue #200 的验证重点之一是 durable run / getTask / artifacts 的真实语义。
   业务层持久身份（SDAR Task ID、durable run 三元组）与协议层一等表达（Artifact 事件族）之间的缺口，应在真实互操作中被显式记录，而不是被 Workbench 侧伪造掩盖。
2. 若未来需要跨 run / 重连寻址交付物，演进顺序是：显式呈现缺口 -> 验证 SACS 已有语义 -> contentType 契约内加身份字段（约定先行）-> 推动协议扩展（ARTIFACT_* 事件族）。
3. 若真实场景出现"长任务中就要看到交付物草稿的呈现"，演进方向是在 ACTIVITY_SNAPSHOT 的 replace 语义上做渐进草稿面。
   这是被场景推着走的演进，不是现在预建。
4. 跨 run 持久身份要补的不是 agent 的智能，而是协议的表达力。
   这与 Layer 2 的立场一致：泛化交互模式靠协议词汇和契约演进，不靠单个 agent 变强。

## 进入主线前的重新验证

按 `docs/research/README.md` 的使用原则，本文为非规范性输入。

若此方向准备进入主线：

1. 结合 Issue #200 的真实 SACS 互操作，重新验证 artifact 语义缺口的三层事实（协议层 / 业务层 / 实现层）；
2. 若涉及协议契约变化（如 artifactId 字段、ARTIFACT_* 事件族、schemaVersion 消费规则），新增 ADR；
3. 与 `docs/ARCHITECTURE.md` 及 ADR-0029 / ADR-0030 的 Runtime 白名单对齐后再进入实现。
