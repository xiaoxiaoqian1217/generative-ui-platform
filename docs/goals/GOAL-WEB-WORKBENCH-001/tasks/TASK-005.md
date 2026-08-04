# TASK-005：Catalog 与场景页

## 目标

通过 Runtime 只读查询契约展示 Catalog 和场景元数据，并提供受控预览。

## 交付

- 定义并实现由 Runtime Host 提供的 Schema 校验只读 Catalog 摘要和已加载场景元数据契约。
- 展示组件名称、标识、版本、Props Schema、Action、示例、状态和预览。
- 展示已加载场景的标识、版本、说明、示例和可用性。
- 使用登记示例数据与 Component Registry 渲染只读组件预览。

## 验收

- 不支持任意 Props 编辑、动态组件加载或任意代码执行。
- Catalog 和场景数据与 Runtime Host 当前状态一致。
- 浏览器不读取内部 Package、Provider 配置、凭证或 Business Agent 私有协议。

## 依赖

TASK-003。
