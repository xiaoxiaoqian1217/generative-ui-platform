# 状态驱动任务面板与双向协作验证

本轮原型验证了两条协作路径：模拟Agent发现缺少执行参数后请求人补充；人在Agent执行过程中主动调整后续步骤。人的输入写入任务参数或调度顺序，后续模拟执行读取修改后的状态，同一任务面板持续显示执行结果。

入口为 `/intervention-lab`。原型使用一台模拟UGV、三条虚构道路和确定性事件；没有连接真实设备、LLM或真实业务Agent。这里验证的是协作输入能否接回执行，不能据此推断真实任务能力、完成质量或人员效率的提升。

## 怎样体验原型

在Windows PowerShell中进入仓库根目录，执行下列命令，再打开 `http://localhost:5173/intervention-lab`：

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dev:web-workbench
```

默认案例是Agent请求补充观测点。点击开始，然后逐次推进仿真事件；出现请求后，选点并提交，再推进后续反馈。观察“协作之后，任务怎样变化”如何先显示参数已应用，再显示道路结果。

切换到主动调整优先顺序案例并重新开始。推进到A正在执行时，在主动调整区域选择C并应用。继续推进，面板会显示A完成后实际开始C，随后再执行B。

## 这次实现和检查的行为

任务面板持续显示任务目标、当前步骤、完成进度和已查明范围。任务顺序、下一调度步骤、Agent请求和人工贡献使用同一任务状态更新。动态组织会在请求待处理时突出请求，在协作输入已应用后突出输入及后续反馈。

| 协作过程 | 实际检查结果 |
| --- | --- |
| Agent请求补充A路观测点 | 参数状态为 `requested`，请求待处理；页面的下一事件和自动回放不可用，道路A保持未查明 |
| 人提交空选择 | 模型拒绝答复，请求继续待处理；任务参数、道路、步骤、设备状态和计划版本不被答复改写 |
| 人在真实页面选择北侧预设观测点 | 参数写入 `point-a-north`，请求解除、计划更新为v2并形成贡献记录；答复本身没有生成道路观测或移动UGV |
| 后续模拟观测到达 | 反馈使用所选点的坐标 `(18, 25)`，道路证据包含该点ID；首次观测时A步骤仍在执行，完成事件到达后才标记步骤完成 |
| 人在A执行中优先安排C | 计划顺序从A、B、C变为A、C、B；当前A仍执行，已有道路事实与设备状态保持 |
| 模拟调度继续 | 后续调度读取修改后的顺序，实际执行记录为A、C、B；没有人工调整的同场景实际执行记录为A、B、C |
| 两条协作路径结束 | 都在明确的模拟观测与完成反馈后取得三条道路结果并结束；面板保留人工输入与相应步骤反馈 |

预设观测点代表案例中可提供的参数选项，其安全性、可达性和现实有效性没有被本实验验证。优先顺序案例检查实际调度变化，未测量哪一种顺序更好。旧请求校验、未知事实保留和命令回执约束继续由既有功能回归覆盖。

## 验证结果与范围

2026年10月4日，在最终界面修订后重新构建测试模式并执行以下三个Playwright文件，结果为31/31通过，0跳过、0失败、0不稳定重试，实际耗时约32.29秒：

- `intervention-lab.spec.ts`：21个检查，包含八个案例的两种组织方式，以及组织切换、状态保留、移动布局和既有路由检查。
- `intervention-lab-branches.spec.ts`：7个既有分支检查。
- `intervention-lab-collaboration.spec.ts`：3个新增检查，覆盖补充请求及空答复边界、主动优先C和不调整的调度对照。

[browser-results.json](evidence/collaboration-v2/browser-results.json) 保存这次实际运行结果。本轮浏览器检查范围为上述三个文件，没有重新运行Workbench全部业务E2E或历史专利截图采集文件。

最终源码另经生产构建7/7任务、类型检查11/11任务、Workbench单元检查218/218用例验证。实际输出保存在 [build-output.txt](evidence/collaboration-v2/build-output.txt)、[typecheck-output.txt](evidence/collaboration-v2/typecheck-output.txt) 和 [unit-results.json](evidence/collaboration-v2/unit-results.json)。八个案例的确定性双重重放也一致，见 [model-replays.json](evidence/collaboration-v2/model-replays.json)。这些结果分别检查工程构建、静态类型与既定逻辑，含义与真实业务评测不同。

新增证据包括同一次运行内连续取得的观测点协作四个检查点、优先顺序协作四个检查点，以及另一次运行的默认顺序对照。八张截图直接截取实际页面，九个JSON均由页面导出按钮下载，原字节保持完整。测试仅通过可见控件提交人的输入；案例中的人工脚本答复没有代替这些操作。

| 核验 | 结果及证据 |
| --- | --- |
| 原始动作重放 | 9/9导出的完整状态一致，见 [export-replay-results.json](evidence/collaboration-v2/export-replay-results.json) |
| 截图和原始导出交叉核对 | 8张PNG哈希及像素尺寸、9个JSON字段及哈希、三组运行绑定全部匹配，见 [capture-verification-results.json](evidence/collaboration-v2/capture-verification-results.json) |
| 当前应用源码 | 四个应用文件的当前字节与采集SHA256匹配，见同一交叉核对记录 |
| 界面视觉检查 | 最终八张图逐图核对中文、地图、持续概览、请求、协作回写和处理记录；没有关键区域裁剪，优先顺序控件能显示当前有效选项及结束空态 |

[证据说明](evidence/collaboration-v2/README.md) 给出每个检查点含义与复测命令。[采集清单](evidence/collaboration-v2/capture-manifest.json) 保留采集时的HEAD、源文件SHA256、真实页面区域、浏览器版本及原始文件哈希。采集时源码尚在工作树中修改，`matchesCodeCommit: false` 表达其与当时HEAD不同；该字段没有被改写为已提交状态。

## 能支持的结论

这轮功能验证支持：状态可以持续驱动任务面板，Agent请求与人的主动调整可以进入同一任务，所接收的人工贡献会改变后续执行所用的参数或顺序，执行反馈会回到同一面板。能力与质量的实际增益仍需要真实任务、真实Agent或设备以及人员评测。本次自动操作耗时也不能当作真人使用效率证据。
