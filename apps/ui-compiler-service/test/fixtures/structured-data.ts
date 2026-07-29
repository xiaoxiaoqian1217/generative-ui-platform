export const structuredDataFixture = {
  zeta: {
    status: "ready",
    values: [1, 2, 3],
  },
  alpha: "first",
  nested: {
    beta: true,
    alpha: null,
  },
} as const;

export const dangerousStructuredFallbackFixture = `# Structured result

<script>alert("xss")</script>

[unsafe](javascript:alert("xss"))

Safe fallback text.
`;

export const dangerousStructuredFallbackTokens = [
  "<script",
  "javascript:",
] as const;
