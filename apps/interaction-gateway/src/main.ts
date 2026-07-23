import { compileResultToAgUiEvents } from "@generative-ui/ag-ui-adapter";
import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import { uiCompileRequestSchema } from "@generative-ui/compiler-contract";
import { compileUI } from "@generative-ui/ui-compiler-core";
import { createServer } from "node:http";
import { readJson, sendJson } from "./http.js";

const port = Number(process.env.PORT ?? 4100);
const catalog: ComponentCatalog = {
  catalogId: "base",
  catalogVersion: "0.1.0",
  components: [{ type: "Markdown", description: "Sanitized Markdown", propsSchema: {} }],
};

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }
  if (request.method === "POST" && request.url === "/ag-ui") {
    try {
      // MVP scaffold accepts an already-normalized compile request.
      // Business Agent adapters and routing are implemented in later issues.
      const parsed = uiCompileRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) return sendJson(response, 400, { error: parsed.error.flatten() });
      const result = await compileUI(parsed.data, { catalog });
      return sendJson(response, 200, compileResultToAgUiEvents(parsed.data.runId ?? parsed.data.requestId, result));
    } catch (error) {
      return sendJson(response, 500, { error: "INTERNAL_ERROR", message: String(error) });
    }
  }
  return sendJson(response, 404, { error: "NOT_FOUND" });
}).listen(port, () => console.log(`interaction-gateway listening on ${port}`));
