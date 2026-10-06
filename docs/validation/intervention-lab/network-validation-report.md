# 薄 Agent 与 AG-UI 网络验证

验证日期：2026-10-06。代码位于 `patent/interaction-validation` 分支。本报告对应新增真实 HTTP/SSE 链路；历史本地回放的结果另见 [validation-report.md](validation-report.md)。

## 实现与可观察行为

自行实现的薄 Agent 在独立 Node 进程中保存任务并调度步骤，前端通过原生 `@ag-ui/client` 0.0.57 的 `HttpAgent` 接收 AG-UI 事件。没有使用 AGUIMock 生成本次任务事件。该薄 Agent 使用确定性规则；模拟设备动作和观测反馈，没有调用 LLM。

| 用户操作或执行情况 | 服务端行为 | 面板可核查结果 |
| --- | --- | --- |
| A 路缺少观测点 | 生成请求，以原生 `RUN_FINISHED` 中断结果结束当前协议运行 | 任务等待答复，显示关联道路、步骤和选点输入 |
| 提交合法观测点 | 同一 `threadId`、新 `runId` 通过原生 `resume` 恢复，先写入执行参数 | 先显示参数已接受；道路仍未查明，后续模拟观测才显示使用该点的证据 |
| 提交空答复 | 通过 SSE 返回 `RUN_ERROR`，保留未完成请求和原任务状态 | 提示拒绝原因，仍可修改答复后重试 |
| 主动优先安排 C 路 | 命令接口校验任务修订号、操作 ID 和相关对象版本，更新待执行顺序 | 后续实际顺序为 A、C、B；无调整的对照为 A、B、C |
| 关闭逐步核对后开始 | 服务端定时调度；缺参时仍需人工答复 | 无手动推进命令也会执行到介入点，并在答复后继续 |
| SSE 实际断开 | 任务继续由服务端维护，浏览器保留最后确认状态 | 调整按钮禁用；重连先取最新快照，再为原任务建立新运行 |

主动调整通过业务命令接口提交，由同一服务端更新任务，再经 AG-UI 状态事件反馈；不把 AG-UI 描述为提供优先级调度算法。协议运行结束与业务任务完成分别处理。客户端传入的任务 `state` 不覆盖服务端状态，客户端不能提交观测或完成事实。

页面默认选择“薄 Agent”与“逐步核对”。手动推进仅请求服务端决定下一步，便于逐项观察。切换到“本地回放”可以核查原有其他场景；切换验证方式会重置面板，需要重新开始。

## 复测与结果

| 检查 | 实际结果 | 覆盖重点 |
| --- | --- | --- |
| Workbench 全部单元测试 | 39 个文件、227 项通过 | 原有模型和界面行为，以及新增网络测试 |
| 其中真实 HTTP/SSE 与客户端生命周期测试 | 9 项通过 | 中断恢复、参数消费、顺序变化、重复及过期操作拒绝、断流恢复、旧异步响应隔离 |
| 新增浏览器网络测试 | 4 项通过 | 人工补点及无效答复重试、自动推进、主动排序与对照、实际断流及重连 |
| Workbench TypeScript、服务端构建与前端测试构建 | 通过 | 类型及构建入口 |
| 仓库 lint、文档 lint、差异空白检查 | 无错误 | 仓库 lint 仍有既有风格告警 |

新增单元测试启动真实临时端口服务并使用原生 SDK。浏览器测试使用实际 HTTP/SSE 代理，断流案例关闭实际事件连接并临时返回 503；不以伪造协议事件替代网络。浏览器中的人工操作由 Playwright 自动执行，不是参与者实验。

在完成仓库依赖安装和构建后运行：

```sh
pnpm --filter @generative-ui/web-workbench test
pnpm --filter @generative-ui/web-workbench typecheck
pnpm --filter @generative-ui/web-workbench build:intervention-agent
pnpm --filter @generative-ui/web-workbench test:e2e tests/e2e/intervention-agent.spec.ts --workers=1 --output=test-results/intervention-agent-network --reporter=line,json
pnpm lint
pnpm docs:lint
git diff --check
```

本次环境使用自备 Chromium，通过 `WORKBENCH_CHROMIUM_PATH` 指定真实可执行路径，并设置 `WORKBENCH_CHROMIUM_NO_ZYGOTE=1`。这两项仅影响浏览器启动。测试保留原始下载 JSON、请求与 SSE 事件记录、服务端快照、完整面板截图及采集元数据；输出位于 `apps/web-workbench/test-results/intervention-agent-network`，由测试生成，不覆盖历史专利截图。

## 启动和验证边界

按 [README.md](README.md) 在两个终端分别运行 `pnpm dev:intervention-agent` 与 `pnpm dev:web-workbench`，访问 `http://localhost:5173/intervention-lab`。不需要外部可用 Agent。本页不需要启动 AGUIMock 或 CopilotKit Runtime。

本次结果证明，在设定的仿真任务中，人工输入被服务端接受并被后续执行消费，主动排序改变了后续实际步骤。它不证明真实设备执行、LLM 推理能力、目标完成质量提升或用户效率改善。任务只保存在本机验证服务内存中，服务重启后不能恢复；该服务用于开发验证，没有用户认证或跨用户持久恢复能力。
