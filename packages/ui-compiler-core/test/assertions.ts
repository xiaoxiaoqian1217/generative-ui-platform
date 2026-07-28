import type { CompileError } from "@generative-ui/compiler-contract";
import { expect } from "vitest";
import { CoreCompileFailure } from "../src/failure.js";

export function expectCoreFailure(
  action: () => unknown,
  code: CompileError["code"],
): CoreCompileFailure {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(CoreCompileFailure);
  const failure = thrown as CoreCompileFailure;
  expect(failure.compileError.code).toBe(code);
  return failure;
}
