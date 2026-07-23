import { z } from "zod";

export const componentDefinitionSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  propsSchema: z.unknown(),
  allowedChildren: z.array(z.string()).optional(),
  allowedActions: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  fallbackComponent: z.string().optional(),
});

export const componentCatalogSchema = z.object({
  catalogId: z.string().min(1),
  catalogVersion: z.string().min(1),
  components: z.array(componentDefinitionSchema).min(1),
});

export type ComponentDefinition = z.infer<typeof componentDefinitionSchema>;
export type ComponentCatalog = z.infer<typeof componentCatalogSchema>;
