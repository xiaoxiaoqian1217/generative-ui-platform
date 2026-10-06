# 智能体协同介入原型验证

基于 `dev_1.0` 的 `623adb01b734468978a5a4c68c2bdc1add3b9d55`，新分支为 `patent/interaction-validation`。前端目录为 `apps/web-workbench`，新增路由 `/intervention-lab`。

## 实验范围

本页是虚构街区道路探查的确定性仿真。默认通过真实 HTTP POST 与 SSE 连接自行实现的规则驱动薄 Agent：执行端在独立 Node 进程中维护任务、调度步骤、请求人工输入并处理顺序调整；前端使用原生 AG-UI SDK 接收状态并持续更新同一任务面板。设备动作和观测反馈仍为模拟数据，没有连接真实设备、Nav2 或 LLM。

“本地回放”是显式保留的旧验证方式，执行逻辑运行在浏览器里，不使用 AG-UI。新增网络验证只支持“补充观测点”和“调整查验优先级”两条协作路径，其他历史案例在本地回放中核查。页面不执行任意自然语言指令。

用户目标是查明道路通行情况并保留未查明路段。A/B/C 为本实验计划中的示意道路，不是自动追加给用户的必检约束。局部绕行成功时继续执行；恢复耗尽且 fixture 明确没有可执行替代分支时，依据列出的应用约定形成请求。导航失败不直接表示道路阻断。

## 核查重点

| 机制 | 可复测行为 |
| --- | --- |
| 输入结构 | 审批值、选项、字段、命令分别驱动确认、选择、补充、控制 |
| 请求绑定 | 同一请求关联道路、步骤、实例和相关对象版本，供地图及操作组件共用 |
| 旧答复 | 错误实例、请求版本、相关对象版本、失效状态及重复答复均拒绝 |
| 无关更新 | 无关道路的变化不使其他请求失效 |
| 主动修改 | 可以修改关联后续步骤；修改运行中步骤须先收到暂停执行回执 |
| 执行事实 | 排队、已发送和设备确认分别显示；恢复链路不直接表示暂停成功 |
| 观测事实 | 延期、取消、接受部分结果不生成道路观测 |
| 对照布局 | 固定与动态组织共享同一状态、事实、输入与处理器，只改变组织及聚焦 |

## 案例与闭环

网络验证中，A 路缺少观测点时，薄 Agent 保存请求并以 AG-UI 中断结果结束协议运行。人工答复经同一会话的新运行恢复，合法观测点写入参数，后续模拟观测才读取它并生成证据。人工主动优先安排 C 路，经业务命令接口更新服务端待执行顺序；之后服务端实际按 A、C、B 推进，对照路径按 A、B、C 推进。

历史六个基础案例包括正常与绕行、导航失败、主动修改和过期答复、拒绝调整、补充范围及失联回执。它们使用本地回放；重试和拒绝变更的其他分支通过明确标注的成功 fixture 逐步继续。成功 fixture 仅检验状态闭环，不证明真实恢复成功。

页面默认选择薄 Agent 和逐步核对。下一事件按钮只要求服务端推进，前端不能提交观测或完成事实；取消逐步核对后由服务端定时自动推进。网络模式导出包含服务端状态修订号、实际输入、处理日志和 AG-UI 事件。业务任务 ID 与协议 `threadId`、每次协议 `runId` 分别管理；中断结束不代表业务任务完成。

连接中断后保留最后确认状态，主动调整不可用。重连先读取最新服务端快照，再恢复该任务的事件流，不重放旧命令。任务只保存在验证服务内存中；服务重启后不能恢复。暂停、排除道路等历史操作仅在本地回放可用。

## 本地运行与复测

使用仓库规定的 Node 24 和 pnpm 10.13.1：

```sh
pnpm install --frozen-lockfile
pnpm build
```

打开两个终端，分别启动薄 Agent 与前端：

```sh
pnpm dev:intervention-agent
pnpm dev:web-workbench
```

浏览器访问 `http://localhost:5173/intervention-lab`。薄 Agent 默认监听本机 `4802` 端口，Vite 将 `/api/intervention-agent` 转发到它；不需要启动 AGUIMock、CopilotKit Runtime 或外部 Agent。本页直接复用原生 `HttpAgent`，业务状态不放入 Runtime。

独立模型复测和检查：

```sh
node --import tsx apps/web-workbench/scripts/verify-intervention-lab.ts docs/validation/intervention-lab/evidence
pnpm --filter @generative-ui/web-workbench test
pnpm typecheck
pnpm lint
pnpm docs:lint
```

标准浏览器检查沿用仓库已有 `test:e2e`。若使用自备 Chromium，可以用 `WORKBENCH_CHROMIUM_PATH` 指定完整可执行路径；限制进程环境可设 `WORKBENCH_CHROMIUM_NO_ZYGOTE=1`，仅影响测试启动。完整命令与实际结果见 [validation-report.md](validation-report.md)。

新增薄 Agent 的网络实现、复测命令和验证结果见 [network-validation-report.md](network-validation-report.md)。它与历史本地回放报告分别记录。

## 证据与解释限度

[evidence](evidence) 保存原始结果和导出；其中浏览器按钮操作由 Playwright 驱动，明确标注 `humanPerformanceEvidence: false`。`interactive` 描述页面交互输入通道，不能解释为真人参与者。浏览器记录的耗时不作为布局效率差异或认知负荷改善的证据。

说明书补图所依据的七个实际检查点，见 [patent-figures](evidence/patent-figures/README.md)。其中图5、图6按同一次运行连续采集，原始下载JSON不改写，自动操作来源和文件SHA256由独立清单绑定。正式说明书使用依据原型状态提炼的界面示意图，实际截图用于复测证据。

功能通过仅说明这些设定输入下的实现行为。薄 Agent 是本机开发验证服务，不是产品业务 Agent；没有实际设备接入、物理导航验证、用户身份认证或跨用户持久恢复能力。历史截图和报告仍对应原本的本地回放，不作为新增网络链路的证据。接入真实系统需相应实现与测量。

[prior-art.md](prior-art.md) 记录初步现有技术检索。地图协同、人工中断恢复、输入驱动表单及过期审批已有公开基础；本稿围绕关联、校验及执行反馈组合撰写，未证明新颖性、创造性或授权可能性。
