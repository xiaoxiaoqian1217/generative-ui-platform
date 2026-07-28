<!-- cspell:ignore ajv codegen sinclair typebox unpacked zod -->

# ADR-0012: 使用 TypeBox 和 Ajv 进行 Schema 校验

- **状态：** 已接受
- **日期：** 2026-07-27

## 背景

Generative UI Compiler MVP 需要在多个边界执行运行时 Schema 校验。
这些边界包括 Presentation Request、Presentation Decision、UI Plan Candidate、UI Compile Request、Component Catalog、UI IR 和 A2UI 0.9.1 Profile。
项目同时要求 TypeScript strict mode、ESM 输出、共享包独立发布、JSON Schema 互操作、稳定错误代码和可替换的底层校验实现。
Component Catalog 中的 Props Schema 和 Action Schema 是运行时数据。
A2UI 0.9.1 Profile 是本仓库拥有的受限协议契约，并且必须保持与上游 A2UI 0.9.1 Schema 兼容。
因此，方案必须能够直接消费 JSON Schema，不能只提供从某个专用 Schema DSL 到 JSON Schema 的单向转换。

本 ADR 只锁定 Schema 定义和校验方案。
本 ADR 不实现契约、校验器、Compiler 功能、前端、网络接口或模型 Adapter。

## 决策驱动因素

候选方案按以下因素评估：

- 在 Node.js ESM 项目中的可用性。
- 从运行时 Schema 推导 TypeScript 类型的能力。
- 对标准 JSON Schema 的直接生成和校验能力。
- 对动态 Props Schema、Action Schema 和 A2UI Profile Schema 的适配能力。
- 将底层校验错误归一化为稳定项目错误的能力。
- 发布包和运行依赖体积。
- 当前维护状态和升级路径。
- 共享包独立发布时的依赖行为。
- 将来替换 Schema builder 或 validator 的成本。

## 候选方案

### 候选 A: `@sinclair/typebox` 0.34 LTS + Ajv 8

TypeBox 以 JSON Schema 对象作为运行时 Schema，并通过 `Static<typeof schema>` 推导 TypeScript 类型。
TypeBox 0.34 提供 ESM conditional exports，并与仓库当前 TypeScript 5.8 兼容。
Ajv 8 可以直接编译和校验 JSON Schema Draft 7，也可以通过独立的 Ajv 2020 实例校验 Draft 2020-12。
Ajv 的校验错误提供 JSON Pointer 实例路径和 keyword，可在私有 Adapter 中归一化。

该方案的主要代价是需要两个依赖，并且 Ajv 本身通过 CommonJS 包提供 Node.js ESM 默认导入互操作，而不是原生 ESM 包。
该限制不改变仓库 ESM 源码和 ESM 构建产物，但需要由构建和独立导入测试持续验证。

### 候选 B: Zod 4

Zod 4 提供优秀的 TypeScript 类型推导、原生 ESM exports、零运行依赖和内置的 JSON Schema 导出。
Zod 4 也能把 JSON Schema 转换为 Zod Schema，但 `z.fromJSONSchema()` 在决策时仍被官方标记为实验性 API。
部分 Zod 类型和转换无法无损表示为 JSON Schema。
如果项目以 Zod Schema 为事实来源，动态 Catalog Schema 仍需要实验性转换或第二套 JSON Schema validator。
这会产生两个运行时语义、两种错误模型和更高的替换成本。

### 候选 C: Ajv 8 + 手写 TypeScript 类型

Ajv 8 单独使用时对 JSON Schema 互操作最直接，依赖数量也少于候选 A。
Ajv 的 `JSONSchemaType<T>` 可以检查部分 Schema 与既有类型的对应关系，但不能从任意 JSON Schema 完整推导 TypeScript 类型。
官方文档也说明其联合类型支持存在 TypeScript 层面的完整性限制。
该方案需要同时维护手写 TypeScript 类型和运行时 Schema，违反单一事实来源目标。

## 比较

| 维度 | TypeBox 0.34 + Ajv 8 | Zod 4 | Ajv 8 + 手写类型 |
|---|---|---|---|
| ESM | TypeBox 原生 ESM，Ajv 通过 Node.js ESM 互操作 | 原生 ESM | Ajv 通过 Node.js ESM 互操作 |
| 类型推导 | 从 JSON Schema builder 直接推导 | 从 Zod Schema 直接推导 | 主要是类型约束 Schema，不能完整反向推导 |
| JSON Schema 输出 | Schema 本身就是 Draft 7 JSON Schema | 需要转换，部分类型不可表示 | Schema 本身是 JSON Schema |
| 动态 JSON Schema | Ajv 直接校验 | 导入 API 仍为实验性，或需要第二个 validator | Ajv 直接校验 |
| A2UI Profile Schema | TypeBox 定义，Ajv 直接校验 | Zod 定义，但动态 Schema 仍需第二个 validator | JSON Schema 直接校验，但类型需要重复维护 |
| 错误归一化 | Ajv Adapter 集中映射 | 需要同时处理 Zod 和 JSON Schema 错误 | Ajv Adapter 集中映射 |
| 单一事实来源 | 满足 | 仅对项目自有 Zod Schema 满足 | 不满足 |
| 替换成本 | 中等，可由 JSON Schema 和 Adapter 测试控制 | 较高，Zod DSL 会进入所有 Schema 定义 | validator 较低，类型同步成本高 |
| 结论 | 采用 | 不采用 | 不采用 |

## 包体积和维护快照

以下数字来自 2026-07-27 查询的 npm registry `dist.unpackedSize`。
该数字用于比较发布包安装体积，不等同于 tree-shaken bundle 或完整传递依赖体积。

| 包 | 评估版本 | Unpacked size | 直接依赖 | 维护信号 |
|---|---:|---:|---:|---|
| `@sinclair/typebox` | 0.34.52 | 1,907,776 bytes | 0 | 0.x LTS，决策前 11 天内发布 |
| `ajv` | 8.20.0 | 1,033,496 bytes | 4 | 决策前 2 个月内发布 |
| `zod` | 4.4.3 | 4,558,122 bytes | 0 | 决策前 3 个月内发布 |

候选 A 两个直接包的 unpacked size 合计为 2,941,272 bytes，不含 Ajv 的传递依赖。
Zod 官方给出的简单校验 bundle 示例约为 5.91 KB gzip，对象 Schema 示例约为 13.1 KB gzip。
这些 bundle 示例与服务端完整 Schema 集合不可直接比较，因此体积不是单独决定方案的依据。
MVP 不包含前端 Runtime，Schema validator 不会进入本期前端下载路径。
阶段二实现必须记录各独立发布包的实际构建产物大小，后续升级不得仅依据 npm unpacked size 判断回归。

## 决策

项目采用 `@sinclair/typebox` 0.34 LTS 作为项目自有运行时 Schema 的 builder。
项目采用 Ajv 8 作为 JSON Schema 运行时 validator。
项目自有 Schema 使用 JSON Schema Draft 7 语义。
Draft 2020-12 外部 Schema 必须使用独立的 Ajv 2020 实例。
Draft 2020-12 和早期 Draft 不得放入同一个 Ajv 实例。

当前不采用 TypeBox 1.x。
TypeBox 1.x 是 ESM-only 的最新版本，但其官方兼容矩阵要求 TypeScript 6.0 或更高版本。
仓库当前使用 TypeScript 5.8.3。
升级 TypeScript 或迁移到 TypeBox 1.x 必须由独立依赖升级任务验证，不能作为阶段二的隐式前置变更。

## Schema 和类型的单一事实来源

项目自有可执行契约必须先定义 TypeBox 运行时 Schema。
对应 TypeScript 类型必须使用 `Static<typeof schema>` 推导。
禁止为同一契约再手写等价的 `interface` 或 type literal。
禁止从 TypeScript 类型生成运行时 Schema 作为主流程。

项目自有契约只使用可无损表示为标准 JSON Schema 的 TypeBox JSON 类型。
禁止在公共契约中使用 TypeBox JavaScript 扩展类型、Transform、Cast 或自定义运行时代码。
业务输入校验不得执行隐式转换、默认值注入或未知字段删除。

导出的 JSON Schema 必须直接序列化自同一个 TypeBox Schema 对象。
契约测试必须验证序列化结果通过目标 Draft 的 meta-schema，并保留期望的 `$id`、required、additionalProperties 和引用关系。

`compiler-contract` 中版本化的 A2UI 0.9.1 Profile TypeBox Schema 是 A2UI 运行时校验和 TypeScript 类型的单一事实来源。
该 Profile Schema 必须只接受 ADR-0008 允许的 `createSurface`、`updateComponents` 和 `updateDataModel`，并拒绝 `deleteSurface`、Surface 替换和其他范围外操作。
固定的上游 A2UI 0.9.1 Schema 只作为兼容性参考和测试输入，不能代替本仓库范围更窄的 Profile Schema。

其他外部拥有的 Schema 不得在 TypeBox 中手工重写。
运行时 Catalog 中的 Props Schema 和 Action Schema 是对应 Catalog 版本的数据事实来源。
这些外部或运行时 Schema 必须先通过允许的 meta-schema、关键字和资源限制校验，再交给 Ajv 编译。
需要 TypeScript 类型时，应从固定外部 Schema 生成并在 CI 中检查漂移，或者在边界内保持为 `unknown` 后通过 validator 收窄。
禁止同时手写外部 Schema 的等价 TypeScript 类型并将两者都视为权威。

## Catalog 内嵌 Schema Profile

Catalog 的 Props Schema 和 Action Schema 根节点必须是对象，并且必须显式声明 `"$schema": "http://json-schema.org/draft-07/schema#"`。
MVP 不接受其他 dialect，也不根据缺失的 `$schema` 猜测 dialect。

嵌套位置可以使用 Draft 7 布尔 Schema。
对象 Schema 可以使用根节点的 `$schema` 和以下 Draft 7 关键字：

- 结构关键字: `type`、`enum`、`const`、`properties`、`required`、`additionalProperties` 和 `items`。
- 组合关键字: `allOf`、`anyOf`、`oneOf` 和 `not`。
- 字符串约束: `minLength` 和 `maxLength`。
- 数值约束: `minimum`、`maximum`、`exclusiveMinimum`、`exclusiveMaximum` 和 `multipleOf`。
- 数组约束: `minItems`、`maxItems` 和 `uniqueItems`。
- 对象约束: `minProperties` 和 `maxProperties`。
- 注解关键字: `title`、`description`、`default` 和 `examples`。

`type` 可以是单个类型名称，也可以是非空且元素唯一的类型名称数组。
联合 `type` 可以包含多个非 `null` 类型。
`default` 只作为注解，validator 不得把它写入数据。
MVP 禁止 `$ref`、`$defs`、`definitions`、`$dynamicRef`、远程引用、`format`、`pattern`、`patternProperties`、条件关键字、内容关键字和自定义关键字。
禁止引用和正则相关关键字可避免网络解析、递归图和 ReDoS 风险，并保持阶段二替换成本可控。
需要扩展关键字集合时，必须修订本 ADR 并增加安全和互操作测试。

`component-catalog-schema` 拥有以下版本化限制及其默认值：

| 配置项 | MVP 默认值 | 执行位置 |
|---|---:|---|
| `maxCatalogBytes` | 1,048,576 bytes | Service Catalog Repository 在反序列化前 |
| `maxEmbeddedSchemaBytes` | 65,536 bytes | Service 和 Core |
| `maxEmbeddedSchemaDepth` | 32 | Service 和 Core |
| `maxEmbeddedSchemaNodes` | 4,096 | Service 和 Core |

这些值必须通过配置注入，不能散落为业务逻辑中的数字常量。
Service Catalog Repository 在反序列化前执行 Catalog 字节限制。
Service 在路由前执行全部内嵌 Schema 限制。
Core 使用可信 Adapter 注入的同一组限制重新校验 Catalog 内嵌 Schema，且不得信任 Service 已完成校验。
直接调用 Core 的可信 Adapter 也必须显式注入这些限制。
任何限制失败都使用 `SCHEMA_LIMIT_EXCEEDED`，不得进入 Ajv 编译。

## Validator 边界

Ajv 只能出现在各 Schema 所有者包的私有 validation Adapter 中。
公共函数、公共错误和导出的 TypeScript 类型不得暴露 Ajv 实例、`ValidateFunction`、`ErrorObject`、keyword、params 或自然语言 message。
UI Compiler Core 和 UI Compiler Service 只依赖项目定义的校验接口和归一化结果。

项目自有静态 Schema 应在模块初始化或应用启动时编译一次并复用。
已验证 Catalog 的动态 Props Schema 和 Action Schema 可以按 Catalog ID、版本、内容哈希和 Schema 标识缓存已编译 validator。
该缓存只保存 Schema 和 validator，不保存请求数据、UI IR、编译结果、Fallback Markdown 或 Surface ID。
此约束与 ADR-0011 的缓存边界一致。

模型输出不得包含或提供待编译 Schema。
Ajv 只编译仓库固定 Schema、固定上游 Schema 或来自授权 Catalog 且已通过 Schema 定义校验的 Schema。
Catalog Schema 的大小、深度和允许关键字必须在编译前受限，因为 Ajv 将 Schema 视为与应用代码同等可信的输入。

## Ajv 配置约束

项目自有 Draft 7 validator 必须使用一组集中且可测试的选项。
选项至少包括：

```ts
{
  strict: true,
  allErrors: false,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  validateSchema: true,
  $data: false
}
```

编译 Catalog 内嵌 Props Schema 和 Action Schema 的 Ajv 实例必须额外设置 `allowUnionTypes: true`，使联合 `type` 与公开 Catalog Profile 一致。
该选项不得替代 `strict: true`，也不得放宽关键字白名单、dialect 或资源限制。
`strict: true` 防止未知关键字和被静默忽略的 Schema 错误。
`allErrors: false` 使用 fail-fast 行为，避免不可信输入造成不必要的错误枚举成本。
`coerceTypes: false`、`removeAdditional: false` 和 `useDefaults: false` 保证校验不修改输入。
`validateSchema: true` 保证编译前执行 meta-schema 校验。
`$data: false` 禁止 Schema 从待校验数据动态取得关键字值。

格式和自定义关键字默认不启用。
只有版本化契约明确要求某个 format 或 keyword 时，才能在对应 dialect Adapter 中注册，并增加有效、无效和资源消耗测试。
不得通过关闭 strict mode 接受未知 format 或 keyword。

## 稳定错误映射

底层校验库错误不是公共契约。
公共错误代码由被校验的边界决定，而不是由 Ajv keyword 或 message 决定。

阶段二实现使用以下稳定代码：

| 校验边界 | 稳定错误代码 |
|---|---|
| Presentation Request | `PRESENTATION_REQUEST_INVALID` |
| Presentation Decision | `PRESENTATION_DECISION_INVALID` |
| Presentation Result | `PRESENTATION_RESULT_INVALID` |
| UI Plan Candidate | `UI_PLAN_INVALID` |
| UI Compile Request | `UI_COMPILE_REQUEST_INVALID` |
| Component Catalog | `COMPONENT_CATALOG_INVALID` |
| Component Props | `COMPONENT_PROPS_INVALID` |
| Action payload | `ACTION_PAYLOAD_INVALID` |
| UI IR | `UI_IR_INVALID` |
| A2UI 0.9.1 Profile | `A2UI_INVALID` |
| 外部或 Catalog Schema 定义 | `SCHEMA_DEFINITION_INVALID` |
| Catalog Schema 资源限制 | `SCHEMA_LIMIT_EXCEEDED` |
| validator 初始化或编译失败 | `SCHEMA_COMPILATION_FAILED` |

Catalog 的 `maxCatalogBytes`、`maxEmbeddedSchemaBytes`、`maxEmbeddedSchemaDepth` 和 `maxEmbeddedSchemaNodes` 四项资源限制统一使用 `SCHEMA_LIMIT_EXCEEDED`。
Requirements 已定义的 `REQUEST_BODY_TOO_LARGE`、`DATA_DEPTH_EXCEEDED` 和 `DATA_ITEMS_EXCEEDED` 仅分别适用于 Presentation Request 请求体、Agent 内容或 UI Plan Candidate，不适用于 Catalog 及其内嵌 Schema。
不得把资源限制失败折叠为通用 Schema 错误。

私有 Adapter 可以把 Ajv 的 `instancePath` 转换为 RFC 6901 JSON Pointer，并把 keyword 映射为项目自有的诊断 constraint。
未知 keyword 必须映射为通用 constraint，而不能自动成为新的公共错误代码。
自然语言错误 message 只能由项目模板根据稳定代码和安全路径生成。
不得把 Ajv message、schemaPath、params、Schema 内容或原始敏感 payload 直接返回给调用方或写入日志。

测试必须针对稳定代码、阶段、重试属性和安全路径断言。
测试不得针对 Ajv 的英文错误文本断言。
替换 Ajv 后，只要公开的稳定代码和诊断语义不变，就不构成公共契约变更。

## 独立发布和版本策略

Schema 所有者包必须把 `@sinclair/typebox` 声明为普通运行依赖，而不是要求消费方安装的 peer dependency。
只有实际创建 Ajv validator 的包声明 `ajv` 运行依赖。
不得为了复用 Ajv 实例让共享契约包反向依赖应用层。

阶段二首次实现使用 `@sinclair/typebox` 0.34.x 和 Ajv 8.x。
package manifest 对 `@sinclair/typebox` 使用 `^0.34.52`，对 `ajv` 使用 `^8.20.0`，lockfile 锁定实际安装版本。
所有独立发布包必须在隔离安装测试中验证 ESM import、类型声明解析和运行时校验。

TypeBox patch 升级必须运行 Schema 序列化差异测试和类型检查。
TypeBox minor line、Ajv minor 或 Ajv patch 升级必须运行官方 JSON Schema fixture、项目契约 fixture、Catalog fixture、A2UI fixture 和错误归一化测试。
TypeBox 1、Ajv 9 或 JSON Schema dialect 变更需要新的 ADR 或明确修订本 ADR。

如果依赖升级不改变导出的 JSON Schema、推导类型或稳定错误语义，可以发布 patch changeset。
如果升级增加向后兼容的 Schema 能力，需要 minor changeset。
如果升级改变已有有效值、拒绝已有有效值、改变导出类型或改变稳定错误代码，需要 major changeset 和迁移说明。

## 可替换性

TypeBox 的使用必须集中在每个契约包的 Schema 定义模块。
Ajv 的使用必须集中在私有 validation Adapter。
业务逻辑不得调用 Ajv API 或读取 Ajv 错误对象。

每个版本化 Schema 必须具有以下可移植测试：

- 有效和无效 fixture。
- 序列化 JSON Schema 的 meta-schema 校验。
- TypeScript 正向和负向类型检查。
- 归一化错误代码和安全路径断言。
- ESM 独立导入测试。

这些测试形成替换基线。
替换 TypeBox 时必须保持导出的 JSON Schema 和 TypeScript 语义，或者按契约变化发布新版本。
替换 Ajv 时必须保持有效性判断和归一化错误语义。
任何 validator 专有 keyword 都会提高替换成本，因此本 ADR 禁止在没有后续 ADR 的情况下引入。

## 阶段二实现约束

阶段二可以直接按以下顺序实施：

1. 在各契约所有者包中以 TypeBox 定义版本化运行时 Schema，并从 Schema 推导类型。
2. 在私有 Adapter 中创建 Draft 7 Ajv 实例，并严格使用本 ADR 的不可变校验配置。
3. 在 `compiler-contract` 中以 TypeBox 定义 ADR-0008 限制的 A2UI 0.9.1 Profile Schema，并用固定上游 fixture 执行兼容性测试。
4. 只有真正外部且明确声明 Draft 2020-12 的 Schema 才使用独立 Ajv 2020 实例。
5. 在编译任何 Catalog 内嵌 Schema 前，按本 ADR 的 Draft 7 Profile、关键字白名单和四项资源限制完成校验。
6. 在边界层把 validator 结果映射为本 ADR 定义的稳定错误代码。
7. 为每个可执行契约增加 Schema fixture、类型测试、错误映射测试和 changeset。
8. 验证每个共享包能够独立构建、安装并通过 Node.js ESM 导入。
9. 记录独立包构建产物大小，并在依赖升级中比较。

阶段二不得把 Schema 校验逻辑放入前端、网络协议 Adapter 或模型 Adapter。
阶段二不得让 UI Compiler Core 选择展示模式、调用模型或加载网络 Schema。

## 后果

- 项目自有契约的运行时 Schema、JSON Schema 和 TypeScript 类型来自同一事实来源。
- Catalog Props、Catalog Action 和 A2UI 可以使用标准 JSON Schema validator 直接校验。
- 稳定错误代码不依赖 Ajv 的 keyword、参数结构或英文错误文本。
- 共享包承担明确的运行依赖，但不要求消费方配置全局 validator。
- TypeBox 0.x 到 TypeBox 1.x 的未来迁移需要与 TypeScript 6 升级协调。
- Ajv 的 CommonJS 实现通过 Node.js ESM 互操作使用，独立 ESM 导入测试成为升级门禁。
- 动态 Schema 编译需要严格的来源、关键字和资源限制。
- 本决策不引入前端、网络、模型供应商或 Interaction Gateway 依赖。

## 参考资料

- [TypeBox 0.x LTS package](https://www.npmjs.com/package/@sinclair/typebox)
- [TypeBox versions and JSON Schema support](https://github.com/sinclairzx81/typebox#versions)
- [Ajv JSON Schema versions](https://ajv.js.org/json-schema.html)
- [Ajv TypeScript support](https://ajv.js.org/guide/typescript.html)
- [Ajv options](https://ajv.js.org/options.html)
- [Ajv Schema management](https://ajv.js.org/guide/managing-schemas.html)
- [Ajv security considerations](https://ajv.js.org/security.html)
- [Zod JSON Schema support](https://zod.dev/json-schema)
- [Zod package size examples](https://zod.dev/packages/mini)
