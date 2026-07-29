import type { ValidatedStructuredData } from "./structured-data-validator.js";

export interface StructuredDataSerializer {
  serialize(value: ValidatedStructuredData): string;
}

const MAX_MARKDOWN_WRAPPER_OVERHEAD_BYTES = 16;

export function maximumSerializedMarkdownBytes(
  maxCanonicalJsonBytes: number,
): number {
  return maxCanonicalJsonBytes * 3 + MAX_MARKDOWN_WRAPPER_OVERHEAD_BYTES;
}

function createCodeFence(content: string): string {
  const runs = content.match(/`+/gu) ?? [];
  const longestRun = runs.reduce(
    (longest, run) => Math.max(longest, run.length),
    0,
  );
  return "`".repeat(Math.max(3, longestRun + 1));
}

export function createStructuredDataSerializer(): StructuredDataSerializer {
  return {
    serialize(value) {
      const fence = createCodeFence(value.canonicalJson);
      return `${fence}json\n${value.canonicalJson}\n${fence}\n`;
    },
  };
}
