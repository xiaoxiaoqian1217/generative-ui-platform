# 验证记录

日期：2026-10-03。基线：`dev_1.0`，提交 `623adb01b734468978a5a4c68c2bdc1add3b9d55`。验证对象为 `/intervention-lab` 的本地仿真，以及新增路由对现有 Workbench 的影响。

## 实际结论

| 检查 | 实际结果 | 原始依据 |
| --- | --- | --- |
| 全前端单元与 DOM 集成 | 199/199 通过，含32项模型及19项页面 DOM 集成 | [unit-results.json](evidence/unit-results.json) |
| 新路由浏览器检查 | 24/24 通过；六案例×两模式、其他答复分支、过期/重复响应、回执、390px手机布局、API隔离 | [browser-results.json](evidence/browser-results.json) 中两份 intervention-lab spec |
| 六基础案例确定性回放 | 每案例重复两次，完整状态相同 | [model-replays.json](evidence/model-replays.json) |
| 原始动作重放 | 39/39份导出逐动作重放，完整状态一致；含20份浏览器及19份DOM记录 | [export-replay-results.json](evidence/export-replay-results.json) |
| 仓库类型检查 | 通过 | [typecheck-output.txt](evidence/typecheck-output.txt) |
| 仓库生产构建 | 7/7任务通过 | [build-output.txt](evidence/build-output.txt) |
| 代码及文档检查 | lint、格式检查、docs:lint 通过；lint存在非空断言等警告 | [lint-output.txt](evidence/lint-output.txt)、[docs-lint-output.txt](evidence/docs-lint-output.txt) |
| 全量浏览器回归 | **68/69通过，1个既有用例失败，未报告全量通过** | [browser-results.json](evidence/browser-results.json) |

既有失败为 `workbench.spec.ts` 中 `scenario B reuses scenario A context and continues route B without clearing the selection`：等待 `patrol-route-consult-*` 元素15秒超时。在隔离的 `dev_1.0` 原始提交工作树中，用相同浏览器复测该用例，出现相同超时，[baseline-browser-results.json](evidence/baseline-browser-results.json) 保留原始结果。新路由的24项均通过。没有通过关闭断言、增加重试、删除旧用例或修改既有业务行为来消除这一失败。

## 执行环境与命令

Node 24.19.0，pnpm 10.13.1，Playwright 1.62.1。实际浏览器为 Google Chrome for Testing Headless Shell 154.0.8037.92，来自 [Chrome官方版本清单](https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json) 的Stable条目。受本容器socket限制，使用 `--no-zygote --disable-gpu`；未开启single-process。此配置仅用于测试，默认产品不受影响。

实际核心检查命令如下，工作目录为仓库根目录；浏览器命令工作目录为 `apps/web-workbench`：

```sh
npx --yes pnpm@10.13.1 build
npx --yes pnpm@10.13.1 typecheck
npx --yes pnpm@10.13.1 lint
npx --yes pnpm@10.13.1 docs:lint
node --import tsx apps/web-workbench/scripts/verify-intervention-lab.ts docs/validation/intervention-lab/evidence
node --import tsx apps/web-workbench/scripts/verify-intervention-exports.ts docs/validation/intervention-lab/evidence
```

```sh
INTERVENTION_LAB_EVIDENCE_DIR=/workspace/scratch/8449a05e434b/repo/docs/validation/intervention-lab/evidence ./node_modules/.bin/vitest run --reporter=json --outputFile=../../docs/validation/intervention-lab/evidence/unit-results.json
./node_modules/.bin/vite build --mode test
WORKBENCH_CHROMIUM_PATH=/workspace/scratch/8449a05e434b/tools/stable/chrome-headless-shell-linux64/chrome-headless-shell WORKBENCH_CHROMIUM_NO_ZYGOTE=1 INTERVENTION_LAB_EVIDENCE_DIR=/workspace/scratch/8449a05e434b/repo/docs/validation/intervention-lab/evidence PLAYWRIGHT_JSON_OUTPUT_NAME=/workspace/scratch/8449a05e434b/repo/docs/validation/intervention-lab/evidence/browser-results.json CI=1 ./node_modules/.bin/playwright test --workers=1 --reporter=line,json
```

基线复测采用隔离工作树，应用源文件保持上述基线提交，测试配置只指定同一浏览器路径、启动参数及单worker。执行原有用例，未改其断言或业务源文件。

## 观察到的行为

浏览器和 DOM 测试通过真实控件推进模拟事件、提交答复或主动约束。失效答复不会覆盖新计划，重复答复不重复写回；其他实验实例的响应在模型测试中被拒绝。无关更新不使请求失效。未观察道路始终保持unknown；导航失败不生成blocked事实。

暂停操作的排队、发送及回执分别断言；链路恢复后、回执到达前执行状态仍为unknown，并显示最后确认位置。运行中步骤的取消需要暂停回执。重新尝试及拒绝调整都可通过明确的分支fixture继续；提前结束停止后续注入。

固定和动态模式在同一个浏览器状态下切换，完整状态及操作选项保持相同，并断言请求区域的呈现位置变化。手机布局断言无水平溢出且操作可用。截图核查发现并修复了旧全局 `.device-card` 样式碰撞，新页面采用独立类名。

已逐图核查 [dynamic-choice.png](evidence/dynamic-choice.png)、[mobile-choice.png](evidence/mobile-choice.png) 及 [command-awaiting-ack.png](evidence/command-awaiting-ack.png)。截图为实际浏览器画面；外层页面有内部滚动容器，图像仅记录当前可见区域，不能解释为所有内容的完整长截图。

## 数据与边界

浏览器导出标为 `playwright-automated-clicks`，DOM导出标为 `vue-test-utils-jsdom-dom-clicks`；均有 `humanPerformanceEvidence: false`。DOM测试仅替代下载传输，业务状态和JSON序列化实际执行。39份原始动作按各自runId重放，逐一比对包括日志在内的完整状态。

观测、导航恢复及设备回执仍是模拟输入。测试不证明真实UGV/UAV的感知、导航、失联处置或执行能力，也不证明真实战场效能、交互效率改善或专利新颖性。尚未进行真人对照、真实设备试验或完整专利查新。说明书中的技术效果按这些限度描述。
