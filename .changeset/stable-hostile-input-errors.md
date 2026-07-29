---
"@generative-ui/ui-compiler-core": patch
---

在 Core 输入边界对顶层字段执行单次受保护快照，确保恶意 getter 或代理访问失败稳定映射为输入错误，并防止失败降级路径再次抛出异常。
