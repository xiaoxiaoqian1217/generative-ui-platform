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
      addedDefinitionCount: number;
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

function blankRangesPreservingLines(
  markdown: string,
  ranges: SourceRange[],
): string | undefined {
  ranges.sort((left, right) => left.start - right.start);

  const parts: string[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor || range.end > markdown.length) {
      return undefined;
    }

    parts.push(markdown.slice(cursor, range.start));
    parts.push(
      markdown.slice(range.start, range.end).replace(/[^\r\n]/g, " "),
    );
    cursor = range.end;
  }
  parts.push(markdown.slice(cursor));

  return parts.join("");
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
    return { success: true, markdown: input, addedDefinitionCount: 0 };
  }

  const blankedMarkdown = blankRangesPreservingLines(input, duplicateRanges);
  if (blankedMarkdown === undefined) {
    return { success: false };
  }
  let markdown = blankedMarkdown;

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

  return {
    success: true,
    markdown,
    addedDefinitionCount: nestedDefinitions.length,
  };
}

export function createMarkdownSanitizer(): MarkdownSanitizer {
  const baseSanitizer = createBaseMarkdownSanitizer();

  return {
    sanitize(input, limits) {
      if (
        !areMarkdownSanitizerLimitsValid(limits) ||
        Buffer.byteLength(input, "utf8") > limits.maxInputBytes ||
        !input.includes("]:")
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

      const maxAstNodes = limits.maxAstNodes + prepared.addedDefinitionCount;
      if (!Number.isSafeInteger(maxAstNodes)) {
        return internalFailure();
      }

      const preparedBytes = Buffer.byteLength(prepared.markdown, "utf8");
      return baseSanitizer.sanitize(prepared.markdown, {
        ...limits,
        maxInputBytes: Math.max(limits.maxInputBytes, preparedBytes),
        maxAstNodes,
      });
    },
  };
}
