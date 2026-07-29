<!-- cspell:ignore clobbering dompurify frontmatter iframe jsdom mailto mdast micromark noscript rehype remark srcdoc unist vbscript -->

# ADR-0014: 使用 MDAST 允许列表清理 Markdown

- **状态：** 已接受
- **日期：** 2026-07-29

## 背景

UI Compiler Service 接收来自外部业务 Agent 的 Markdown 和 JSON 结构化数据。
Markdown 内容以及结构化数据中的 `fallbackMarkdown` 都是不可信输入。
Requirements 要求 Markdown 在进入 Presentation Router、Model Adapter、UI Compiler Core、UI IR、A2UI、缓存、日志或公共输出前完成安全清理。
`PresentationResult` 的 Markdown 分支仍然以 Markdown 字符串作为公共输出，因此本决策不能把输出契约悄然改为 HTML。

Markdown 安全问题同时存在于两种语法中。
原始 HTML 可以携带 `script`、`iframe`、内联事件、`style`、SVG、MathML 和其他浏览器可执行结构。
Markdown Link、自动链接和引用式 Link 可以携带 `javascript:`、`vbscript:`、`data:`、`file:` 或经过大小写、字符引用和控制字符混淆的危险 URL。
图片可以触发外部请求、跟踪和内部网络访问。
未知 Markdown 扩展可能引入当前策略没有审计过的新 AST 节点或渲染语义。

Sanitized Markdown 不是可信 HTML。
Frontend Markdown Renderer 仍必须禁用原始 HTML、转义文本、校验链接目标，并应用适当的浏览器安全策略。
本 ADR 不实现 Frontend Markdown Renderer，也不让 Service 依赖浏览器或前端框架。

本 ADR 只固化 Markdown Sanitizer 的库、策略、接口、顺序、错误和测试方案。
本 ADR 不实现 Sanitizer、Presentation Router、Model Adapter、UI Compiler Core、HTTP Endpoint 或前端 Renderer。

## 决策驱动因素

候选方案按以下因素评估：

- 输入和输出都保持为 Markdown。
- 能够在结构化语法树上执行显式允许列表。
- 能够删除原始 HTML，并保留其外部的普通文本。
- 能够统一处理内联 Link、自动 Link、引用式 Link 和定义 URL。
- 能够对未知节点采取 fail-closed 行为。
- 支持 TypeScript strict mode 和 ESM。
- 不依赖 DOM、浏览器、前端框架或模型供应商。
- 依赖和策略可以隔离在 UI Compiler Service 内部。
- 可以通过稳定 Fixture 和属性测试验证幂等性与负向行为。
- 维护状态、升级路径和安全公告渠道清晰。

## 候选方案

### 候选 A: MDAST 解析、策略转换和 Markdown 重写

该方案使用 `mdast-util-from-markdown` 将 CommonMark 解析为 MDAST，使用项目自有的纯转换函数执行节点允许列表，再使用 `mdast-util-to-markdown` 输出规范化 Markdown。
URL 使用同一生态中的 `micromark-util-sanitize-uri` 进行规范化和协议允许列表处理。
如实现需要通用遍历工具，可以使用 `unist-util-visit`，但安全策略不得散落到第三方插件配置中。

该方案直接处理 Markdown 输入和 Markdown 输出。
MDAST 节点使 HTML、Link、Image、Definition、Code 和未知扩展具有可审查的结构边界。
项目仍需维护一段较小但安全敏感的 AST 转换代码，并为每一种允许、降级和拒绝行为提供负向测试。

### 候选 B: `markdown-it` Token 过滤

`markdown-it` 提供 CommonMark 模式、可关闭的 HTML 支持、Link 校验和成熟的 Token 流。
它的标准输出是 HTML，不提供与解析器对称的官方 Markdown Serializer。
如果继续返回 Markdown，项目必须自行维护 Token 到 Markdown 的完整序列化器，或者对原始字符串做位置替换。
前者会复制 Markdown Grammar，后者容易在嵌套、引用和转义场景产生遗漏。

该方案是可维护的 Markdown Renderer 选择，但不适合本仓库的 Markdown 到 Markdown 清理契约。

### 候选 C: Markdown 转 HTML、HTML Sanitizer、再转回 Markdown

该方案可以使用 `remark-rehype` 加 `rehype-sanitize`，或者使用 DOMPurify 加 `jsdom` 清理中间 HTML。
`rehype-sanitize` 对 HAST 使用 Schema 允许列表，DOMPurify 对 HTML、SVG 和 MathML 提供成熟的 XSS 防护。
两种路径都先把 Markdown 语义转换为 HTML，再尝试恢复 Markdown。
HTML 到 Markdown 的往返会改变结构、空白、引用、代码和扩展语义，并引入两套 AST 与更多插件顺序风险。
DOMPurify 在 Node.js 中还要求安全且及时更新的 DOM 实现，使 `jsdom` 成为安全可信计算基的一部分。

该方案适合最终输出 HTML 的 Renderer，但不适合当前 Service 的框架无关 Markdown 输出。

## 比较

| 维度 | MDAST 允许列表 | `markdown-it` Token 过滤 | HTML Sanitizer 往返 |
|---|---|---|---|
| 输入契约 | Markdown | Markdown | Markdown |
| 自然输出 | Markdown | HTML | HTML |
| 保持公共 Markdown 结果 | 直接满足 | 需要自建 Serializer | 需要 HTML 到 Markdown 转换 |
| 原始 HTML 控制 | 删除 `html` 节点 | `html: false` 或 Token 过滤 | HTML Schema 或 DOM 允许列表 |
| URL 控制 | AST 节点和 URI Utility | Link Hook 和 Token 过滤 | HTML 属性策略 |
| 未知扩展控制 | 节点允许列表 fail-closed | Rule 和 Token 类型控制 | 取决于转换插件和 HTML Schema |
| Node.js ESM | 满足 | 满足 | `rehype-sanitize` 满足，DOMPurify 需要 DOM |
| 浏览器或 DOM 依赖 | 无 | 无 | DOMPurify 服务端方案需要 `jsdom` |
| 主要维护风险 | 自有 AST Policy 正确性 | 自建 Markdown Serializer | 多阶段语义漂移和插件顺序 |
| 结论 | 采用 | 不采用 | 不采用 |

## 维护快照

以下快照来自 2026-07-29 的 npm Registry 和项目官方仓库。
版本只记录决策时的维护信号，不授权本 ADR 直接修改依赖。

| 包 | 决策时最新版本 | 维护信号 |
|---|---:|---|
| `mdast-util-from-markdown` | 2.0.3 | 2026-02 发布，Unified Collective 维护 |
| `mdast-util-to-markdown` | 2.1.2 | 2024-11 发布，Unified Collective 维护 |
| `unist-util-visit` | 5.1.0 | 2026-01 发布，Unified Collective 维护 |
| `markdown-it` | 14.3.0 | 2026-07 发布 |
| `rehype-sanitize` | 6.0.0 | ESM-only，基于 HAST Schema 允许列表 |
| `dompurify` | 3.4.12 | 2026-07 发布，服务端使用要求外部 DOM |
| `jsdom` | 30.0.1 | 2026-07 发布，属于 DOMPurify 服务端方案的安全依赖 |

## 决策

UI Compiler Service 的 Markdown Sanitizer 采用 MDAST 允许列表方案。
实现使用 `mdast-util-from-markdown` 和 `mdast-util-to-markdown`。
实现使用 `micromark-util-sanitize-uri` 规范化 URL 并执行协议允许列表。
只有实现确实需要时才增加 `unist-util-visit`，否则优先使用显式的纯递归转换。

MVP 只启用 CommonMark Parser。
MVP 不启用 GFM、MDX、Directive、Frontmatter、数学公式或任意第三方语法插件。
增加语法插件会扩展攻击面和允许节点集合，必须先修订本 ADR、更新 Policy Version 并增加负向测试。

Sanitizer 属于 UI Compiler Service 的应用边界模块。
它不得放入 `packages/ui-compiler-core`。
UI Compiler Core 不解析 Markdown，不选择展示模式，也不依赖这些库。

## 输入、输出和错误接口

实现应提供以下等价的内部接口。
这些接口属于 Service 内部边界，不修改 `presentation-contract` 的公共字符串字段。

```ts
declare const sanitizedMarkdownBrand: unique symbol;

type SanitizedMarkdown = string & {
  readonly [sanitizedMarkdownBrand]: "SanitizedMarkdown";
};

interface MarkdownSanitizerLimits {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxAstDepth: number;
  maxAstNodes: number;
}

type MarkdownSanitizationChange =
  | "html-removed"
  | "image-replaced-with-alt-text"
  | "unsafe-link-unwrapped"
  | "unsupported-node-unwrapped"
  | "unsupported-node-removed"
  | "code-info-normalized"
  | "markdown-normalized";

type MarkdownSanitizationFailureReason =
  | "input-limit-exceeded"
  | "ast-limit-exceeded"
  | "parse-failed"
  | "serialize-failed"
  | "output-limit-exceeded"
  | "empty-after-sanitization"
  | "internal-error";

type MarkdownSanitizationResult =
  | {
      success: true;
      markdown: SanitizedMarkdown;
      policyVersion: "1.0";
      changed: boolean;
      changes: readonly MarkdownSanitizationChange[];
    }
  | {
      success: false;
      error: {
        code: "MARKDOWN_SANITIZATION_FAILED";
        reason: MarkdownSanitizationFailureReason;
        retryable: false;
      };
    };

interface MarkdownSanitizer {
  sanitize(
    input: string,
    limits: MarkdownSanitizerLimits,
  ): MarkdownSanitizationResult;
}
```

`changes` 只记录变化类型和计数，不记录被删除的原文、URL、HTML 或代码。
公共 `PresentationError` 使用 `code = "MARKDOWN_SANITIZATION_FAILED"`、`stage = "content-serialization"` 和 `retryable = false`。
底层 Parser、Serializer 和 Library 的错误文本不得成为公共错误代码，也不得直接进入响应或日志。

`SanitizedMarkdown` 只是一种进程内类型门禁。
它不表示业务事实可信，也不表示内容已经成为安全 HTML。
序列化到 `PresentationResult.markdown` 时，该值仍是普通字符串。

## 清理顺序

Sanitizer 必须按以下顺序运行：

1. 使用 UTF-8 字节数校验 `maxInputBytes`。
2. 使用 CommonMark Parser 解析完整输入，不做正则表达式预清理。
3. 在任何深度递归转换前校验 `maxAstDepth` 和 `maxAstNodes`。
4. 收集引用式 Link Definition，并先校验 Definition URL。
5. 使用显式允许列表递归构造新的 MDAST，不在原树上保留未知字段。
6. 删除原始 HTML 节点，降级 Image，处理 Link 与 Definition URL，并规范化 Code Info。
7. 使用 `mdast-util-to-markdown` 序列化新的树。
8. 统一换行符和尾部换行，并校验 `maxOutputBytes`。
9. 拒绝清理后只包含空白的结果。
10. 返回带 `policyVersion = "1.0"` 的 `SanitizedMarkdown`。

实现不得使用正则表达式直接删除 HTML。
实现不得解析或执行 Script、Template、Directive、MDX、CSS、JavaScript 或 URL 内容。
实现不得通过删除未知字段之外的方式信任原始 AST 节点对象。

## CommonMark 允许结构

Policy Version 1.0 允许以下语义结构：

- Root。
- Paragraph 和 Text。
- Heading 1 到 6。
- Blockquote。
- Ordered List、Unordered List 和 List Item。
- Thematic Break 和 Hard Break。
- Emphasis 和 Strong。
- Inline Code 和 Fenced Code。
- Link、Link Reference 和 Definition，但 URL 必须通过本 ADR 的 URL Policy。

Fenced Code 的内容按惰性文本保留，不执行语法高亮或代码执行。
Code Info 只保留一个匹配 `[A-Za-z0-9][A-Za-z0-9_+-]{0,31}` 的语言标识。
Code Meta 一律删除。
不合法的 Code Info 一律删除。

## 危险 HTML 和内联脚本

所有 MDAST `html` 节点都不在允许列表中。
Sanitizer 删除 HTML Token，不区分所谓安全和危险标签。
因此 `script`、`style`、`iframe`、`object`、`embed`、`link`、`meta`、`base`、`form`、`input`、`button`、`svg`、`math`、`template`、`noscript`、HTML Comment 和自定义元素都无法进入输出。
`onclick`、`onerror`、`srcdoc`、内联 `style` 和其他属性随 HTML Token 一起删除。

HTML Tag 之间被 CommonMark Parser 识别为普通 Text 的内容可以保留为惰性文本。
例如删除 `<strong>` 和 `</strong>` 后可以保留两者之间的文本。
Script Body 即使保留为文本也不得重新解释为 HTML 或 JavaScript。
Frontend Renderer 禁止启用 Raw HTML，是这一保证成立的必要条件。

## URL Policy

Link URL 必须先经过 `micromark-util-sanitize-uri` 规范化。
绝对 URL 只允许 `https`、`http` 和 `mailto` 协议，协议匹配不区分大小写。
Fragment、Query 和相对路径允许保留。
以 `//` 或反斜杠开头的 Network Path 和混淆路径必须拒绝。
空 URL、控制字符 URL 和规范化失败 URL 必须拒绝。
`javascript`、`vbscript`、`data`、`file`、`blob`、`filesystem` 和所有未知协议必须拒绝。

危险或无效的 Link 不导致整个请求失败。
Sanitizer 删除 Link Wrapper 和 Title，只保留已经清理的可见子文本，并记录 `unsafe-link-unwrapped`。
引用式 Link 只有在 Definition 存在且 URL 合法时才能保留。
无效或缺失 Definition 的引用式 Link 降级为可见文本。
未被合法 Link 引用的 Definition 从输出中删除。

## Image 和不支持结构

Policy Version 1.0 不允许 Image 或 Image Reference。
Image 降级为经过清理的 Alt Text。
Alt Text 为空时删除整个 Image。
Image URL 和 Title 不进入输出，也不得被获取、探测或记录。

未知 MDAST 节点默认 fail-closed。
如果未知节点只包含可以递归清理的文本子节点，则移除未知 Wrapper 并保留安全子内容。
如果未知节点携带值、表达式、属性、数据或无法证明安全的结构，则删除整个节点。
未知 Root 级节点、MDX Expression、MDX JSX、Directive、Frontmatter、Footnote、Table 和任何插件节点都不得原样序列化。

未启用扩展时被 CommonMark Parser 识别为普通 Text 的字符仍是惰性文本，可以保留。
该规则不允许后续 Renderer 启用与 Service 不一致的扩展。
Service 和 Frontend Renderer 的 Markdown Dialect 必须通过后续集成契约保持一致。

## 调用顺序和信任边界

UI Compiler Service 必须在请求 Schema 和请求体大小校验之后立即清理所有 Markdown 字段。
Markdown Agent 内容的 `content.markdown` 必须在进入 Presentation Router 或 Model Adapter 前替换为 `SanitizedMarkdown`。
结构化 Agent 内容的 `fallbackMarkdown` 如果存在，也必须在进入 Router、Model Adapter、Core、缓存或日志前替换为 `SanitizedMarkdown`。
Markdown 编译输入的 `sourceData` 只能从已清理值构造为 `{ "markdown": sanitizedMarkdown }`。
Core 的 `fallbackMarkdown` 只能来自已清理值或经过相同 Sanitizer 处理的确定性结构化数据序列化结果。

Router、Model Adapter、Core、Cache 和 Logger 的内部接口不得接受原始 Markdown 字符串。
日志只记录请求标识、Policy Version、变化类型计数、结果状态、耗时和稳定错误代码。
日志不得记录原始 Markdown、Sanitized Markdown、被删除的 HTML 或被拒绝的 URL。

公共 `PresentationResult` 映射前必须再次通过相同 Policy 进行防御性清理。
第二次清理必须是幂等的，并且不得恢复第一次删除的结构。
如果第二次清理异常失败，Service 不得返回第一次清理结果作为绕过路径。

```text
PresentationRequest
        |
        v
Request Schema and byte limits
        |
        v
Markdown Sanitizer Policy 1.0
        |
        +--> Sanitized content for Router and Model Adapter
        |
        +--> Sanitized sourceData and fallbackMarkdown for Core
        |
        +--> Metadata-only logging
        |
        v
PresentationResult Mapper
        |
        v
Defensive Markdown Sanitizer Policy 1.0
        |
        v
Public Markdown output
```

## 配置

安全 Policy 是版本化常量，不是请求级配置。
调用方、业务 Agent、Model Adapter 和 UI Plan Candidate 都不能增加允许节点、协议或 HTML。
Policy Version 1.0 只允许本 ADR 明确列出的结构和 URL。

运行配置只允许注入 `MarkdownSanitizerLimits`。
所有 Limit 必须是有限正整数，并在 Service 启动时验证。
`maxInputBytes` 必须与 HTTP 请求体和 `PresentationRequest` 资源策略协调。
`maxOutputBytes` 必须防止规范化和转义造成无界输出放大。
`maxAstDepth` 和 `maxAstNodes` 必须在递归转换前执行。
默认值由 Sanitizer 实现 Issue 在阶段三集成测试前确定，并写入版本化配置与边界测试。

任何放宽节点、URL 或 Dialect 的变更都需要修订本 ADR、提升 Policy Version 并增加安全测试。
只收紧 Policy 的变更也必须评估是否会拒绝或改变既有有效输出。

## 错误处理和安全降级

删除危险 HTML、降级 Image、展开危险 Link 和删除不支持结构属于成功清理，不属于 Sanitizer 失败。
只要输出仍有非空可消费内容，Sanitizer 返回成功和变化摘要。

Parser、Serializer、资源限制、空结果和未分类内部异常统一映射为 `MARKDOWN_SANITIZATION_FAILED`。
错误中只包含稳定 `reason`，不包含原始内容、Library Stack、Parser Position 或危险 URL。

Markdown Agent 内容清理失败时，Service 不得调用 Router、Model Adapter 或 Core。
如果没有其他安全内容，Service 返回 `status = "failed"` 和固定的安全消息。
Service 不得把原始 Markdown 作为 Fallback。

结构化数据的 `fallbackMarkdown` 清理失败时，Service 可以忽略该 Fallback，并对已经通过资源校验的完整 JSON 运行确定性 Structured Data Serializer。
Serializer 结果必须再通过相同 Markdown Sanitizer。
如果该路径成功，Service 可以返回安全 Markdown，并保留 `MARKDOWN_SANITIZATION_FAILED` 诊断。
如果该路径也失败，Service 返回完整失败。

任何输出阶段的防御性清理失败都不得返回先前字符串。
Service 只能使用经过同一 Policy 验证的其他安全内容，或者返回固定的纯文本错误。

## 测试策略

实现 Issue 必须先建立端到端 Fixture，证明原始 Markdown 不会进入 Router、Model Adapter、Core、Cache、Logger 或公共输出。
单元测试、集成测试和属性测试必须覆盖以下范围。

### 正向测试

- Paragraph、Heading、Blockquote、List、Emphasis、Strong、Code 和合法 Link 保留。
- CommonMark Parse 和 Serialize 后语义稳定。
- `https`、`http`、`mailto`、Fragment、Query 和相对路径按 Policy 保留。
- 引用式 Link 和 Definition 在 URL 合法时保持一致。
- Code 内容中的 HTML 和 JavaScript 只作为惰性文本保留。
- 第一次和第二次清理输出完全相同。

### HTML 和脚本负向测试

- `script`、`style`、`iframe`、`object`、`embed`、`svg`、`math`、`template` 和 HTML Comment 被删除。
- `onclick`、`onerror`、`srcdoc`、内联 `style` 和其他事件属性无法进入输出。
- 大小写混淆、错误嵌套、未闭合 Tag 和 Character Reference 变体不会恢复 HTML。
- HTML Tag 外的普通可见文本按策略保留。
- Script Body 不会成为可执行节点。

### URL 负向测试

- `javascript:`、`vbscript:`、`data:`、`file:`、`blob:`、`filesystem:` 和未知协议被拒绝。
- 协议大小写、字符引用、百分号编码、控制字符、空白和换行混淆被拒绝。
- Network Path、反斜杠路径和空 URL 被拒绝。
- 内联 Link、自动 Link、引用式 Link 和 Definition 使用相同策略。
- 危险 Link 只保留安全可见文本。

### 结构和资源负向测试

- Image 和 Image Reference 只保留安全 Alt Text。
- MDX、Directive、Frontmatter、Footnote、Table 和伪造未知节点不会原样序列化。
- 超过输入字节、输出字节、AST 深度和 AST 节点数量的输入稳定失败。
- 清理后为空的输入稳定失败。
- Parser 和 Serializer 异常不泄露 Stack 或原文。
- 恶意深层 List、Link 和 Emphasis 组合不会导致无界递归或长时间阻塞。

### 集成和信任边界测试

- Router 和 Model Adapter Spy 只观察到已清理 Markdown。
- Core Spy 只观察到 `{ "markdown": sanitizedMarkdown }` 和已清理 Fallback。
- Cache 和 Logger Spy 不观察到原始 Markdown、被删除 HTML 或危险 URL。
- 直接 Markdown Result 和 degraded Markdown Result 都经过输出阶段防御性清理。
- 结构化数据的非法 `fallbackMarkdown` 可以安全切换到确定性 Serializer。
- Sanitize 失败时 Router、Model Adapter 和 Core 调用次数为零。

### 属性和差分测试

- `sanitize(sanitize(input))` 与 `sanitize(input)` 完全相等。
- 输出重新解析后只包含允许节点。
- 输出中不存在 MDAST `html`、Image、未知节点或危险 URL。
- 任意失败只返回稳定错误代码和安全原因。
- 使用 CommonMark 官方 Fixture 验证 Parser 与 Serializer 升级没有意外语义漂移。
- 对 URL Corpus、XSS Corpus 和历史回归 Fixture 执行差分测试。

安全 Fixture 必须保存在仓库中并经过人工审查。
测试不得从网络动态下载攻击样例。
测试不得对第三方 Library 的自然语言错误文本断言。

## 依赖和升级约束

Sanitizer 依赖只能由 UI Compiler Service 或未来明确的 Service 内部包持有。
`presentation-contract` 和 `ui-compiler-core` 不得依赖 MDAST、Micromark、DOM 或 HTML Sanitizer。
所有依赖必须使用 ESM 入口，并由 Lockfile 固定实际版本。

实现时必须记录直接和传递依赖，运行 License、Vulnerability、独立 ESM Import 和 Bundle Size 检查。
Parser、Serializer 或 URI Utility 的 Major Upgrade 必须运行全部 CommonMark、XSS、URL、资源和幂等性测试。
如果升级改变有效输入、规范化输出、错误语义或允许结构，必须提升 Policy Version 并提供迁移说明。

不得通过启用 `allowDangerousHtml`、Raw HTML Plugin、MDX Plugin、任意 URI Hook 或不受控的第三方 Remark Plugin 放宽本决策。
不得把 Sanitizer 的安全性建立在 Frontend Framework 的默认行为上。

## 后果

- Markdown 在 Service 边界处获得确定性、可测试和版本化的安全表示。
- 普通 Markdown 和编译 Fallback 使用同一套 Policy。
- 原始未清理 Markdown 不会进入 Router、Model Adapter、Core、缓存、日志或输出。
- 公共 `PresentationResult` 继续返回 Markdown，不需要改为 HTML。
- UI Compiler Core 的职责和依赖保持不变。
- Service 需要维护一段安全敏感的 MDAST Allowlist Transform。
- CommonMark 之外的扩展暂不支持。
- Image 被降级为 Alt Text，可能减少表现力，但避免远程加载和跟踪。
- Markdown 规范化可能改变无语义意义的空白、标记风格和转义。
- 前端 Renderer 仍必须禁用 Raw HTML 并遵守相同 Dialect，Sanitized Markdown 不能替代 Renderer 端防护。

## 取代关系

本 ADR 细化 ADR-0005、ADR-0006 和 ADR-0007 的 Markdown 清理要求。
这些 ADR 的展示路由、结构化内容、Catalog 注入和 Core 边界决策继续有效。
本 ADR 不改变 ADR-0009 的 Markdown 降级链，也不改变 ADR-0013 的协议归属。

## 参考资料

- [remark 官方仓库](https://github.com/remarkjs/remark)
- [MDAST Parser 官方仓库](https://github.com/syntax-tree/mdast-util-from-markdown)
- [MDAST Serializer 官方仓库](https://github.com/syntax-tree/mdast-util-to-markdown)
- [Micromark URI Sanitizer 官方文档](https://github.com/micromark/micromark/tree/main/packages/micromark-util-sanitize-uri)
- [markdown-it 官方仓库](https://github.com/markdown-it/markdown-it)
- [rehype-sanitize 官方仓库](https://github.com/rehypejs/rehype-sanitize)
- [DOMPurify 官方仓库](https://github.com/cure53/DOMPurify)
