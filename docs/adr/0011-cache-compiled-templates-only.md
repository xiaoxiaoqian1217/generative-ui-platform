# ADR-0011: 缓存编译模板而非完整结果

- **状态：** 已接受
- **日期：** 2026-07-27

## 背景

完整 UI IR、编译结果和 A2UI Operations 包含请求专属业务数据、Fallback Markdown、关联字段和 Surface ID。
仅基于 Plan、Catalog 和上下文的缓存键可能会将一个请求的数据返回给另一个请求，还可能复用 Surface ID。

## 决策

MVP 缓存经过校验的 Catalog 和已编译 Schema。
它不跨请求缓存完整 UI IR、`UICompileResult`、A2UI Operations、源数据、派生数据值、Fallback Markdown 或 Surface ID。

未来优化只能在另行作出启用决策后缓存 `CompiledUITemplate`。
模板必须排除所有请求值和最终协议 Operations。
实例化时必须注入当前请求数据和新生成的 Surface ID。
任何未来模板缓存都必须按安全域分区，并使用所有会影响输出结构的输入作为缓存键，其中包括 Compiler 版本、Catalog 标识和哈希、Plan 哈希、数据结构哈希、上下文哈希以及编译策略版本。

## 后果

- MVP 不会通过完整结果缓存泄露业务数据。
- Surface ID 保持为请求级标识，绝不会从跨请求缓存中恢复。
- 未来模板缓存需要隐私评估、启用 ADR 和跨用户隔离测试。
- 确定性适用于语义组件规划，而不适用于请求级标识符。
