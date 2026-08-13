# 阶段一人工验收记录

> **Status: Historical.**
> This validation record covers removed Compiler packages.

- 验收日期: 2026-07-28。
- 验收范围: G01 至 G05 的 Schema 决策和六个共享包交付物。
- 验收结果: 通过。

## Schema 决策审阅

已人工阅读 [G01 Issue #12](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/12) 和 [ADR-0012](../adr/0012-typebox-and-ajv-schema-validation.md)。
决策比较了 TypeBox 加 Ajv、Zod 4、Ajv 加手写 TypeScript 类型三种可用方案。
决策依据覆盖 ESM、类型推导、JSON Schema 互操作、稳定错误归一化、包体积、维护状态、独立发布和替换成本。
决策采用运行时 Schema 单一事实来源和私有 Validator Adapter，避免把底层 Ajv 类型或错误文本暴露为公共契约。
该取舍优先考虑长期维护性、可替换性和依赖边界，没有引入前端、网络、模型供应商或 AG-UI SDK。

## 安装和全仓验证

以下命令已实际执行并通过:

```text
pnpm install --frozen-lockfile
pnpm validate
```

`pnpm validate` 覆盖 lint、依赖边界、全仓类型检查、测试、隔离包安装、构建和文档检查。

## 六个共享包

以下六个包已分别执行独立 `build` 和 `test`:

```text
pnpm --filter @generative-ui/shared-types build
pnpm --filter @generative-ui/shared-types test
pnpm --filter @generative-ui/presentation-contract build
pnpm --filter @generative-ui/presentation-contract test
pnpm --filter @generative-ui/component-catalog-schema build
pnpm --filter @generative-ui/component-catalog-schema test
pnpm --filter @generative-ui/compiler-contract build
pnpm --filter @generative-ui/compiler-contract test
pnpm --filter @generative-ui/ag-ui-adapter build
pnpm --filter @generative-ui/ag-ui-adapter test
pnpm --filter @generative-ui/ui-compiler-core build
pnpm --filter @generative-ui/ui-compiler-core test
```

六个包合计 177 项包级测试通过。
隔离安装检查验证了六个已发布工作区包的 ESM 运行时导入和 TypeScript 声明解析。

## 无效契约抽查

- `component-catalog-schema` 的 15 项测试确认无效 Catalog、重复引用、未解析引用和不支持的内嵌 Schema 被拒绝。
- `presentation-contract` 的 49 项测试确认非法 UI Plan Candidate、无效引用、非法字段组合和不透明实现载荷被拒绝。
- `compiler-contract` 的 64 项测试确认 `version = "v0.9.1"`、范围外 A2UI Operation、不完整 Surface 和矛盾编译结果状态被拒绝。
- `ag-ui-adapter` 的 26 项测试确认错误 Mapping Version、标识不一致、错误事件顺序、未配对 Step 和双终止事件被拒绝。

## 依赖和公共导出

以下检查已实际执行并通过:

```text
pnpm --filter @generative-ui/ui-compiler-core list --depth 0
pnpm check:boundaries
```

Core 没有运行时依赖，且源码检查未发现 Service、模型 SDK、网络、前端框架或 AG-UI SDK 引用。
依赖边界测试明确拒绝 Adapter 对 Core、`@ag-ui/core` 和未批准运行时包的依赖。
`ag-ui-adapter` 的公共入口导出请求解析、运行时 Schema、事件映射和校验接口。
Adapter 复用 Compiler Contract、Presentation Contract 和 Shared Types，没有重复定义 UI Compile Request、PresentationResult、PresentationError 或 JSON 值契约。
Changeset 已包含 `@generative-ui/ag-ui-adapter` 的 minor 发布说明。
