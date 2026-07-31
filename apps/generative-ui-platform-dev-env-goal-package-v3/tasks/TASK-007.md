# TASK-007：Vue A2UI Renderer

## 目标

在浏览器中安全渲染 UI Compiler 输出的 A2UI。

## 工作项

- 实现 Operation Reducer；
- 实现 Surface Store；
- 实现 Data Model；
- 实现 JSON Pointer；
- 实现 Component Registry；
- 实现递归渲染；
- 实现 Props 校验；
- 实现未注册组件降级；
- 实现非法 Operation 拒绝；
- 实现 Action Event；
- 实现 Surface 更新和销毁。

## 首批组件

- Card
- Text
- Badge
- Column
- Row
- List
- Table
- Button
- Timeline

## 限制

- 只渲染 Component Catalog 注册组件；
- 不执行任意 HTML；
- 不执行任意 JavaScript；
- 不把模型输出当作可信 UI。

## 验收

- 数据绑定正确；
- 非法 A2UI 被拒绝；
- 未注册组件受控降级；
- Button 可产生结构化 Action Event。
