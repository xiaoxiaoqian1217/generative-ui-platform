# 说明书界面示意图的原型证据

本目录保存图4、图5、图6所依据的实际浏览器截图、页面原字节下载JSON和采集清单。界面为本地确定性仿真，未连接真实设备或LLM。图5、图6分别在同一次运行中连续采集三个时点，不能将其解释为真人测试或实装运行。

## 截图与检查点

每个名称同时对应 `.png` 截图和 `.json` 原始导出。

| 名称 | 案例及事件游标 | 截图应表达的事实 |
| --- | --- | --- |
| [figure-4-choice-pending](figure-4-choice-pending.png) | navigation-failure，3/11 | 道路B未查明，步骤B执行失败；关联选择请求 `failure:ui-event-3` 待处理、v1，地图、请求和步骤均完整显示 |
| [figure-5-before-constraint](figure-5-before-constraint.png) | constraint-stale，5/11 | `request:stale-b` 待处理、v1；计划v1，步骤B待执行、v1 |
| [figure-5-after-constraint](figure-5-after-constraint.png) | 同上，5/11 | 主动排除B后计划v2，步骤B取消、v2；同一请求失效，请求版本仍为v1；道路A观测保留 |
| [figure-5-old-response-rejected](figure-5-old-response-rejected.png) | 同上，5/11 | 旧答复被拒绝，通知和日志可见；请求保持失效，计划、步骤、道路及约束没有被旧答复改写 |
| [figure-6-command-queued](figure-6-command-queued.png) | link-command-ack，4/9 | `pause:ui-response-5` 排队；链路离线，设备执行未知 |
| [figure-6-command-sent-awaiting-ack](figure-6-command-sent-awaiting-ack.png) | 同上，6/9 | 同一暂停命令已发送、等待确认；链路恢复，设备执行仍未知，最后确认位置和时刻保留 |
| [figure-6-command-acknowledged](figure-6-command-acknowledged.png) | 同上，7/9 | 匹配该命令的模拟设备回执到达后，命令已确认，设备显示已确认暂停 |

游标统计案例队列位置；人工操作也进入 `inputActions` 和日志，因此游标不等于动作数量。图6恢复前还跳过了案例脚本中的人工暂停答复，真实答复由页面按钮操作完成。设备回执来自明确的模拟事件。

## 来源与完整性

[capture-manifest.json](capture-manifest.json) 记录每张截图对应的案例、runId、请求对象、计划和关联对象版本、命令与设备状态、动作数量、最后动作及日志、采集时间、浏览器版本、截图边界、必须完整可见的区域，以及PNG和原始JSON的SHA256。采集时应用源文件与代码提交 `e400e2dbfb857f7900782d7ce21301a7d4adc8c5` 的字节一致；清单同时记录采集测试脚本SHA256。

使用1480px宽的实际视口，按真实内容高度调整视口，直接截取完整实验页面元素；没有修改DOM、应用CSS或注入组件状态，没有拼接画面。中文字体由环境中的Noto Sans SC提供，字号、布局和业务状态沿用应用。最终七张截图已逐图检查中文可读性、地图及步骤完整性、旧请求拒绝通知/日志和设备/命令状态卡。

先截图，再点击页面导出按钮并保存实际下载字节。导出会更新页面通知和交互记录，不改变模型状态；采集前后的完整模型状态已断言相同。清单单独标明自动操作驱动和 `humanPerformanceEvidence: false`，原始下载JSON保持未改写。

[browser-capture-results.json](browser-capture-results.json) 保存3/3采集用例实际结果；[export-replay-results.json](export-replay-results.json) 保存7/7新原始导出的逐动作重放结果；[capture-verification-results.json](capture-verification-results.json) 保存7/7截图哈希、像素尺寸、原始导出字段、代码来源及同组运行绑定的交叉校验结果。哈希和边界校验不代替人工视觉核查。

## 复测

仓库规定Node 24、pnpm 10.13.1。正常E2E运行将截图写到被忽略的 `apps/web-workbench/test-results/patent-figures`；只有显式指定目录才更新证据。本目录已经审定的证据应保留；新一轮复测建议使用另一个目录。

Windows PowerShell示例，在 `apps/web-workbench` 工作目录执行，前置依赖构建沿用仓库E2E流程：

```powershell
pnpm build:e2e
$env:INTERVENTION_LAB_PATENT_EVIDENCE_DIR = Join-Path $PWD 'test-results/patent-figures-review'
pnpm exec playwright test intervention-lab-patent-evidence.spec.ts --workers=1
node --import tsx scripts/verify-intervention-exports.ts $env:INTERVENTION_LAB_PATENT_EVIDENCE_DIR
node --import tsx scripts/verify-intervention-captures.ts $env:INTERVENTION_LAB_PATENT_EVIDENCE_DIR
```

默认浏览器沿用已有Playwright配置，可按仓库约定安装或指定Chrome。Linux采集前须确保系统字体覆盖页面中文；Windows不调用 `fc-list`。本次实际环境及启动命令见上级 [validation-report.md](../../validation-report.md)。

说明书中的黑白界面示意图依据这些状态提炼，标注为仿真实施例；不能据此声称真实设备能力、战场效能、布局效率提升或专利新颖性。
