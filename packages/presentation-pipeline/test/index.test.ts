import { expect, test } from "vitest";
import * as pipelineEntrypoint from "../src/index.js";

test("pipeline entrypoint exports the Markdown direct tracer bullet", () => {
  expect(pipelineEntrypoint).toHaveProperty("createMarkdownSanitizer");
  expect(pipelineEntrypoint).toHaveProperty("createPresentationRouter");
  expect(pipelineEntrypoint).toHaveProperty(
    "createMarkdownPresentationService",
  );
});

test("pipeline entrypoint exports the structured data direct tracer bullet", () => {
  expect(pipelineEntrypoint).toHaveProperty("createStructuredDataValidator");
  expect(pipelineEntrypoint).toHaveProperty("createStructuredDataSerializer");
  expect(pipelineEntrypoint).toHaveProperty(
    "createStructuredDataPresentationService",
  );
});

test("pipeline entrypoint exports the embedded composition seam", () => {
  expect(pipelineEntrypoint).toHaveProperty("createPresentationPipeline");
  expect(pipelineEntrypoint).toHaveProperty("createFixtureModelAdapter");
});

test("pipeline entrypoint exports the configurable Provider seam", () => {
  expect(pipelineEntrypoint).toHaveProperty(
    "createOpenAICompatiblePresentationModelAdapter",
  );
  expect(pipelineEntrypoint).toHaveProperty(
    "createPresentationModelProviderRegistry",
  );
  expect(pipelineEntrypoint).toHaveProperty(
    "BUILT_IN_OPENAI_COMPATIBLE_PROVIDER_BASE_URLS",
  );
});
