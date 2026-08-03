import type { BusinessAgentRunResult } from "@generative-ui/runtime-contract";

export const CONFIRM_PATROL_ACTION_ID = "confirm-patrol-plan";
export const CONFIRM_PATROL_ACTION_TYPE = "patrol.confirm";

export type AgentContent = Extract<
  BusinessAgentRunResult,
  { status: "completed" }
>["content"];

export type ReferenceScenario = "device-status" | "help" | "patrol-plan";

export type PatrolStop = {
  areaId: string;
  areaName: string;
  sequence: number;
  expectedMinutes: number;
};

export type PatrolPlanDraft = {
  planId: string;
  status: "awaiting-confirmation";
  title: string;
  totalExpectedMinutes: number;
  stops: PatrolStop[];
};

const deviceFixtures = Object.freeze([
  {
    deviceId: "camera-north-01",
    name: "北门摄像头",
    status: "online",
    batteryPercent: 96,
    lastInspectionAt: "2026-08-01T08:00:00Z",
  },
  {
    deviceId: "sensor-warehouse-02",
    name: "仓库温湿度传感器",
    status: "maintenance-required",
    batteryPercent: 18,
    lastInspectionAt: "2026-07-31T16:30:00Z",
  },
  {
    deviceId: "robot-patrol-01",
    name: "巡逻机器人一号",
    status: "charging",
    batteryPercent: 64,
    lastInspectionAt: "2026-08-01T23:10:00Z",
  },
]);

const DEVICE_ID_PATTERN =
  /\b(?:camera|device|robot|sensor)-[a-z0-9]+(?:-[a-z0-9]+)*\b/iu;

export function classifyScenario(message: string): ReferenceScenario {
  const normalized = message.trim().toLocaleLowerCase("zh-CN");
  const mentionsDevice =
    deviceFixtures.some(
      (device) =>
        normalized.includes(device.deviceId) ||
        normalized.includes(device.name),
    ) ||
    /设备|摄像头|传感器|机器人|device|camera|sensor|robot/u.test(normalized);
  const requestsStatus = /查询|查看|状态|query|status/u.test(normalized);
  if (mentionsDevice && requestsStatus) return "device-status";
  if (/巡逻|巡检|patrol/u.test(normalized)) return "patrol-plan";
  if (mentionsDevice) return "device-status";
  return "help";
}

export function queryDeviceStatus(message: string): AgentContent {
  const normalized = message.toLocaleLowerCase("zh-CN");
  const matchingDevices = deviceFixtures.filter(
    (device) =>
      normalized.includes(device.deviceId) || normalized.includes(device.name),
  );
  const requestedDeviceId = normalized.match(DEVICE_ID_PATTERN)?.[0];
  const devices =
    matchingDevices.length > 0
      ? matchingDevices
      : requestedDeviceId === undefined
        ? deviceFixtures
        : [];
  return {
    contentType: "structured-data",
    data: {
      kind: "device-status",
      source: "deterministic-fixture",
      observedAt: "2026-08-02T00:00:00Z",
      devices: devices.map((device) => ({ ...device })),
    },
    fallbackMarkdown:
      devices.length === 0
        ? `未找到设备 ${requestedDeviceId}。`
        : `查询到 ${devices.length} 台设备，其中 ${devices.filter((device) => device.status === "maintenance-required").length} 台需要维护。`,
  };
}

export function createPatrolPlanDraft(): PatrolPlanDraft {
  const stops: PatrolStop[] = [
    {
      areaId: "north-gate",
      areaName: "北门",
      sequence: 1,
      expectedMinutes: 8,
    },
    {
      areaId: "warehouse-a",
      areaName: "A 区仓库",
      sequence: 2,
      expectedMinutes: 12,
    },
    {
      areaId: "power-room",
      areaName: "配电室",
      sequence: 3,
      expectedMinutes: 10,
    },
  ];
  return {
    planId: "patrol-plan-reference-001",
    status: "awaiting-confirmation",
    title: "夜间重点区域巡逻计划",
    totalExpectedMinutes: stops.reduce(
      (total, stop) => total + stop.expectedMinutes,
      0,
    ),
    stops,
  };
}

export function patrolDraftContent(draft: PatrolPlanDraft): AgentContent {
  return {
    contentType: "structured-data",
    data: {
      kind: "patrol-plan-draft",
      plan: draft,
      requestedAction: {
        actionId: CONFIRM_PATROL_ACTION_ID,
        actionType: CONFIRM_PATROL_ACTION_TYPE,
        requiresApproval: true,
      },
    },
    fallbackMarkdown: `巡逻计划草稿“${draft.title}”已生成，共 ${draft.stops.length} 个巡逻点，等待确认。`,
  };
}

export function confirmPatrolTask(draft: PatrolPlanDraft): AgentContent {
  return {
    contentType: "structured-data",
    data: {
      kind: "patrol-task",
      taskId: "patrol-task-reference-001",
      sourcePlanId: draft.planId,
      status: "confirmed",
      title: draft.title,
      totalExpectedMinutes: draft.totalExpectedMinutes,
      stops: draft.stops,
    },
    fallbackMarkdown: `巡逻任务“${draft.title}”已确认。`,
  };
}

export function helpContent(): AgentContent {
  return {
    contentType: "markdown",
    markdown:
      "## Reference Business Agent\n\n可用场景：查询设备状态，或生成巡逻计划草稿后确认任务。",
  };
}
