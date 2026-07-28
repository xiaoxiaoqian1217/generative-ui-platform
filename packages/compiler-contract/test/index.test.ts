import { expect, test } from "vitest";
import * as packageEntrypoint from "../src/index.js";

test("public entrypoint loads without exposing a capability", () => {
  expect(Object.keys(packageEntrypoint)).toEqual([]);
});
