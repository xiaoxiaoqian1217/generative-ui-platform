<!-- cspell:words Shapefile -->

# Felt 地图域意图参考

- **性质：** 非规范性研究笔记
- **日期：** 2026-08-20
- **目的：** 使用 Felt 官方公开资料校验地图域意图的分类、粒度与状态边界

## 结论摘要

Felt 可以作为地图能力分类和交互原语的参照，但不能直接作为当前 Agent 工具清单的模板。
Felt 官方对 MCP Server 公开的是约 30 个工具和 6 个类别，没有在当前公开页面逐项给出全部 MCP 工具的名称与参数。
这 6 类是 Make maps、Bring in data、Write SQL、Run spatial analysis、Style automatically 和 Collaborate。
其中与当前验证最相关的是视口控制、样式与可见性、标注几何、选择和协作，取数、SQL 与完整空间分析不属于当前薄 Agent 的首轮范围。[Felt MCP Server 发布页](https://felt.com/blog/introducing-felt-mcp-server)

Felt JavaScript SDK 公开了精确的方法名，可以用于校验当前地图域意图背后的浏览器地图原语。
这些 SDK 方法不是 Felt MCP 工具名，也不应在文档中被描述为 MCP 工具。

对当前方案最重要的判断是：

> 保留 `focusOn`、`highlight`、`setLayerVisibility` 和 `previewPath` 作为 Agent 面向的地图域意图，同时使用 Felt 的精确 SDK 原语检查每个意图是否有清晰的可见结果、临时状态和清理边界。

## 资料边界

本笔记只使用 Felt 官方开发者文档、官方产品发布页和 Felt 官方 GitHub 组织中的资料。
截至 2026-08-20，Felt MCP 官方发布页只公开能力类别、数量和示例工作流，没有公开完整的逐工具 schema。
因此，下文把内容分成“官方事实”和“对当前项目的推断”，不根据营销示例猜测 MCP 的内部工具名。

## Felt MCP 的公开能力边界

### 官方事实

Felt MCP Server 被描述为一个 endpoint、约 30 个工具和 6 个工具类别。[Felt MCP Server 发布页](https://felt.com/blog/introducing-felt-mcp-server)

| 类别 | 官方描述 | 与当前验证的关系 |
| --- | --- | --- |
| Make maps | 创建、更新和组织地图与项目，共 5 个工具 | 当前不需要创建地图或项目，但可参考地图作为持续可编辑表面的产品语义 |
| Bring in data | 引入 ArcGIS、WMS、GeoJSON、Shapefile、公共库和云数据，共 5 个工具 | 超出首轮地图交互验证 |
| Write SQL | 面向 Snowflake、BigQuery、Databricks、Postgres 和 Redshift 编写查询，共 6 个工具 | 超出首轮地图交互验证 |
| Run spatial analysis | 查询、连接、过滤地图图层并生成结果，共 5 个工具 | 只有未来真实场景需要空间分析时再单独论证 |
| Style automatically | 分类、数值、热力和 H3 样式，共 2 个工具 | 可参考意图化样式，但当前不向 Agent 暴露样式 JSON |
| Collaborate | 通过 GeoJSON 创建 pins、routes、polygons 和 notes，共 7 个工具 | 与临时路线、区域标注和用户继续编辑最相关 |

Felt 强调每次 Agent 操作产生可见、可编辑的地图产物，并继承当前用户的工作区权限。[Felt MCP Server 发布页](https://felt.com/blog/introducing-felt-mcp-server)
这支持“地图是共享表面”的方向，但官方公开材料没有给出混合主导、打断、状态所有权或撤销冲突的具体协议。

### 对当前项目的推断

当前工具面不需要覆盖 Felt 的完整 GIS 工作流。
Felt 的价值主要是证明地图能力可以按视口、图层、样式、几何、选择与协作等稳定地图概念组织，而不是按巡逻、设备、事件或任务等业务对象组织。
当前项目仍应让工具随验证场景入场，不能因为 Felt 有约 30 个工具就扩展成通用 GIS Agent SDK。

## JavaScript SDK 中可核验的地图原语

### 视口与聚焦

#### 官方事实

`getViewport()` 读取当前中心点和缩放级别。
`setViewport()` 将地图动画移动到指定中心点和缩放级别。
`fitViewportToBounds()` 自动调整视口以容纳一个矩形范围。
`onViewportMove()`、`onViewportMoveEnd()` 和 `onMapIdle()` 分别观察视口变化、移动结束和地图完全稳定。[ViewportController](https://developers.felt.com/js-sdk-api-reference/viewport/viewportcontroller)

`setViewportConstraints()` 可以限制用户可平移和缩放的范围，并可通过传入 `null` 移除约束。[ViewportController](https://developers.felt.com/js-sdk-api-reference/viewport/viewportcontroller)

#### 对当前项目的推断

Felt 没有公开名为 `focusOn` 的通用 SDK 方法。
`focusOn` 适合作为当前 Agent 面向的高层地图意图，由 Workbench 将一个或多个 `MapTargetRef` 解析为范围，再在内部选择视口实现。
这个抽象能够避免向 Agent 泄漏中心点、缩放级别、边界 padding 和动画参数。

`onViewportMoveEnd()` 和 `onMapIdle()` 提示当前 `focusOn` 的完成语义不应只表示动画已经发起。
Workbench 应在用户可感知的视口动作结束或被打断后再返回明确结果。

### 图层可见性、过滤与样式

#### 官方事实

`setLayerVisibility()` 使用 `show` 和 `hide` ID 列表批量显示或隐藏图层。
Felt 还提供 `setLayerGroupVisibility()`、`setLegendItemVisibility()` 和 `setElementGroupVisibility()`，说明可见性在图层、图层组、图例项和标注组上具有不同作用域。[Hiding and showing](https://developers.felt.com/js-sdk/hiding-and-showing)

`setLayerStyle()` 使用 Felt Style Language 修改图层样式。
这个修改只在当前会话生效，官方示例先读取旧样式，以便应用临时样式。[LayersController](https://developers.felt.com/js-sdk-api-reference/layers/layerscontroller)

`setLayerFilters()` 设置临时过滤条件，并可在图例中显示说明和重置按钮。[LayersController](https://developers.felt.com/js-sdk-api-reference/layers/layerscontroller)

#### 对当前项目的推断

`setLayerVisibility` 与 Felt SDK 的精确方法名一致，也符合地图域而不是业务域。
当前契约可以借鉴 `show` 和 `hide` 的批量结构，使一次调用能够表达一个一致的可见性终态，而不必为每个图层产生独立调用。

Felt 没有公开一个覆盖任意地图目标的通用 `highlight()` SDK 方法。
Felt 中的高亮可以由选中单个 feature、临时修改图层样式或临时过滤等不同机制产生，但这些机制具有不同的作用域和生命周期。
因此，当前 `highlight` 仍有独立价值，但必须明确目标数量、是否替代旧高亮、状态所有者和清理时机。

当前薄 Agent 不应直接接收 Felt Style Language 或 MapLibre 样式 JSON。
视觉强调应继续由 Workbench 根据地图意图和主题选择稳定样式。

### 路径与几何展示

#### 官方事实

Felt 的交互绘制工具包括 `pin`、`line`、`route`、`polygon`、`circle`、`marker`、`highlighter`、`text` 和 `note`。[Drawing annotations](https://developers.felt.com/js-sdk/drawing-annotations)
`setTool()` 激活一个用户绘制工具，传入 `null` 会停用全部绘制工具。
`setToolSettings()` 配置绘制工具的颜色、线宽等设置。[ToolsController](https://developers.felt.com/js-sdk-api-reference/tools/toolscontroller)

Felt 的 `route` 工具让用户按交通方式和途经点创建路线。
步行、驾车和骑行模式沿适用道路与路径计算，飞行模式使用大圆路径。[Drawing annotations](https://developers.felt.com/js-sdk/drawing-annotations)

`createElement()`、`updateElement()` 和 `deleteElement()` 用于程序化创建、修改和删除标注。
SDK 支持 Place、Path、Polygon、Circle、Marker、Highlighter、Text、Note 和 Image 等 element 类型。[Elements](https://developers.felt.com/js-sdk-api-reference/elements)

通过 SDK 创建的 element 只存在于当前会话，不持久化，也不会对其他地图用户可见。[Elements](https://developers.felt.com/js-sdk-api-reference/elements)
REST API 则可以使用 GeoJSON Feature Collection 创建或更新地图 annotation，并通过 ID 删除 annotation。[Working with annotations](https://developers.felt.com/rest-api/working-with-elements)

#### 对当前项目的推断

Felt 没有公开名为 `previewPath` 的 SDK 方法。
其 SDK 把“用户绘制路线”“程序创建临时 Path”“创建持久 annotation”分成不同能力，这证明路径的来源和生命周期比渲染机制更重要。

当前 `previewPath` 应继续表示“临时展示一条已经存在的路径”，不应等同于 Felt 的 `route` 绘制工具。
如果当前工具接收的是既有 `MapTargetRef`，它既不需要路径坐标，也不需要路线计算模式。

Felt 的通用 Path 和 Polygon 模型提示未来可能存在更广义的 `previewGeometry` 意图。
这是架构推断，不是当前场景已证明的需求，因此首轮仍应保留更窄的 `previewPath`。

### 选择、预览与本地协作

#### 官方事实

`selectFeature()` 会选中一个图层 feature，并可以显示 popup、modal 或 sidebar，同时高亮该 feature。
它还支持通过 `fitViewport` 控制是否将视口适配到被选 feature。[SelectionController](https://developers.felt.com/js-sdk-api-reference/selection/selectioncontroller)

Felt 当前一次只能选中一个 feature，选择新 feature 会替换旧 feature 选择。[Working with selection](https://developers.felt.com/js-sdk/working-with-selection)
`getSelection()` 读取当前选择，`clearSelection()` 清除 feature、element 或两者，`onSelectionChange()` 观察选择变化。[SelectionController](https://developers.felt.com/js-sdk-api-reference/selection/selectioncontroller)

`onPointerClick()` 和 `onPointerMove()` 用于观察地图点击和悬停。
这些监听器返回取消订阅函数，官方建议在不再需要时调用它们。[Map interactions and viewport](https://developers.felt.com/js-sdk/map-interactions-and-viewport)

`onElementCreateEnd()` 可以判断用户何时完成一个多步骤标注绘制，而 `onElementChange()` 和 `onElementDelete()` 可以观察后续编辑与删除。[ElementsController](https://developers.felt.com/js-sdk-api-reference/elements/elementscontroller)

#### 对当前项目的推断

Felt 的 selection 是地图状态，不是业务选择，也不是 Human-in-the-Loop 协议。
它适合支撑候选项悬停、点击和地图预览，但用户对巡逻路线的确认、取消或修改仍应通过标准征询闭环返回 Agent。

这支持当前“`useHumanInTheLoop` + 地图本地预览”的拆分。
地图只负责让候选路线可见和可检查，征询机制负责记录用户的业务决定。

如果未来需要用户直接圈定区域或绘制路径，可以考虑由 Workbench 激活本地绘制模式并等待 `onElementCreateEnd()`。
这类能力首先应被描述为受控地图输入，而不是让 Agent 直接创建巡逻任务或业务方案。

### 清理、恢复与状态所有权

#### 官方事实

Felt 提供若干局部清理原语，包括 `clearSelection()`、`deleteElement()`、`deleteLayer()` 和 `setTool(null)`。[SelectionController](https://developers.felt.com/js-sdk-api-reference/selection/selectioncontroller) [ElementsController](https://developers.felt.com/js-sdk-api-reference/elements/elementscontroller) [LayersController](https://developers.felt.com/js-sdk-api-reference/layers/layerscontroller) [ToolsController](https://developers.felt.com/js-sdk-api-reference/tools/toolscontroller)

`deleteLayer()` 只可删除通过 SDK `createLayersFromGeoJson()` 创建的图层。
`duplicateLayer()` 创建的副本和 `setLayerStyle()` 的样式变化都只存在于当前会话。[LayersController](https://developers.felt.com/js-sdk-api-reference/layers/layerscontroller)

视口、选择、element 和工具状态都提供读取方法或变化事件，但官方公开文档没有描述一个统一的事务、撤销栈、状态所有权或 Agent Run 回滚 API。

#### 对当前项目的推断

Felt 的局部原语不能替代当前 Workbench 的 Run 级状态处置。
当前项目仍需区分 Agent 临时效果、用户固定状态和共享基础状态，并在取消、替代、失败和用户接管时应用不同规则。

清理不应默认成为 Agent 可调用的通用工具。
由 Workbench 根据效果所有者自动清理，可以避免旧 Run 删除用户刚刚固定的路线或选择。

## 与当前地图域意图的对照

| 当前意图或机制 | Felt 中可核验的相近原语 | 结论 |
| --- | --- | --- |
| `focusOn` | `setViewport()`、`fitViewportToBounds()`、`selectFeature({ fitViewport })` | 保留高层意图，Workbench 内部解析目标和完成时机，不复制相机参数 |
| `highlight` | `selectFeature()`、临时 `setLayerStyle()`、临时 `setLayerFilters()` | 保留统一意图，但明确它不是 Felt 的单一方法，并定义多目标与生命周期语义 |
| `setLayerVisibility` | 同名 `setLayerVisibility()`，以及 group 和 legend item 级可见性方法 | 命名和地图域边界合理，可考虑使用批量 `show` / `hide` 终态结构 |
| `previewPath` | session-only `createElement(Path)`、既有 Path element、交互 `route` 工具 | 保留“预览既有路径”的窄语义，不混入路线生成或用户绘制 |
| `useHumanInTheLoop` + 地图本地预览 | `selectFeature()`、`clearSelection()`、pointer 与 selection 事件 | 继续拆分业务征询和地图预览，Felt 没有公开专用 HITL 路线选择协议 |
| Workbench 自动清理 | `clearSelection()`、`deleteElement()`、`deleteLayer()`、`setTool(null)` | 使用局部原语实现，但状态所有权和 Run 级处置必须由 Workbench 定义 |

## 对工具面设计的具体启发

1. `focusOn` 应表达“让目标进入合适视野”，而不是暴露中心点和缩放级别。
2. `highlight` 应明确是单选强调、多目标强调还是图层级强调，并规定新调用是否替代旧效果。
3. `setLayerVisibility` 可以一次表达多个图层的 `show` 与 `hide` 终态，减少中间闪烁和不完整状态。
4. `previewPath` 必须带有临时所有权和替代规则，但不需要知道路线的巡逻业务含义。
5. 用户点击、悬停、平移、缩放和固定候选项应继续作为地图本地交互，不自动提升为 Agent Tool。
6. 如果场景需要用户圈区或画线，可以新增受控地图输入机制，但应与 Agent 直接修改地图状态区分。
7. 完成结果应区分已完成、已取消、已替代和失败，因为 Felt 的局部 SDK 方法本身没有提供当前项目所需的 Run 级协作语义。

这些启发只校验当前四个意图的边界。
它们不构成复制 Felt API、引入 Felt 依赖或扩展为通用地图平台的建议。

## 官方来源

- [Felt MCP Server 发布页](https://felt.com/blog/introducing-felt-mcp-server)
- [Felt Developer Docs](https://developers.felt.com/)
- [ViewportController](https://developers.felt.com/js-sdk-api-reference/viewport/viewportcontroller)
- [LayersController](https://developers.felt.com/js-sdk-api-reference/layers/layerscontroller)
- [Hiding and showing](https://developers.felt.com/js-sdk/hiding-and-showing)
- [Drawing annotations](https://developers.felt.com/js-sdk/drawing-annotations)
- [ElementsController](https://developers.felt.com/js-sdk-api-reference/elements/elementscontroller)
- [Working with annotations](https://developers.felt.com/rest-api/working-with-elements)
- [SelectionController](https://developers.felt.com/js-sdk-api-reference/selection/selectioncontroller)
- [Working with selection](https://developers.felt.com/js-sdk/working-with-selection)
- [Map interactions and viewport](https://developers.felt.com/js-sdk/map-interactions-and-viewport)
- [Felt 官方 GitHub 组织](https://github.com/felt)
