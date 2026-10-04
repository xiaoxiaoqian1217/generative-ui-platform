# 验证记录

最新双向协作实现、31项页面验证与体验方法见 [状态驱动任务面板与双向协作验证](collaboration-validation-report.md)。下文保留前两轮的历史结果及验证范围。

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

初版已逐图核查 [dynamic-choice.png](evidence/dynamic-choice.png)、[mobile-choice.png](evidence/mobile-choice.png) 及 [command-awaiting-ack.png](evidence/command-awaiting-ack.png)。截图为实际浏览器画面；外层页面有内部滚动容器，图像仅记录当前可见区域，不能解释为所有内容的完整长截图。

## 数据与边界

浏览器导出标为 `playwright-automated-clicks`，DOM导出标为 `vue-test-utils-jsdom-dom-clicks`；均有 `humanPerformanceEvidence: false`。DOM测试仅替代下载传输，业务状态和JSON序列化实际执行。39份原始动作按各自runId重放，逐一比对包括日志在内的完整状态。

观测、导航恢复及设备回执仍是模拟输入。测试不证明真实UGV/UAV的感知、导航、失联处置或执行能力，也不证明真实战场效能、交互效率改善或专利新颖性。尚未进行真人对照、真实设备试验或完整专利查新。说明书中的技术效果按这些限度描述。

## 2026-10-04增量：说明书补图证据（UTC）

本次仅新增采集用例、证据来源校验脚本及验证材料，没有修改应用业务源文件。采集时应用源文件与提交 `e400e2dbfb857f7900782d7ce21301a7d4adc8c5` 完全一致；源文件SHA256及采集脚本SHA256保存在 [capture-manifest.json](evidence/patent-figures/capture-manifest.json)。初版的199项单元、24项新路由及68/69项全量回归结果作为历史记录保留，本次没有重报全量通过。

| 增量检查 | 实际结果 | 原始依据 |
| --- | --- | --- |
| 说明书图4/5/6的浏览器采集 | 3/3通过，七个检查点 | [browser-capture-results.json](evidence/patent-figures/browser-capture-results.json) |
| 新原始导出逐动作重放 | 7/7完整状态及日志相同 | [export-replay-results.json](evidence/patent-figures/export-replay-results.json) |
| PNG/原始JSON/清单/代码来源与分组绑定校验 | 7/7通过 | [capture-verification-results.json](evidence/patent-figures/capture-verification-results.json) |

新增两份TypeScript文件的单独类型检查及格式检查通过；增量lint为0个错误、7个非空断言警告。修改后的仓库Markdown检查为94个文件、0个错误。

七张截图是大尺寸真实视口中的完整实验页面元素，不是拼接画面。逐图检查确认仿真标识、中文、关联地图、任务步骤、旧请求处理状态和暂停命令/设备卡可读。初次采集发现环境中文字体缺失，安装Noto Sans SC并启动新浏览器重新采集；最终目录只保留重捕后与清单一致的七组PNG/JSON。

图5的三个时点绑定同一runId及 `request:stale-b`，请求版本一直为v1；主动修改使计划及关联步骤版本改变，并使旧请求失效。旧答复拒绝后，计划、步骤、道路和约束保持修改后的值。图6的三个时点绑定同一runId及 `pause:ui-response-5`，分别显示排队/离线/执行未知、已发送/在线/执行未知、设备已确认/在线/已暂停；恢复链路没有直接更新执行为暂停。

初版 [command-awaiting-ack.png](evidence/command-awaiting-ack.png) 未拍到设备及命令卡，不能独立作为“发送仍未确认”的视觉证据。本次使用 [figure-6-command-sent-awaiting-ack.png](evidence/patent-figures/figure-6-command-sent-awaiting-ack.png) 及对应原始JSON和清单补齐。旧39份导出及重放结果保持不变，新7份保存在独立子目录。

本次浏览器及重放命令分别在 `apps/web-workbench` 和仓库根目录执行；浏览器环境与前述相同：

```sh
WORKBENCH_CHROMIUM_PATH=/workspace/scratch/8449a05e434b/tools/stable/chrome-headless-shell-linux64/chrome-headless-shell WORKBENCH_CHROMIUM_NO_ZYGOTE=1 INTERVENTION_LAB_PATENT_EVIDENCE_DIR=/workspace/scratch/8449a05e434b/repo/docs/validation/intervention-lab/evidence/patent-figures PLAYWRIGHT_JSON_OUTPUT_NAME=/workspace/scratch/8449a05e434b/repo/docs/validation/intervention-lab/evidence/patent-figures/browser-capture-results.json CI=1 ./node_modules/.bin/playwright test intervention-lab-patent-evidence.spec.ts --workers=1 --reporter=line,json
node --import tsx apps/web-workbench/scripts/verify-intervention-exports.ts docs/validation/intervention-lab/evidence/patent-figures
node --import tsx apps/web-workbench/scripts/verify-intervention-captures.ts docs/validation/intervention-lab/evidence/patent-figures
```

新原始JSON是页面实际下载字节，自动操作来源和 `humanPerformanceEvidence: false` 在采集清单中关联声明，未为了添加驱动标识改写原始下载。截图先于导出，导出仅更新通知及交互记录；截图前后的模型状态相同。清单保留截图时的通知，不能将导出后的通知误标为截图中的文字。更详细的对应关系和Windows复测示例见 [截图证据说明](evidence/patent-figures/README.md)。
