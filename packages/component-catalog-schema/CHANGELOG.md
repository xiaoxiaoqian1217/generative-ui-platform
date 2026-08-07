# @generative-ui/component-catalog-schema

## 0.2.0

### Minor Changes

- ae54a24: 为 Component Catalog 提供共享的 RFC 8785 和 SHA-256 内容哈希实现。

  发布 summary 场景的最小 Core 编译链路，包括权威输入和 Catalog 校验、UI IR lowering、A2UI 0.9.1 Profile 输出及安全 Markdown 降级。

- c6bcedd: 发布具备运行时 Schema 校验能力的可执行 Presentation 和 Component Catalog 契约。

  增加统一的 JSON 值类型归属、稳定校验错误和 UI Plan Candidate 降低示例。

### Patch Changes

- b27ee26: 使 Catalog 内嵌 Schema 的联合 `type` 定义与严格 Ajv 编译配置保持一致。
- 8411ed5: 在序列化前以非递归遍历识别内嵌 Schema 的深度和节点超限。
  保持资源超限、非法定义和编译失败的稳定错误分类。
- Updated dependencies [c6bcedd]
  - @generative-ui/shared-types@0.2.0
