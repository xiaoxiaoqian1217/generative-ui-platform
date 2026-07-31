# TASK-007：Vue A2UI Renderer

## 目标

在浏览器中安全渲染 UI Compiler 输出的 A2UI，并明确 Component Catalog 与 Component Registry 的职责边界。

## 工作项

- 实现 A2UI Operation Reducer。
- 实现 Surface Store、Data Model 和 JSON Pointer 解析。
- 实现 Component Registry 与递归渲染。
- 实现 Props、数据绑定和组件嵌套校验。
- 实现未注册组件和不支持 Operation 的受控降级。
- 实现 Action Event 生成。
- 实现 Surface 创建、更新、替换和销毁。
- 首批支持 Card、Text、Badge、Column、Row、List、Table、Button 和 Timeline。

## 架构限制

- Component Catalog 描述 Compiler 可选择的能力。
- Component Registry 映射浏览器中的真实 Vue 组件。
- Renderer 只渲染 Catalog 允许且 Registry 注册的组件。
- 不执行任意 HTML、JavaScript 或模型生成代码。
- 不把 Model Adapter 或 UI Plan Candidate 当作浏览器输入。

## 验收

- 当前平台 A2UI Profile 的所有 Operation 有单元测试。
- 数据绑定和嵌套渲染正确。
- 非法 A2UI 被拒绝或受控降级。
- 未注册组件不会导致任意代码执行或页面崩溃。
- Button 可以产生满足 Runtime Contract 的结构化 Action Event。
