# 智能体协同介入原型验证

基于 `dev_1.0` 的 `623adb01b734468978a5a4c68c2bdc1add3b9d55`，新分支为 `patent/interaction-validation`。前端目录为 `apps/web-workbench`，新增路由 `/intervention-lab`。

## 实验范围

本页是城市受损区域道路探查的本地确定性仿真。街区、道路、导航反馈和设备回执均为 fixture，未连接真实设备、Nav2、LLM 或真实 AG-UI 服务；不是某次战场行动的复原。实验目标是验证介入处理、对象关联和状态一致性。页面不会从说明文字执行任意自然语言指令。

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

六个基础案例包括正常与绕行、导航失败、主动修改和过期答复、拒绝调整、补充范围及失联回执。重试和拒绝变更的其他分支通过明确标注的成功 fixture 逐步继续；新增事件及原始动作进入导出记录。成功 fixture 仅检验状态闭环，不证明真实恢复成功。明确结束后停止剩余事件，未查明事实继续保留。

页面提供案例推进、手动答复、主动约束、旧答复探针及 JSON 导出。导出包含当前状态、实际执行事件队列、实际注入动作、处理日志和交互记录。重开案例创建新的 `runId`，跨实例答复拒绝。

## 本地运行与复测

使用仓库规定的 Node 24 和 pnpm 10.13.1：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @generative-ui/web-workbench dev
```

浏览器访问开发服务的 `/intervention-lab`。独立模型复测和检查：

```sh
node --import tsx apps/web-workbench/scripts/verify-intervention-lab.ts docs/validation/intervention-lab/evidence
pnpm --filter @generative-ui/web-workbench test
pnpm typecheck
pnpm lint
pnpm docs:lint
```

标准浏览器检查沿用仓库已有 `test:e2e`。若使用自备 Chromium，可以用 `WORKBENCH_CHROMIUM_PATH` 指定完整可执行路径；限制进程环境可设 `WORKBENCH_CHROMIUM_NO_ZYGOTE=1`，仅影响测试启动。完整命令与实际结果见 [validation-report.md](validation-report.md)。

## 证据与解释限度

[evidence](evidence) 保存原始结果和导出；其中浏览器按钮操作由 Playwright 驱动，明确标注 `humanPerformanceEvidence: false`。`interactive` 描述页面交互输入通道，不能解释为真人参与者。浏览器记录的耗时不作为布局效率差异或认知负荷改善的证据。

说明书补图所依据的七个实际检查点，见 [patent-figures](evidence/patent-figures/README.md)。其中图5、图6按同一次运行连续采集，原始下载JSON不改写，自动操作来源和文件SHA256由独立清单绑定。正式说明书使用依据原型状态提炼的界面示意图，实际截图用于复测证据。

功能通过仅说明这些设定输入下的实现行为。原型没有实际设备接入、物理导航验证、网络安全准入、服务端原子事务或跨用户持久恢复能力。接入真实系统仍需相应实现与测量。

[prior-art.md](prior-art.md) 记录初步现有技术检索。地图协同、人工中断恢复、输入驱动表单及过期审批已有公开基础；本稿围绕关联、校验及执行反馈组合撰写，未证明新颖性、创造性或授权可能性。
