import { Catalog } from "@a2ui/web_core/v0_9";
import { vueBasicCatalog } from "@copilotkit/vue/v2";
import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import {
  infoRowImplementation,
  metricImplementation,
  statusBadgeImplementation,
} from "./implementations/index.js";
import type { VueComponentImplementation } from "./implementations/vue-component.js";

/**
 * The single merged Workbench A2UI catalog: all 18 CopilotKit Basic Catalog
 * components plus the platform semantic components (Metric / StatusBadge /
 * InfoRow).
 *
 * The merged instance is registered under its own catalog id instead of
 * reusing the Basic Catalog id, because `CopilotKitProvider` accepts a single
 * catalog and the A2UI message processor matches `createSurface.catalogId`
 * against it literally.
 */
export const platformCatalog = new Catalog<VueComponentImplementation>(
  PLATFORM_A2UI_CATALOG_ID,
  [
    ...vueBasicCatalog.components.values(),
    metricImplementation,
    statusBadgeImplementation,
    infoRowImplementation,
  ],
  [...vueBasicCatalog.functions.values()],
);
