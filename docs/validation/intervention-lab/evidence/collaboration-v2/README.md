# 双向协作的原型截图与原始记录

本目录对应本轮状态驱动任务面板与双向协作原型。界面使用确定性仿真，未连接真实设备或LLM。Playwright通过真实页面控件操作预设观测点和优先顺序；模拟事件提供执行反馈。所有记录均标明 `humanPerformanceEvidence: false`。

## 检查点

前八个名称同时对应 `.png` 页面截图和 `.json` 原始下载。最后一个对照只保存原始JSON。

| 名称 | 该时点可核对的事实 |
| --- | --- |
| [observation-request-pending](observation-request-pending.png) | Agent请求人提供A路观测点；请求待处理、参数requested、三路均未查明，下一事件不可用 |
| [observation-empty-response-rejected](observation-empty-response-rejected.png) | 空选择经真实提交控件进入模型后被拒绝；原请求保留，输入和道路事实没有变化 |
| [observation-parameter-applied](observation-parameter-applied.png) | 人选择 `point-a-north` 后参数provided、请求解除、计划v2；A仍未查明，UGV仍在原位置，选择点只显示为参数标记 |
| [observation-feedback-received](observation-feedback-received.png) | 后续模拟观测和完成反馈到达，三条道路观测、三步骤完成；A的证据包含所选点ID及坐标，面板保留人工贡献与执行反馈 |
| [priority-before-adjustment](priority-before-adjustment.png) | A执行中、B和C待执行，原计划A、B、C，实际已开始仅A |
| [priority-adjustment-applied](priority-adjustment-applied.png) | 人主动优先C后计划v2、顺序A、C、B；A仍执行，道路证据没有因调整而产生 |
| [priority-next-C-running](priority-next-C-running.png) | A已完成、C实际开始、B仍待执行；实际已开始记录A、C，C尚未取得观测 |
| [priority-completed](priority-completed.png) | 实际执行顺序A、C、B，三条道路观测、三步骤完成；人工优先调整与相应反馈持续可见 |
| [priority-default-order-completed.json](priority-default-order-completed.json) | 同一场景没有人为调整的独立运行，实际顺序A、B、C，贡献记录为空 |

观测点四个时点属于同一个runId；优先调整四个时点属于另一同一个runId；默认顺序是独立对照运行。事件游标是案例队列位置，人工提交与记录导出不等于注入一次案例事件。完整动作及其来源以各原始JSON中的 `inputActions` 和状态日志为准。

## 采集和验证

[capture-manifest.json](capture-manifest.json) 保存各检查点的runId、事件位置、关联状态、最后动作、日志、采集时间、浏览器版本、必须完整可见的页面区域、截图像素对应边界，以及PNG和原始JSON的SHA256。实际截图为1480px宽的完整实验页面元素，视口按照真实内容高度调整；没有注入组件状态、修改DOM或应用CSS，没有拼接截图。

采集顺序为先截图，再点击导出按钮保存实际下载字节。原始JSON保持未改写，采集驱动与截图元数据放在单独清单中。导出会更新界面通知和交互记录，采集测试已断言模型状态在截图和导出前后保持相同。

每个检查点的原始动作都从对应协作模式的初始状态重新执行，并比较完整状态。[export-replay-results.json](export-replay-results.json) 记录9/9一致。[capture-verification-results.json](capture-verification-results.json) 独立核对9个原始文件、8张PNG的哈希及像素尺寸、同组运行绑定和当前四个应用源文件字节。[browser-results.json](browser-results.json) 保存本轮三个相关E2E文件的31/31结果。

最终八张图已经逐图检查中文、地图、持续概览、待处理请求、参数/顺序回写、执行反馈和处理日志的可读性与完整性。字体为Noto Sans CJK SC，浏览器为Chrome Headless Shell 154.0.8037.92。哈希和尺寸校验不能代替视觉检查。

采集时HEAD为 `d3505fe523e24bc5b2078ac9ae46877eb74503b4`，当前修改尚未提交。清单的 `matchesCodeCommit: false` 保留这一实际状态；应用源文件和采集测试脚本的SHA256用于确认本次执行的代码字节。后续提交核验应对照这些哈希，不应修改采集时记录。

## 复测

仓库使用Node 24和pnpm 10.13.1。新一轮复测输出到新的目录，保留已审定的证据。在仓库根目录用Windows PowerShell执行：

```powershell
pnpm install --frozen-lockfile
pnpm build
Set-Location apps/web-workbench
pnpm build:e2e
$env:INTERVENTION_LAB_COLLABORATION_EVIDENCE_DIR = Join-Path $PWD 'test-results/collaboration-review'
pnpm exec playwright test intervention-lab.spec.ts intervention-lab-branches.spec.ts intervention-lab-collaboration.spec.ts --workers=1
node tests/e2e/verify-collaboration-captures.mjs $env:INTERVENTION_LAB_COLLABORATION_EVIDENCE_DIR
node --import tsx scripts/verify-intervention-exports.ts $env:INTERVENTION_LAB_COLLABORATION_EVIDENCE_DIR
```

浏览器选择沿用 `playwright.config.ts`。本次Linux验证显式设置 `WORKBENCH_CHROMIUM_PATH` 为实际Chrome Headless Shell路径，设置 `WORKBENCH_CHROMIUM_NO_ZYGOTE=1`；Windows可沿用配置中已安装的Chrome。源文件字节改变后应重新构建并重新采集到新目录，才能据新的状态制作附图。

这些证据支持协作参数回写、实际调度变化和状态持续展示，不支持真实设备能力、真实Agent能力、真人效率增益或专利新颖性结论。
