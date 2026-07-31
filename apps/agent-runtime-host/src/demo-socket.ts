import { createHash, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { Duplex } from "node:stream";

const WEB_SOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE_BYTES = 64 * 1024;

export const DEMO_SOCKET_PATH = "/ws/demo";

interface UserMessage {
  type: "user_message";
  messageId: string;
  content: string;
}

interface ParsedFrame {
  consumedBytes: number;
  final: boolean;
  opcode: number;
  payload: Buffer;
}

function createFrame(opcode: number, payload: Buffer): Buffer {
  const payloadLength = payload.byteLength;
  let header: Buffer;

  if (payloadLength < 126) {
    header = Buffer.allocUnsafe(2);
    header[1] = payloadLength;
  } else if (payloadLength <= 65_535) {
    header = Buffer.allocUnsafe(4);
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
}

function parseFrame(buffer: Buffer): ParsedFrame | null {
  if (buffer.byteLength < 2) {
    return null;
  }

  const firstByte = buffer[0] ?? 0;
  const secondByte = buffer[1] ?? 0;
  const final = (firstByte & 0x80) !== 0;
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.byteLength < offset + 2) {
      return null;
    }
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.byteLength < offset + 8) {
      return null;
    }

    const extendedLength = buffer.readBigUInt64BE(offset);
    if (extendedLength > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("WebSocket frame is too large");
    }

    payloadLength = Number(extendedLength);
    offset += 8;
  }

  let mask: Buffer | undefined;
  if (masked) {
    if (buffer.byteLength < offset + 4) {
      return null;
    }
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (payloadLength > MAX_MESSAGE_BYTES) {
    throw new Error("WebSocket message exceeds the demo limit");
  }

  if (buffer.byteLength < offset + payloadLength) {
    return null;
  }

  const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength));

  if (mask) {
    for (let index = 0; index < payload.byteLength; index += 1) {
      payload[index] = (payload[index] ?? 0) ^ (mask[index % 4] ?? 0);
    }
  }

  return {
    consumedBytes: offset + payloadLength,
    final,
    opcode,
    payload,
  };
}

function sendJson(socket: Duplex, value: unknown): void {
  socket.write(createFrame(0x1, Buffer.from(JSON.stringify(value), "utf8")));
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

function handleTextMessage(socket: Duplex, payload: Buffer): void {
  try {
    const parsed: unknown = JSON.parse(payload.toString("utf8"));

    if (!isUserMessage(parsed)) {
      sendJson(socket, {
        type: "error_message",
        messageId: randomUUID(),
        content: "消息格式无效，需要 user_message、messageId 和 content。",
      });
      return;
    }

    sendJson(socket, {
      type: "agent_message",
      messageId: randomUUID(),
      replyTo: parsed.messageId,
      content: `已收到“${parsed.content.trim()}”。当前未接入真实 Business Agent，此消息由 Runtime Host Mock 通道返回。`,
    });
  } catch (error) {
    sendJson(socket, {
      type: "error_message",
      messageId: randomUUID(),
      content: error instanceof Error ? error.message : "无法解析消息。",
    });
  }
}

function handleConnection(socket: Duplex, head: Buffer): void {
  let pending = Buffer.from(head);

  sendJson(socket, {
    type: "system_message",
    messageId: randomUUID(),
    content: "Mock WebSocket 已连接。当前未接入真实 Business Agent。",
  });

  const consume = (chunk: Buffer) => {
    pending = Buffer.concat([pending, chunk]);

    while (pending.byteLength > 0) {
      let frame: ParsedFrame | null;

      try {
        frame = parseFrame(pending);
      } catch (error) {
        sendJson(socket, {
          type: "error_message",
          messageId: randomUUID(),
          content: error instanceof Error ? error.message : "WebSocket 帧无效。",
        });
        socket.end(createFrame(0x8, Buffer.alloc(0)));
        return;
      }

      if (!frame) {
        return;
      }

      pending = pending.subarray(frame.consumedBytes);

      if (!frame.final) {
        sendJson(socket, {
          type: "error_message",
          messageId: randomUUID(),
          content: "演示通道暂不支持分片 WebSocket 消息。",
        });
        continue;
      }

      if (frame.opcode === 0x1) {
        handleTextMessage(socket, frame.payload);
      } else if (frame.opcode === 0x8) {
        socket.end(createFrame(0x8, Buffer.alloc(0)));
        return;
      } else if (frame.opcode === 0x9) {
        socket.write(createFrame(0x0a, frame.payload));
      }
    }
  };

  socket.on("data", (chunk: Buffer) => consume(chunk));
  socket.on("error", (error) => console.error("Demo socket error", error));

  if (pending.byteLength > 0) {
    consume(Buffer.alloc(0));
  }
}

export function attachDemoSocket(
  server: Server,
  path = DEMO_SOCKET_PATH,
): void {
  server.on("upgrade", (request, socket, head) => {
    const requestUrl = new URL(request.url ?? "/", "http://runtime-host.local");

    if (requestUrl.pathname !== path) {
      socket.destroy();
      return;
    }

    const key = request.headers["sec-websocket-key"];
    const upgrade = request.headers.upgrade;

    if (typeof key !== "string" || upgrade?.toLowerCase() !== "websocket") {
      socket.destroy();
      return;
    }

    const accept = createHash("sha1")
      .update(`${key}${WEB_SOCKET_GUID}`)
      .digest("base64");

    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "\r\n",
      ].join("\r\n"),
    );

    handleConnection(socket, head);
  });
}
