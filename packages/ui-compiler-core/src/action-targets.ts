import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type { ComponentDefinition } from "@generative-ui/component-catalog-schema";
import { fail } from "./failure.js";

type PlanAction = NonNullable<
  UICompileRequest["plan"]["regions"][number]["actions"]
>[number];

export interface TargetedAction {
  action: PlanAction;
  actionPath: string;
  targetRegionId: string;
}

export type TargetActions = ReadonlyMap<string, TargetedAction>;

export function indexTargetActions(request: UICompileRequest): TargetActions {
  const targetedActions = new Map<string, TargetedAction>();
  for (const [
    ownerRegionIndex,
    ownerRegion,
  ] of request.plan.regions.entries()) {
    for (const [actionIndex, action] of (ownerRegion.actions ?? []).entries()) {
      const actionPath = `/plan/regions/${ownerRegionIndex}/actions/${actionIndex}`;
      const targetRegionId = action.targetRegionId ?? ownerRegion.regionId;
      if (targetedActions.has(targetRegionId)) {
        fail({
          code: "ACTION_BINDING_UNRESOLVED",
          message: "A component cannot own more than one Action in the MVP.",
          stage: "schema-validation",
          retryable: false,
          path: `${actionPath}/targetRegionId`,
          constraint: "single-component-action",
        });
      }
      targetedActions.set(targetRegionId, {
        action,
        actionPath,
        targetRegionId,
      });
    }
  }
  return targetedActions;
}

export function componentPermitsTargetActions(
  targetedActions: TargetActions,
  regionId: string,
  component: ComponentDefinition,
): boolean {
  const targetedAction = targetedActions.get(regionId);
  return (
    targetedAction === undefined ||
    component.allowedActions.includes(targetedAction.action.actionType)
  );
}
