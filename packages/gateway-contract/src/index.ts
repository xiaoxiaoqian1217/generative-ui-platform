import { z } from "zod";

export const businessAgentRegistrationSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  protocol: z.enum(["ag-ui", "http", "mcp", "sdk"]),
  endpoint: z.string().optional(),
  domains: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  enabled: z.boolean(),
});

export interface ActionRoute {
  actionId: string;
  ownerAgentId: string;
  threadId?: string;
  runId?: string;
  resourceId?: string;
  surfaceId?: string;
}

export interface SurfaceRegistration {
  surfaceId: string;
  requestId: string;
  sourceAgentId?: string;
  resultId?: string;
  catalogId: string;
  catalogVersion: string;
}

export type BusinessAgentRegistration = z.infer<typeof businessAgentRegistrationSchema>;
