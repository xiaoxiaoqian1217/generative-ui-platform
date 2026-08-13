# 阶段二人工验收记录

> **Status: Historical.**
> This validation record covers a previous repository phase.

- 验收日期: 2026-07-29。
- 验收范围: Issue #20 的 Core 负向验证、UI Plan Candidate 资源限制、确定性降级和请求隔离。
- 验收结果: 通过。

## 主线和任务边界

任务分支从已验证的 GitHub `main` 提交 `2620fb9e3c5432949b65311dabddae36913e83bb` 创建。
最终验证前重新获取 GitHub `main`，远端提交和本地 `origin/main` 仍为同一提交，因此无需集成更新。
实现只修改 UI Compiler Core 的输入资源检查、测试和发布说明，没有增加 Service 路由、模型调用、HTTP 超时、固定模板 A2UI 或跨请求结果缓存。

## 七类场景

已逐一检查 summary、status、comparison、timeline、detail、form 和 confirmation 的编译结果。
summary、status、comparison、timeline 和 detail 的测试检查了可信 UI IR 的组件类型、绑定、布局和 Catalog 来源。
form 和 confirmation 的测试检查了 Props、Action、目标组件、嵌套关系和版本化 `action.event` Envelope。
七类场景均通过 UI IR Schema 和 A2UI 0.9.1 Profile 校验。

## A2UI 输出限制

成功结果只包含 `createSurface`、`updateComponents` 和 `updateDataModel`。
全部 Operations 使用 `version = "v0.9"`。
测试明确确认没有 `deleteSurface`、Surface 替换、固定模板 A2UI 或部分 A2UI。

## 负向和降级

已修改 UI Plan Candidate 额外字段、组件、Props、Action、Binding、嵌套、引用、Catalog ID、Catalog 版本和 Catalog 内容哈希。
Date、Map、自定义原型对象、函数和循环引用均被稳定归类为非法 UI Plan Candidate。
所有非法输入均在可信 UI IR 或 A2UI Operations 产生前被拒绝。
存在安全 `fallbackMarkdown` 时返回包含稳定错误代码和阶段的 Markdown 降级结果。
不存在可消费 Fallback 时返回完全失败。
所有降级和失败断言均确认不含 `operations` 和 `surfaceId`。

## 资源限制

Core 在任何 UI Plan Candidate 或 Compile Request Schema validator 之前执行 `maxDataDepth` 和 `maxDataItems` 检查。
检查使用有界显式栈和惰性子项遍历，10,000 层 Candidate 可稳定返回 `DATA_DEPTH_EXCEEDED`，不会触发 JavaScript 调用栈溢出或预先物化超宽输入。
数组按 JSON 的 `length` 和索引语义检查，非 enumerable 索引和稀疏项不能绕过资源限制。
超量 Candidate 可稳定返回 `DATA_ITEMS_EXCEEDED`。
完整 `sourceData` 在 Core 边界独立执行相同的深度和数据项数量检查。

## 请求隔离

两个 Worker 线程对同一个 Plan 并行执行 16 组不同 `sourceData`、Fallback 和 Surface ID 的编译。
成功结果分别保留各自的 `sourceData` 和 Surface ID。
降级结果分别保留各自的 Fallback。
测试未发现跨请求数据、Fallback 或 Surface ID 串用。

## 依赖检查

以下命令已实际执行并通过:

```text
pnpm check:boundaries
pnpm --filter @generative-ui/ui-compiler-core list --depth Infinity
```

Core 的生产依赖树只包含共享契约包、TypeBox、Ajv 及其 JSON Schema 辅助依赖。
生产依赖树没有模型 SDK、HTTP 框架、AG-UI Runtime、Agent Runtime 或前端框架。

## 验证命令

以下命令已实际执行并通过:

```text
pnpm install --frozen-lockfile
pnpm --filter @generative-ui/ui-compiler-core test
pnpm --filter @generative-ui/ui-compiler-core typecheck
pnpm --filter @generative-ui/ui-compiler-core build
pnpm validate
```

Core 共 10 个测试文件和 67 项测试通过。
`pnpm validate` 覆盖 lint、依赖边界、全仓类型检查、测试、隔离包安装、构建和文档检查。
