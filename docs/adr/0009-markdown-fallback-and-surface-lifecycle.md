# ADR-0009: 使用 Markdown 降级并限制 Surface 生命周期

- **状态：** 已接受
- **日期：** 2026-07-27

## 背景

需求此前要求在动态 A2UI 和 Markdown 之间提供固定模板 A2UI 降级结果。
公共 `PresentationResult` 契约没有表示已降级 generative UI 结果的状态。
因此，固定模板结果要么违反公共联合类型，要么被错误表示为已完成的生成式 UI。

需求还将 Surface 替换和删除列入 MVP，尽管 MVP 只返回一个初始完整结果，并且不维护 Surface 修订版本。

## 决策

MVP 降级链为：

```text
经过校验的动态 A2UI
    |
    v
安全 Markdown
    |
    v
完全失败
```

编译失败且存在有效 Fallback 内容时，Core 返回包含安全 Fallback Markdown 的降级编译结果。
Service 将该结果映射为 `status = "degraded"` 和 `mode = "markdown"`。
MVP 不生成固定模板 A2UI。

MVP 仅创建初始完整 Surface。
Surface 替换、删除、修订、差异和增量生命周期管理属于未来能力。

此决策取代 CORE-024 中早期的固定模板要求，以及 CORE-019 中关于替换和删除的部分。

## 后果

- `PresentationResult` 和 `UICompileResult` 保持为有效的判别联合。
- 部分 A2UI 或固定模板 A2UI 不会被错误标记为已完成的 generative UI 结果。
- 测试覆盖 A2UI 成功、Markdown 降级和完全失败。
- 未来支持 Surface 生命周期需要带版本的契约和新的 ADR。
