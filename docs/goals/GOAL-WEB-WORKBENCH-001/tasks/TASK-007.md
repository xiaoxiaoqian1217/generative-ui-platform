# TASK-007：Inspect 与确认型 Action

## 目标

提供运行检查能力，并以 Runtime Contract 风险元数据驱动确认型 Action。

## 交付

- 展示运行阶段、关联 ID、耗时、展示决策、校验摘要、错误和降级信息。
- 本地调试模式显示参考场景用户输入和业务结果。
- 永不显示密钥、令牌、设备凭证或 Provider 原始响应。
- 仅对 `requiresConfirmation` 的 Action 显示确认与取消流程。
- 支持自然语言确认文本继续当前会话。

## 验收

- 未批准的确认型 Action 不恢复 Business Agent。
- 低风险前端 Action 不被无条件确认弹窗阻塞。
- 自然语言确认不绕过确认型 Action 的 Runtime Host 校验。

## 依赖

TASK-004 和 TASK-006。
