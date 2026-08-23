// PROTOTYPE - throwaway: shared fixture facts for three patrol consultation layouts.
export type PrototypeRouteId = "route-a" | "route-b";

export type PrototypeCommentAnchor = "under-bridge";

export type PrototypeConsultDecision =
  | { kind: "awaiting" }
  | { kind: "selected"; routeId: PrototypeRouteId }
  | { kind: "revision" }
  | { kind: "cancelled" };

export interface PrototypeRouteOption {
  coverage: string;
  distance: string;
  id: PrototypeRouteId;
  label: string;
  summary: string;
  via: string;
}

export const PROTOTYPE_ROUTE_OPTIONS: readonly PrototypeRouteOption[] = [
  {
    coverage: "东侧覆盖较多",
    distance: "较长",
    id: "route-a",
    label: "路线 A",
    summary: "经过东侧高地，覆盖范围较大、距离较长。",
    via: "东侧高地",
  },
  {
    coverage: "东侧覆盖较少",
    distance: "较短",
    id: "route-b",
    label: "路线 B",
    summary: "优先经过桥下区域，距离较短、东侧覆盖较少。",
    via: "桥下区域",
  },
] as const;

export const PROTOTYPE_REVISION_INSTRUCTION = "优先覆盖桥下区域";

export function prototypeRouteOption(
  routeId: PrototypeRouteId,
): PrototypeRouteOption {
  const option = PROTOTYPE_ROUTE_OPTIONS.find(
    (candidate) => candidate.id === routeId,
  );
  if (option === undefined)
    throw new Error("Prototype route option is missing.");
  return option;
}

export function prototypeDecisionLabel(
  decision: PrototypeConsultDecision,
): string {
  if (decision.kind === "awaiting") return "等待答复";
  if (decision.kind === "selected")
    return `已选择 ${prototypeRouteOption(decision.routeId).label}`;
  if (decision.kind === "revision")
    return `已提出修改: ${PROTOTYPE_REVISION_INSTRUCTION}`;
  return "已取消征询";
}
