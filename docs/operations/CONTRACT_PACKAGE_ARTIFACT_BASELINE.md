# 契约包构建产物基线

本基线记录 ADR-0012 约束下的可执行契约包构建产物。
测量日期为 2026-08-02。

## 测量方法

在仓库根目录运行 `pnpm build`。
以字节为单位测量未压缩的 `dist/index.js` 和 `dist/index.d.ts` 文件大小。
测量不包含依赖、source map、包归档文件和文件系统压缩。

| 包 | JavaScript 字节数 | 声明文件字节数 |
|---|---:|---:|
| `@generative-ui/shared-types` | 732 | 1,057 |
| `@generative-ui/presentation-contract` | 13,168 | 40,782 |
| `@generative-ui/runtime-contract` | 21,946 | 204,303 |
| `@generative-ui/component-catalog-schema` | 19,834 | 28,508 |
| `@generative-ui/compiler-contract` | 28,684 | 57,085 |
| `@generative-ui/ag-ui-adapter` | 17,769 | 71,083 |

## 比较规则

依赖升级时必须重新构建这些包并比较这些数值。
出现非预期大小变化时，必须在发布前检查生成的 JavaScript 和声明文件。
