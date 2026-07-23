import { compileResultToAgUiEvents } from "@generative-ui/ag-ui-adapter";
import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import { type UICompileRequest, uiCompileRequestSchema } from "@generative-ui/compiler-contract";
import { compileUI } from "@generative-ui/ui-compiler-core";
import { createServer } from "node:http";
import { readJson, sendJson } from "./http.js";

const port = Number(process.env.PORT ?? 4101);
const catalog: ComponentCatalog = {
  catalogId: "base",
  catalogVersion: "0.1.0",
  components: [{ type: "Markdown", description: "Sanitized Markdown", propsSchema: {} }],
};

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }
  if (request.method === "GET" && request.url === "/version") {
    return sendJson(response, 200, { version: "0.1.0" });
  }
  if (request.method === "POST" && ["/api/ui-compiler/compile", "/ag-ui"].includes(request.url ?? "")) {
    try {
      const body = await readJson(request);
      const parsed = uiCompileRequestSchema.safeParse(body);
      if (!parsed.success) return sendJson(response, 400, { error: parsed.error.flatten() });
      const result = await compileUI(parsed.data as UICompileRequest, { catalog });
      if (request.url === "/ag-ui") {
        return sendJson(response, 200, compileResultToAgUiEvents(parsed.data.runId ?? parsed.data.requestId, result));
      }
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, 500, { error: "INTERNAL_ERROR", message: String(error) });
    }
  }
  return sendJson(response, 404, { error: "NOT_FOUND" });
}).listen(port, () => console.log(`ui-compiler-agent listening on ${port}`));
