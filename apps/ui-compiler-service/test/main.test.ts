import { expect, test } from "vitest";
import * as serviceEntrypoint from "../src/main.js";

test("service entrypoint loads without starting a capability", () => {
  expect(Object.keys(serviceEntrypoint)).toEqual([]);
});
