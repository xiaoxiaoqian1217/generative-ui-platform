import type { BusinessAgentRunRequest } from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import {
  confirmPatrolTaskNode,
  deviceStatusNode,
  helpNode,
  initialGraphState,
  patrolDraftNode,
  routeRequestNode,
} from "../src/graph.js";

function request(message: string): BusinessAgentRunRequest {
  return {
    protocolVersion: "1.0",
    requestId: "request-node",
    threadId: "thread-node",
    runId: "run-node",
    input: { message },
  };
}

describe("Reference Business Agent nodes", () => {
  it("routes device queries without a model", () => {
    const state = initialGraphState(request("查询设备状态"));
    expect(routeRequestNode(state)).toEqual({ scenario: "device-status" });
  });

  it("prioritizes device status intent when a device name contains patrol", () => {
    const state = initialGraphState(request("查询巡逻机器人一号状态"));
    expect(routeRequestNode(state)).toEqual({ scenario: "device-status" });
  });

  it("returns deterministic structured device data", () => {
    const state = initialGraphState(request("查询 sensor-warehouse-02"));
    expect(deviceStatusNode(state)).toMatchObject({
      content: {
        contentType: "structured-data",
        data: {
          kind: "device-status",
          source: "deterministic-fixture",
          devices: [
            {
              deviceId: "sensor-warehouse-02",
              status: "maintenance-required",
            },
          ],
        },
      },
    });
  });

  it("does not return all devices for an unknown device identifier", () => {
    const state = initialGraphState(request("查询 camera-south-99 状态"));
    expect(deviceStatusNode(state)).toMatchObject({
      content: {
        contentType: "structured-data",
        data: {
          kind: "device-status",
          devices: [],
        },
        fallbackMarkdown: "未找到设备 camera-south-99。",
      },
    });
  });

  it("creates a deterministic patrol draft", () => {
    expect(patrolDraftNode()).toMatchObject({
      draft: {
        planId: "patrol-plan-reference-001",
        status: "awaiting-confirmation",
        totalExpectedMinutes: 30,
        stops: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }],
      },
    });
  });

  it("confirms a patrol task only from approved draft state", () => {
    const draftUpdate = patrolDraftNode();
    const state = {
      ...initialGraphState(request("生成巡逻计划")),
      draft: draftUpdate.draft,
      approved: true,
    };
    expect(confirmPatrolTaskNode(state)).toMatchObject({
      content: {
        contentType: "structured-data",
        data: {
          kind: "patrol-task",
          sourcePlanId: "patrol-plan-reference-001",
          status: "confirmed",
        },
      },
    });
  });

  it("returns Markdown guidance for unsupported input", () => {
    expect(helpNode()).toMatchObject({
      content: {
        contentType: "markdown",
      },
    });
  });
});
