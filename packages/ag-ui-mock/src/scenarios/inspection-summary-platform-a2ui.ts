import type { AGUIMock } from "@copilotkit/aimock";
import { buildActivityResponse } from "@copilotkit/aimock/agui";
import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";

const PLATFORM_SURFACE_ID = "inspection-summary-platform";

export const INSPECTION_SUMMARY_PLATFORM_A2UI_MESSAGE_ID =
  "inspection-summary-platform-a2ui";

/**
 * Platform Catalog fixture: Metric / StatusBadge / InfoRow composed with
 * Basic Card / Row / Column / Text. Business values live exclusively in the
 * data model; components bind to them through `{ path }`.
 */
export const inspectionSummaryPlatformOperations = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: PLATFORM_SURFACE_ID,
      catalogId: PLATFORM_A2UI_CATALOG_ID,
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: PLATFORM_SURFACE_ID,
      components: [
        { id: "root", component: "Card", child: "summary" },
        {
          id: "summary",
          component: "Column",
          children: ["header", "metrics", "details"],
        },
        {
          id: "header",
          component: "Row",
          children: ["title", "status"],
          justify: "spaceBetween",
          align: "center",
        },
        {
          id: "title",
          component: "Text",
          text: { path: "/summary/title" },
          variant: "h3",
        },
        {
          id: "status",
          component: "StatusBadge",
          label: { path: "/summary/status" },
          variant: "success",
        },
        {
          id: "metrics",
          component: "Row",
          children: ["metric-devices", "metric-alarms", "metric-completion"],
        },
        {
          id: "metric-devices",
          component: "Metric",
          label: { path: "/summary/metrics/devices/label" },
          value: { path: "/summary/metrics/devices/value" },
          weight: 1,
        },
        {
          id: "metric-alarms",
          component: "Metric",
          label: { path: "/summary/metrics/alarms/label" },
          value: { path: "/summary/metrics/alarms/value" },
          weight: 1,
        },
        {
          id: "metric-completion",
          component: "Metric",
          label: { path: "/summary/metrics/completion/label" },
          value: { path: "/summary/metrics/completion/value" },
          weight: 1,
        },
        {
          id: "details",
          component: "Column",
          children: ["detail-start", "detail-duration", "detail-area"],
        },
        {
          id: "detail-start",
          component: "InfoRow",
          label: { path: "/summary/details/startTime/label" },
          value: { path: "/summary/details/startTime/value" },
        },
        {
          id: "detail-duration",
          component: "InfoRow",
          label: { path: "/summary/details/duration/label" },
          value: { path: "/summary/details/duration/value" },
        },
        {
          id: "detail-area",
          component: "InfoRow",
          label: { path: "/summary/details/area/label" },
          value: { path: "/summary/details/area/value" },
        },
      ],
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: PLATFORM_SURFACE_ID,
      path: "/",
      value: {
        summary: {
          title: "巡检结果",
          status: "已完成",
          metrics: {
            devices: { label: "设备数量", value: 5 },
            alarms: { label: "异常数量", value: 1 },
            completion: { label: "完成率", value: "100%" },
          },
          details: {
            startTime: { label: "开始时间", value: "14:20" },
            duration: { label: "执行耗时", value: "12 min" },
            area: { label: "执行区域", value: "A 区" },
          },
        },
      },
    },
  },
] as const;

export function registerInspectionSummaryPlatformA2uiScenario(
  mock: AGUIMock,
): void {
  mock.onPredicate(
    (input) =>
      /展示平台 Catalog 巡检摘要 A2UI/i.test(
        String(input.messages?.at(-1)?.content),
      ),
    buildActivityResponse(
      INSPECTION_SUMMARY_PLATFORM_A2UI_MESSAGE_ID,
      "a2ui-surface",
      {
        a2ui_operations: inspectionSummaryPlatformOperations,
      },
    ),
  );
}
