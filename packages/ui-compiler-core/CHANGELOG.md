# @generative-ui/ui-compiler-core

## 0.2.0

### Minor Changes

- 2620fb9: 支持 Form、Confirmation、Action Envelope 和 Catalog 声明的领域组件编译。
- ae54a24: 为 Component Catalog 提供共享的 RFC 8785 和 SHA-256 内容哈希实现。

  发布 summary 场景的最小 Core 编译链路，包括权威输入和 Catalog 校验、UI IR lowering、A2UI 0.9.1 Profile 输出及安全 Markdown 降级。

- 38bc71d: 扩展确定性 Core lowering，支持 status、comparison、timeline 和 detail 展示场景。
  组件选择现会综合 UI Plan Candidate 偏好、数据规模、Catalog 描述、Viewport 和 nesting 约束。
  新增标准 JSON Pointer 绑定、布局规范化、组件引用和 A2UI 映射覆盖。

### Patch Changes

- 689a662: 在 Schema 校验前以非递归方式限制 UI Plan Candidate 和 sourceData 的嵌套深度及数据项数量，并补齐确定性降级与请求隔离覆盖。
- 81787db: 在 Core 输入边界对顶层字段执行单次受保护快照，确保恶意 getter 或代理访问失败稳定映射为输入错误，并防止失败降级路径再次抛出异常。
- Updated dependencies [a58ef95]
- Updated dependencies [b27ee26]
- Updated dependencies [ae54a24]
- Updated dependencies [8411ed5]
- Updated dependencies [c6bcedd]
  - @generative-ui/compiler-contract@0.2.0
  - @generative-ui/component-catalog-schema@0.2.0
  - @generative-ui/shared-types@0.2.0
  - @generative-ui/presentation-contract@0.2.0
