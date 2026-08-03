import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: false,
  typographer: false,
});

markdown.renderer.rules.image = (tokens, index) => {
  const alt = markdown.utils.escapeHtml(tokens[index]?.content ?? "");
  return `<span class="markdown-image-blocked">[图片已阻止：${alt}]</span>`;
};

export function renderSafeMarkdown(source: string): string {
  return markdown.render(source);
}
