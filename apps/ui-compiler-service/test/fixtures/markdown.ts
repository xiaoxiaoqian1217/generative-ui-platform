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
