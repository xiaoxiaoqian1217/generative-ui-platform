import {
  MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
  MAP_PLAN_ACTIVITY_TYPE,
} from "@generative-ui/shared-types";
import { describe, expect, it } from "vitest";
import {
  mapPlanFromObservations,
  mapPlanStepForOperation,
} from "../../src/conversation/map-plan-activity.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";

function snapshot(status: "running" | "completed"): TurnObservation {
  return {
    hasArtifact: true,
    id: `activity-${status}`,
    observedAt: "2026-08-21T10:00:00.000Z",
    observedIndex: status === "running" ? 0 : 1,
    payload: {
      activityType: MAP_PLAN_ACTIVITY_TYPE,
      content: {
        goal: "检查北侧通道",
        schemaVersion: MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
        status,
        steps: [
          {
            detail: "展示已有候选路线 A。",
            id: "route",
            label: "预览路线",
            operationNames: ["previewPath"],
            status,
          },
        ],
      },
      messageId: "map-plan",
      replace: true,
      type: "ACTIVITY_SNAPSHOT",
    },
    source: "agent",
    type: "ACTIVITY_SNAPSHOT",
  };
}

describe("map plan activity", () => {
  it("uses the latest valid public plan snapshot", () => {
    const plan = mapPlanFromObservations([
      snapshot("running"),
      snapshot("completed"),
    ]);

    expect(plan?.status).toBe("completed");
    expect(mapPlanStepForOperation(plan, "previewPath")?.detail).toBe(
      "展示已有候选路线 A。",
    );
  });

  it("ignores a similarly named but invalid payload", () => {
    const invalid = {
      ...snapshot("running"),
      payload: {
        activityType: MAP_PLAN_ACTIVITY_TYPE,
        content: { goal: "missing contract fields" },
        type: "ACTIVITY_SNAPSHOT",
      },
    } satisfies TurnObservation;

    expect(mapPlanFromObservations([invalid])).toBeUndefined();
  });
});
