import type { CompileError } from "@generative-ui/compiler-contract";

export class CoreCompileFailure extends Error {
  readonly compileError: CompileError;

  constructor(compileError: CompileError) {
    super(compileError.message);
    this.name = "CoreCompileFailure";
    this.compileError = compileError;
  }
}

export function fail(error: CompileError): never {
  throw new CoreCompileFailure(error);
}
