export const safeMarkdownFixture = `# 发布状态

- 所有检查已通过
- [查看文档](https://example.com/docs)

\`\`\`ts
const status = "ready";
\`\`\`
`;

export const dangerousMarkdownFixture = `# 发布状态

<script>alert("xss")</script>

<iframe src="https://attacker.example"></iframe>

[危险链接](javascript:alert("xss"))

[编码危险链接](javascript%3Aalert%281%29)

![跟踪图片](https://tracker.example/pixel.gif)

安全说明仍然保留。
`;

export const dangerousMarkdownTokens = [
  "<script",
  "<iframe",
  "javascript:",
  "javascript%3A",
  "tracker.example",
] as const;

export const dangerousHtmlCorpus = [
  '<ScRiPt src="https://attacker.example/x.js">alert(1)</sCrIpT>',
  "<style>body { background: url(https://attacker.example) }</style>",
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<object data="data:text/html,danger"></object>',
  '<embed src="https://attacker.example/payload">',
  "<svg><script>alert(1)</script></svg>",
  '<math><mi onclick="alert(1)">x</mi></math>',
  '<template><img src=x onerror="alert(1)"></template>',
  '<div onclick="alert(1)" style="behavior:url(x)">unsafe</div>',
  "<!-- <script>alert(1)</script> -->",
  "<script>unclosed",
  "&lt;script&gt;alert(1)&lt;/script&gt;",
] as const;

export const dangerousUrlCorpus = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "javascript%3Aalert%281%29",
  "javascript%253Aalert%25281%2529",
  "java%73cript%3Aalert(1)",
  "vbscript:msgbox(1)",
  "data:text/html;base64,PHNjcmlwdD4=",
  "file:///etc/passwd",
  "blob:https://example.com/id",
  "filesystem:https://example.com/path",
  "custom-protocol:value",
  "//attacker.example/path",
  "%2F%2Fattacker.example/path",
  "\\\\attacker.example\\path",
  "https:%5C%5Cattacker.example/path",
  "javascript%0A:alert(1)",
  "javascript%09:alert(1)",
] as const;
