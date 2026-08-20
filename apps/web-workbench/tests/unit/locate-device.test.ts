import { describe, expect, it, vi } from "vitest";
import { locateDevice } from "../../src/features/frontend-tools/locate-device.js";
import {
  correlationKeyOf,
  createObservationRecorder,
  observationInputFromAgUiEvent,
} from "../../src/inspect/turn-inspection.js";

describe("locateDevice", () => {
  it("preserves the pre-migration observable success baseline", () => {
    const selectDevice = vi.fn();

    const result = locateDevice({ deviceId: "01" }, selectDevice);

    expect(selectDevice).toHaveBeenCalledOnce();
    expect(selectDevice).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: "01", name: "无人机 01" }),
    );
    expect(result).toEqual({
      status: "located",
      device: {
        deviceId: "01",
        name: "无人机 01",
        status: "online",
        batteryPercent: 82,
        coordinates: [116.3974, 39.9093],
        location: "北京市东城区",
      },
    });
  });

  it("preserves the pre-migration not-found baseline", () => {
    const selectDevice = vi.fn();

    const result = locateDevice({ deviceId: "missing" }, selectDevice);

    expect(result).toEqual({
      status: "not-found",
      code: "DEVICE_NOT_FOUND",
      deviceId: "missing",
    });
    expect(selectDevice).not.toHaveBeenCalled();
  });

  it("characterizes the retired Agent-facing call and standard result without advertising it", () => {
    const toolCallId = "legacy-locate-device-call";
    const result = locateDevice({ deviceId: "01" }, vi.fn());
    const legacyResultEvent = {
      content: JSON.stringify(result),
      messageId: "legacy-locate-device-result",
      role: "tool",
      toolCallId,
      type: "TOOL_CALL_RESULT",
    } as const;
    const legacyProtocolEvents = [
      {
        toolCallId,
        toolCallName: "locateDevice",
        type: "TOOL_CALL_START",
      },
      {
        delta: '{"deviceId":"01"}',
        toolCallId,
        type: "TOOL_CALL_ARGS",
      },
      { toolCallId, type: "TOOL_CALL_END" },
      legacyResultEvent,
    ] as const;
    const recorder = createObservationRecorder();
    for (const event of legacyProtocolEvents)
      recorder.record(
        observationInputFromAgUiEvent(event, {
          runId: "legacy-run",
          threadId: "legacy-thread",
        }),
      );
    const observations = recorder.observations();

    expect(observations.map((observation) => observation.type)).toEqual([
      "TOOL_CALL_START",
      "TOOL_CALL_ARGS",
      "TOOL_CALL_END",
      "TOOL_CALL_RESULT",
    ]);
    expect(
      observations.map((observation) => correlationKeyOf(observation)),
    ).toEqual(Array.from({ length: 4 }, () => `tool:${toolCallId}`));
    expect(observations.at(-1)).toMatchObject({
      hasArtifact: true,
      messageId: "legacy-locate-device-result",
      runId: "legacy-run",
      threadId: "legacy-thread",
      toolCallId,
    });
    expect(JSON.parse(legacyResultEvent.content)).toEqual(result);
  });
});
