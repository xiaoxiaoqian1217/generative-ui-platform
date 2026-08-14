import type { AGUIMock } from "@copilotkit/aimock";
import { buildActivityResponse } from "@copilotkit/aimock/agui";

const BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v0_9/basic_catalog.json";
const INSPECTION_SURFACE_ID = "inspection-summary";

export const INSPECTION_SUMMARY_A2UI_MESSAGE_ID = "inspection-summary-a2ui";

export const inspectionSummaryOperations = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: INSPECTION_SURFACE_ID,
      catalogId: BASIC_CATALOG_ID,
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: INSPECTION_SURFACE_ID,
      components: [
        { id: "root", component: "Card", child: "summary" },
        {
          id: "summary",
          component: "Column",
          children: ["title", "metrics", "details"],
        },
        {
          id: "title",
          component: "Text",
          text: { path: "/summary/title" },
          variant: "h3",
        },
        {
          id: "metrics",
          component: "Row",
          children: ["normal", "alarm"],
          justify: "spaceBetween",
        },
        {
          id: "normal",
          component: "Column",
          children: ["normal-label", "normal-value"],
          weight: 1,
        },
        {
          id: "normal-label",
          component: "Text",
          text: { path: "/summary/normal/label" },
          variant: "caption",
        },
        {
          id: "normal-value",
          component: "Text",
          text: { path: "/summary/normal/value" },
          variant: "h2",
        },
        {
          id: "alarm",
          component: "Column",
          children: ["alarm-label", "alarm-value"],
          weight: 1,
        },
        {
          id: "alarm-label",
          component: "Text",
          text: { path: "/summary/alarm/label" },
          variant: "caption",
        },
        {
          id: "alarm-value",
          component: "Text",
          text: { path: "/summary/alarm/value" },
          variant: "h2",
        },
        {
          id: "details",
          component: "Button",
          child: "details-label",
          variant: "primary",
          action: { event: { name: "viewInspectionDetails" } },
        },
        {
          id: "details-label",
          component: "Text",
          text: { path: "/summary/detailsLabel" },
        },
      ],
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: INSPECTION_SURFACE_ID,
      path: "/",
      value: {
        summary: {
          title: "巡检结果",
          normal: { label: "正常设备", value: "4" },
          alarm: { label: "告警设备", value: "1" },
          detailsLabel: "查看详情",
        },
      },
    },
  },
] as const;

export function registerInspectionSummaryA2uiScenario(mock: AGUIMock): void {
  mock.onPredicate(
    (input) =>
      /展示巡检摘要 A2UI/i.test(String(input.messages?.at(-1)?.content)),
    buildActivityResponse(
      INSPECTION_SUMMARY_A2UI_MESSAGE_ID,
      "a2ui-surface",
      {
        a2ui_operations: inspectionSummaryOperations,
      },
    ),
  );
  mock.onPredicate(
    (input) => /展示损坏的 A2UI/i.test(String(input.messages?.at(-1)?.content)),
    buildActivityResponse("invalid-inspection-a2ui", "a2ui-surface", {
      a2ui_operations: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "invalid-inspection-summary",
            catalogId: "urn:catalog:missing",
          },
        },
      ],
    }),
  );
}
