# TASK-003：Workbench 路由与本地设置

## 目标

建立 Workbench 的六个稳定路由和本地非敏感配置存储。

## 交付

- 实现 Playground、Inspect、Cases、Catalog、Scenarios 和 Settings 路由。
- 提供可直达的导航、刷新恢复和未就绪状态。
- Settings 只保存 Runtime Host 地址、超时和调试显示等本地非敏感选项。

## 验收

- 任一路由可以独立访问。
- 浏览器配置不包含模型、Business Agent 或凭证信息。

## 依赖

无。
