import type { ComponentCatalog } from "../src/index.js";

const catalog: ComponentCatalog = {
  schemaVersion: "1.0",
  catalogId: "default",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
  ],
  actions: [],
};

void catalog;

const invalidCatalog: ComponentCatalog = {
  ...catalog,
  // @ts-expect-error Catalog schema versions are explicitly versioned.
  schemaVersion: "2.0",
};

void invalidCatalog;
