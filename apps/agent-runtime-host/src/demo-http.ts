import { randomUUID } from "node:crypto";
import type { Express, Response } from "express";

export const DEMO_HTTP_PATH = "/api/demo/message";

interface UserMessage {
  type: "user_message";
  messageId: string;
  content: string;
}

function isUserMessage(value: unknown): value is UserMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "user_message" &&
    typeof candidate.messageId === "string" &&
    candidate.messageId.length > 0 &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0
  );
}

function setDemoCors(response: Response): void {
  response.set({
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
  });
}

export function attachDemoHttp(
  app: Express,
  path = DEMO_HTTP_PATH,
): void {
  app.options(path, (_request, response) => {
    setDemoCors(response);
    response.sendStatus(204);
  });

  app.post(path, (request, response) => {
    setDemoCors(response);

    if (!isUserMessage(request.body)) {
      response.status(400).json({
        type: "error_message",
        messageId: randomUUID(),
        content: "消息格式无效，需要 user_message、messageId 和 content。",
      });
      return;
    }

    response.json({
      type: "agent_message",
      messageId: randomUUID(),
      replyTo: request.body.messageId,
      content: `已收到“${request.body.content.trim()}”。当前未接入真实 Business Agent，此消息由 Runtime Host HTTP Mock 接口返回。`,
    });
  });
}
