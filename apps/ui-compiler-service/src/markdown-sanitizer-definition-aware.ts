import type { Definition, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import {
  areMarkdownSanitizerLimitsValid,
  createMarkdownSanitizer as createBaseMarkdownSanitizer,
  type MarkdownSanitizationResult,
  type MarkdownSanitizer,
  type MarkdownSanitizerLimits,
} from "./markdown-sanitizer.js";

interface AstPosition {
  start?: {
    offset?: number;
  };
  end?: {
    offset?: number;
  };
}

interface AstNode {
  type: string;
  children?: AstNode[];
  identifier?: string;
  label?: string | null;
  url?: string;
  title?: string | null;
  position?: AstPosition;
}

interface TraversalEntry {
  node: AstNode;
  depth: number;
}

interface SourceRange {
  start: number;
  end: number;
}

type DefinitionPreparationResult =
  | {
      success: true;
      markdown: string;
    }
  | {
      success: false;
    };

function internalFailure(): MarkdownSanitizationResult {
  return {
    success: false,
    error: {
      code: "MARKDOWN_SANITIZATION_FAILED",
      reason: "internal-error",
      retryable: false,
    },
  };
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().replace(/\s+/g, " ").toLowerCase();
}

function exceedsAstLimits(
  root: AstNode,
  limits: MarkdownSanitizerLimits,
): boolean {
  const pending: TraversalEntry[] = [{ node: root, depth: 1 }];
  let nodeCount = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      continue;
    }

    nodeCount += 1;
    if (
      nodeCount > limits.maxAstNodes ||
      current.depth > limits.maxAstDepth
    ) {
      return true;
    }

    const children = current.node.children;
    if (children === undefined) {
      continue;
    }
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child !== undefined) {
        pending.push({ node: child, depth: current.depth + 1 });
      }
    }
  }

  return false;
}

function sourceRange(node: AstNode): SourceRange | undefined {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" &&
    typeof end === "number" &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    end >= start
    ? { start, end }
    : undefined;
}

function toDefinition(node: AstNode): Definition | undefined {
  if (
    node.type !== "definition" ||
    typeof node.identifier !== "string" ||
    typeof node.url !== "string"
  ) {
    return undefined;
  }

  return {
    type: "definition",
    identifier: node.identifier,
    url: node.url,
    ...(typeof node.label === "string" ? { label: node.label } : {}),
    ...(typeof node.title === "string" ? { title: node.title } : {}),
  };
}

function blankRangePreservingLines(
  markdown: string,
  range: SourceRange,
): string {
  const segment = markdown.slice(range.start, range.end);
  let replacement = "";
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index];
    replacement += character === "\n" || character === "\r" ? character : " ";
  }
  return `${markdown.slice(0, range.start)}${replacement}${markdown.slice(
    range.end,
  )}`;
}

function prepareDefinitionSemantics(
  input: string,
  root: AstNode,
): DefinitionPreparationResult {
  const seenIdentifiers = new Set<string>();
  const duplicateRanges: SourceRange[] = [];
  const nestedDefinitions: Definition[] = [];
  const rootChildren = root.children ?? [];
  const pending: TraversalEntry[] = [];

  for (let index = rootChildren.length - 1; index >= 0; index -= 1) {
    const child = rootChildren[index];
    if (child !== undefined) {
      pending.push({ node: child, depth: 1 });
    }
  }

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      continue;
    }

    const definition = toDefinition(current.node);
    if (definition !== undefined) {
      const identifier = normalizeIdentifier(definition.identifier);
      if (seenIdentifiers.has(identifier)) {
        const range = sourceRange(current.node);
        if (range === undefined) {
          return { success: false };
        }
        duplicateRanges.push(range);
        continue;
      }

      seenIdentifiers.add(identifier);
      if (current.depth > 1) {
        nestedDefinitions.push(definition);
      }
      continue;
    }

    const children = current.node.children;
    if (children === undefined) {
      continue;
    }
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child !== undefined) {
        pending.push({ node: child, depth: current.depth + 1 });
      }
    }
  }

  if (duplicateRanges.length === 0 && nestedDefinitions.length === 0) {
    return { success: true, markdown: input };
  }

  duplicateRanges.sort((left, right) => right.start - left.start);
  let markdown = input;
  for (const range of duplicateRanges) {
    markdown = blankRangePreservingLines(markdown, range);
  }

  if (nestedDefinitions.length > 0) {
    let serializedDefinitions: string;
    try {
      serializedDefinitions = toMarkdown({
        type: "root",
        children: nestedDefinitions,
      } as Root);
    } catch {
      return { success: false };
    }

    const separator = markdown.endsWith("\n") ? "\n" : "\n\n";
    markdown = `${markdown}${separator}${serializedDefinitions}`;
  }

  return { success: true, markdown };
}

export function createMarkdownSanitizer(): MarkdownSanitizer {
  const baseSanitizer = createBaseMarkdownSanitizer();

  return {
    sanitize(input, limits) {
      if (
        !areMarkdownSanitizerLimitsValid(limits) ||
        Buffer.byteLength(input, "utf8") > limits.maxInputBytes ||
        !input.includes("]: ")
      ) {
        return baseSanitizer.sanitize(input, limits);
      }

      let root: Root;
      try {
        root = fromMarkdown(input);
      } catch {
        return baseSanitizer.sanitize(input, limits);
      }

      if (exceedsAstLimits(root as AstNode, limits)) {
        return baseSanitizer.sanitize(input, limits);
      }

      const prepared = prepareDefinitionSemantics(input, root as AstNode);
      if (!prepared.success) {
        return internalFailure();
      }

      const preparedBytes = Buffer.byteLength(prepared.markdown, "utf8");
      return baseSanitizer.sanitize(prepared.markdown, {
        ...limits,
        maxInputBytes: Math.max(limits.maxInputBytes, preparedBytes),
      });
    },
  };
}
