import { expect, test } from "vitest";
import * as serviceEntrypoint from "../src/main.js";

test("service entrypoint exports the Markdown direct tracer bullet", () => {
  expect(serviceEntrypoint).toHaveProperty("createMarkdownSanitizer");
  expect(serviceEntrypoint).toHaveProperty("createPresentationRouter");
  expect(serviceEntrypoint).toHaveProperty("createMarkdownPresentationService");
});

test("service entrypoint exports the structured data direct tracer bullet", () => {
  expect(serviceEntrypoint).toHaveProperty("createStructuredDataValidator");
  expect(serviceEntrypoint).toHaveProperty("createStructuredDataSerializer");
  expect(serviceEntrypoint).toHaveProperty(
    "createStructuredDataPresentationService",
  );
});
