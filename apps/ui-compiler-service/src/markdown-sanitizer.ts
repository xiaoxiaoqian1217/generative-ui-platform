import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { sanitizeUri } from "micromark-util-sanitize-uri";

export const MARKDOWN_SANITIZER_POLICY_VERSION = "1.0" as const;

declare const sanitizedMarkdownBrand: unique symbol;

export type SanitizedMarkdown = string & {
  readonly [sanitizedMarkdownBrand]: "SanitizedMarkdown";
};

export interface MarkdownSanitizerLimits {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxAstDepth: number;
  maxAstNodes: number;
}

export const DEFAULT_MARKDOWN_SANITIZER_LIMITS: Readonly<MarkdownSanitizerLimits> =
  Object.freeze({
    maxInputBytes: 256 * 1024,
    maxOutputBytes: 512 * 1024,
    maxAstDepth: 64,
    maxAstNodes: 20_000,
  });

export type MarkdownSanitizationChange =
  | "html-removed"
  | "image-replaced-with-alt-text"
  | "unsafe-link-unwrapped"
  | "unsupported-node-unwrapped"
  | "unsupported-node-removed"
  | "code-info-normalized"
  | "markdown-normalized";

export type MarkdownSanitizationFailureReason =
  | "input-limit-exceeded"
  | "ast-limit-exceeded"
  | "parse-failed"
  | "serialize-failed"
  | "output-limit-exceeded"
  | "empty-after-sanitization"
  | "internal-error";

export type MarkdownSanitizationResult =
  | {
      success: true;
      markdown: SanitizedMarkdown;
      policyVersion: typeof MARKDOWN_SANITIZER_POLICY_VERSION;
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

export interface MarkdownSanitizer {
  sanitize(
    input: string,
    limits: MarkdownSanitizerLimits,
  ): MarkdownSanitizationResult;
}

interface AstNode {
  type: string;
  children?: AstNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  spread?: boolean;
  lang?: string | null;
  meta?: string | null;
  url?: string;
  title?: string | null;
  identifier?: string;
  label?: string | null;
  referenceType?: "shortcut" | "collapsed" | "full";
  alt?: string | null;
  position?: {
    start?: {
      offset?: number;
    };
  };
}

type NodeContext = "root" | "block" | "list" | "phrasing";

const changeOrder: readonly MarkdownSanitizationChange[] = [
  "html-removed",
  "image-replaced-with-alt-text",
  "unsafe-link-unwrapped",
  "unsupported-node-unwrapped",
  "unsupported-node-removed",
  "code-info-normalized",
  "markdown-normalized",
];

const allowedLinkProtocols = /^(https?|mailto)$/i;
const codeLanguagePattern = /^[A-Za-z0-9][A-Za-z0-9_+-]{0,31}$/;
const safeUnknownNodeKeys = new Set(["type", "children", "position"]);

function failure(
  reason: MarkdownSanitizationFailureReason,
): MarkdownSanitizationResult {
  return {
    success: false,
    error: {
      code: "MARKDOWN_SANITIZATION_FAILED",
      reason,
      retryable: false,
    },
  };
}

export function areMarkdownSanitizerLimitsValid(
  limits: MarkdownSanitizerLimits,
): boolean {
  return (
    Number.isSafeInteger(limits.maxInputBytes) &&
    limits.maxInputBytes > 0 &&
    Number.isSafeInteger(limits.maxOutputBytes) &&
    limits.maxOutputBytes > 0 &&
    Number.isSafeInteger(limits.maxAstDepth) &&
    limits.maxAstDepth > 0 &&
    Number.isSafeInteger(limits.maxAstNodes) &&
    limits.maxAstNodes > 0
  );
}

export function createDefensiveMarkdownSanitizerLimits(
  limits: MarkdownSanitizerLimits,
): MarkdownSanitizerLimits {
  return {
    ...limits,
    maxInputBytes: limits.maxOutputBytes,
  };
}

function exceedsAstLimits(
  root: AstNode,
  limits: MarkdownSanitizerLimits,
): boolean {
  const pending: { node: AstNode; depth: number }[] = [
    { node: root, depth: 1 },
  ];
  let nodes = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      continue;
    }
    nodes += 1;
    if (nodes > limits.maxAstNodes || current.depth > limits.maxAstDepth) {
      return true;
    }
    if (Array.isArray(current.node.children)) {
      for (const child of current.node.children) {
        pending.push({ node: child, depth: current.depth + 1 });
      }
    }
  }

  return false;
}

function decodeUrlForPolicy(url: string): string | undefined {
  let decoded = url;

  for (let index = 0; index < 4; index += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return undefined;
    }
    if (next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
}

function containsAsciiControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code !== undefined && (code <= 0x1f || code === 0x7f)) {
      return true;
    }
  }
  return false;
}

function sanitizeLinkUrl(url: string): string | undefined {
  const trimmed = url.trim();
  if (
    trimmed.length === 0 ||
    containsAsciiControlCharacter(trimmed) ||
    trimmed.includes("\\")
  ) {
    return undefined;
  }

  const decoded = decodeUrlForPolicy(trimmed);
  if (
    decoded === undefined ||
    containsAsciiControlCharacter(decoded) ||
    decoded.startsWith("//") ||
    decoded.includes("\\")
  ) {
    return undefined;
  }

  const decodedScheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(decoded)?.[1];
  if (
    decodedScheme !== undefined &&
    !allowedLinkProtocols.test(decodedScheme)
  ) {
    return undefined;
  }

  const sanitized = sanitizeUri(trimmed, allowedLinkProtocols);
  return sanitized.length > 0 ? sanitized : undefined;
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().replace(/\s+/g, " ").toLowerCase();
}

interface SafeDefinition {
  identifier: string;
  label?: string;
  url: string;
  title?: string;
}

function collectSafeDefinitions(root: AstNode): Map<string, SafeDefinition> {
  const definitions = new Map<string, SafeDefinition>();

  for (const node of root.children ?? []) {
    if (
      node.type !== "definition" ||
      typeof node.identifier !== "string" ||
      typeof node.url !== "string"
    ) {
      continue;
    }
    const url = sanitizeLinkUrl(node.url);
    if (url === undefined) {
      continue;
    }
    const definition: SafeDefinition = {
      identifier: node.identifier,
      url,
    };
    if (typeof node.label === "string") {
      definition.label = node.label;
    }
    if (typeof node.title === "string") {
      definition.title = node.title;
    }
    definitions.set(normalizeIdentifier(node.identifier), definition);
  }

  return definitions;
}

interface TransformState {
  changes: Set<MarkdownSanitizationChange>;
  definitions: Map<string, SafeDefinition>;
  referencedDefinitions: Set<string>;
  source: string;
}

function isFencedCodeNode(node: AstNode, source: string): boolean {
  const offset = node.position?.start?.offset;
  return (
    offset !== undefined &&
    (source.startsWith("```", offset) || source.startsWith("~~~", offset))
  );
}

function childContext(type: string): NodeContext | undefined {
  switch (type) {
    case "root":
    case "blockquote":
    case "listItem":
      return type === "root" ? "root" : "block";
    case "list":
      return "list";
    case "paragraph":
    case "heading":
    case "emphasis":
    case "strong":
    case "link":
    case "linkReference":
      return "phrasing";
    default:
      return undefined;
  }
}

function isAllowedInContext(type: string, context: NodeContext): boolean {
  if (context === "list") {
    return type === "listItem";
  }
  if (context === "phrasing") {
    return [
      "text",
      "emphasis",
      "strong",
      "inlineCode",
      "break",
      "link",
      "linkReference",
      "image",
      "imageReference",
      "html",
    ].includes(type);
  }
  return [
    "paragraph",
    "heading",
    "blockquote",
    "list",
    "thematicBreak",
    "code",
    "html",
    "definition",
  ].includes(type);
}

function transformChildren(
  node: AstNode,
  context: NodeContext,
  state: TransformState,
): AstNode[] {
  const transformed: AstNode[] = [];
  for (const child of node.children ?? []) {
    transformed.push(...transformNode(child, context, state));
  }
  return transformed;
}

function transformUnknownNode(
  node: AstNode,
  context: NodeContext,
  state: TransformState,
): AstNode[] {
  const onlySafeKeys = Object.keys(node).every((key) =>
    safeUnknownNodeKeys.has(key),
  );
  if (onlySafeKeys && Array.isArray(node.children)) {
    state.changes.add("unsupported-node-unwrapped");
    return transformChildren(node, context, state);
  }

  state.changes.add("unsupported-node-removed");
  return [];
}

function transformNode(
  node: AstNode,
  context: NodeContext,
  state: TransformState,
): AstNode[] {
  if (!isAllowedInContext(node.type, context)) {
    return transformUnknownNode(node, context, state);
  }

  if (node.type === "html") {
    state.changes.add("html-removed");
    return [];
  }
  if (node.type === "definition") {
    return [];
  }
  if (node.type === "image" || node.type === "imageReference") {
    state.changes.add("image-replaced-with-alt-text");
    return typeof node.alt === "string" && node.alt.length > 0
      ? [{ type: "text", value: node.alt }]
      : [];
  }
  if (node.type === "text" || node.type === "inlineCode") {
    return typeof node.value === "string"
      ? [{ type: node.type, value: node.value }]
      : [];
  }
  if (node.type === "break" || node.type === "thematicBreak") {
    return [{ type: node.type }];
  }
  if (node.type === "code") {
    if (typeof node.value !== "string") {
      return [];
    }
    if (!isFencedCodeNode(node, state.source)) {
      state.changes.add("unsupported-node-removed");
      return [];
    }
    const transformed: AstNode = { type: "code", value: node.value };
    if (typeof node.lang === "string" && codeLanguagePattern.test(node.lang)) {
      transformed.lang = node.lang;
    } else if (node.lang !== null && node.lang !== undefined) {
      state.changes.add("code-info-normalized");
    }
    if (node.meta !== null && node.meta !== undefined) {
      state.changes.add("code-info-normalized");
    }
    return [transformed];
  }
  if (node.type === "link") {
    const children = transformChildren(node, "phrasing", state);
    if (children.length === 0) {
      return [];
    }
    const url =
      typeof node.url === "string" ? sanitizeLinkUrl(node.url) : undefined;
    if (url === undefined) {
      state.changes.add("unsafe-link-unwrapped");
      return children;
    }
    const transformed: AstNode = { type: "link", url, children };
    if (typeof node.title === "string") {
      transformed.title = node.title;
    }
    return [transformed];
  }
  if (node.type === "linkReference") {
    const children = transformChildren(node, "phrasing", state);
    if (children.length === 0) {
      return [];
    }
    if (typeof node.identifier !== "string") {
      state.changes.add("unsafe-link-unwrapped");
      return children;
    }
    const normalizedIdentifier = normalizeIdentifier(node.identifier);
    if (!state.definitions.has(normalizedIdentifier)) {
      state.changes.add("unsafe-link-unwrapped");
      return children;
    }
    state.referencedDefinitions.add(normalizedIdentifier);
    return [
      {
        type: "linkReference",
        identifier: node.identifier,
        ...(typeof node.label === "string" ? { label: node.label } : {}),
        referenceType: node.referenceType ?? "full",
        children,
      },
    ];
  }

  const nestedContext = childContext(node.type);
  if (nestedContext === undefined) {
    return transformUnknownNode(node, context, state);
  }
  const children = transformChildren(node, nestedContext, state);

  switch (node.type) {
    case "paragraph":
    case "blockquote":
    case "emphasis":
    case "strong":
    case "listItem":
      return children.length === 0 ? [] : [{ type: node.type, children }];
    case "heading":
      return typeof node.depth === "number" &&
        node.depth >= 1 &&
        node.depth <= 6 &&
        children.length > 0
        ? [{ type: "heading", depth: node.depth, children }]
        : [];
    case "list": {
      const transformed: AstNode = {
        type: "list",
        ordered: node.ordered === true,
        children,
      };
      if (children.length === 0) {
        return [];
      }
      if (node.ordered === true && typeof node.start === "number") {
        transformed.start = node.start;
      }
      return [transformed];
    }
    default:
      return transformUnknownNode(node, context, state);
  }
}

function buildSafeRoot(root: AstNode, state: TransformState): Root {
  const children = transformChildren(root, "root", state);

  for (const identifier of state.referencedDefinitions) {
    const definition = state.definitions.get(identifier);
    if (definition === undefined) {
      continue;
    }
    children.push({
      type: "definition",
      identifier: definition.identifier,
      url: definition.url,
      ...(definition.label === undefined ? {} : { label: definition.label }),
      ...(definition.title === undefined ? {} : { title: definition.title }),
    });
  }

  return { type: "root", children } as Root;
}

function canonicalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n?/g, "\n").replace(/\n*$/u, "\n");
}

export function createMarkdownSanitizer(): MarkdownSanitizer {
  return {
    sanitize(input, limits) {
      if (!areMarkdownSanitizerLimitsValid(limits)) {
        return failure("internal-error");
      }
      if (Buffer.byteLength(input, "utf8") > limits.maxInputBytes) {
        return failure("input-limit-exceeded");
      }

      let parsed: Root;
      try {
        parsed = fromMarkdown(input);
      } catch {
        return failure("parse-failed");
      }

      let state: TransformState;
      let safeRoot: Root;
      try {
        if (exceedsAstLimits(parsed as AstNode, limits)) {
          return failure("ast-limit-exceeded");
        }
        state = {
          changes: new Set(),
          definitions: collectSafeDefinitions(parsed as AstNode),
          referencedDefinitions: new Set(),
          source: input,
        };
        safeRoot = buildSafeRoot(parsed as AstNode, state);
      } catch {
        return failure("internal-error");
      }

      let markdown: string;
      try {
        markdown = canonicalizeMarkdown(toMarkdown(safeRoot));
      } catch {
        return failure("serialize-failed");
      }

      if (Buffer.byteLength(markdown, "utf8") > limits.maxOutputBytes) {
        return failure("output-limit-exceeded");
      }
      if (markdown.trim().length === 0) {
        return failure("empty-after-sanitization");
      }

      if (markdown !== canonicalizeMarkdown(input)) {
        state.changes.add("markdown-normalized");
      }
      const changes = changeOrder.filter((change) => state.changes.has(change));

      return {
        success: true,
        markdown: markdown as SanitizedMarkdown,
        policyVersion: MARKDOWN_SANITIZER_POLICY_VERSION,
        changed: changes.length > 0,
        changes,
      };
    },
  };
}
