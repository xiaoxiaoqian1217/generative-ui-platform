# TASK-001：Thread Contract 与数据安全模型

## 目标

定义平台持久调试会话的稳定契约、状态机和数据安全边界。

## 交付

- 定义 Thread、Conversation Turn、Presentation Snapshot、分页和变更请求 Schema。
- 定义 create、list、get、rename、archive、delete 和 clear 操作。
- 定义 pending、completed、failed、cancelled 和 history-write-failed 状态。
- 定义资源上限、稳定错误码、契约版本和兼容性规则。
- 定义允许持久化和禁止持久化的数据分类。
- 定义 Runtime Host 与 Business Agent checkpoint 删除契约。

## 验收

- 所有外部输入在边界进行 Schema 校验。
- 契约不包含 Provider 原始响应、UI Plan、UI IR、密钥或任意日志字段。
- 契约兼容性和资源限制具有自动化测试。
- Web 仍只连接 Agent Runtime Host。

## 依赖

`GOAL-WEB-COPILOTKIT-UI-001` 已合并。
