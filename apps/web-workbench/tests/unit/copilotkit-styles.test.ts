import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CopilotKit styles", () => {
  it("loads the vendor stylesheet only from the controlled conversation view", async () => {
    const [conversationView, app] = await Promise.all([
      readFile(
        new URL(
          "../../src/conversation/ControlledCopilotChatView.vue",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../../src/app/App.vue", import.meta.url), "utf8"),
    ]);

    expect(conversationView).toContain('@import "../styles/copilotkit.css"');
    expect(app).not.toContain("copilotkit.css");
  });
});
