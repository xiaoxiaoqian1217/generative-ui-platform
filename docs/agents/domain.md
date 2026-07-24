# 领域文档

本文件定义工程技能如何读取仓库的领域文档。

## 开始探索前

- 读取仓库根目录的 `CONTEXT.md`。
- 如果根目录存在 `CONTEXT-MAP.md`，先读取该文件，再读取与当前主题相关的各个 context 文件。
- 读取 `docs/adr/` 中影响当前工作区域的 ADR。
- 在 multi-context 仓库中，还需要检查各 context 自己的 ADR 目录。

如果这些文件不存在，直接继续，不需要提示文件缺失。
不要预先建议创建这些文件。
`domain-modeling`、`grill-with-docs` 和 `improve-codebase-architecture` 技能会在领域术语或技术决策形成时按需创建它们。

## 文件结构

本仓库使用 single-context 布局：

```text
/
|-- CONTEXT.md
|-- docs/
|   `-- adr/
|-- apps/
`-- packages/
```

multi-context 仓库使用根目录的 `CONTEXT-MAP.md` 指向各 context 的 `CONTEXT.md`。
这类仓库还可以包含各 context 自己的 ADR 目录。

## 使用 glossary 中的词汇

输出中出现领域概念时，使用 `CONTEXT.md` 定义的术语。
这项规则适用于 Issue 标题、重构提案、假设和测试名称。
不要改用 glossary 明确排除的同义词。

如果 glossary 中缺少需要使用的概念，先重新考虑该术语是否属于项目领域。
如果这确实暴露了领域模型缺口，则记录下来并交给 `domain-modeling` 处理。

## 标记 ADR 冲突

如果拟议工作与现有 ADR 冲突，必须明确指出冲突，不得静默覆盖已有决策。
