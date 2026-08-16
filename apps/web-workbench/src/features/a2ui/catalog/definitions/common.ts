import {
  AccessibilityAttributesSchema,
  DataBindingSchema,
  FunctionCallSchema,
} from "@a2ui/web_core/v0_9";
import { z } from "zod";

/**
 * Catalog common props required by the A2UI `ComponentApi` contract.
 * Mirrors the Basic Catalog's CommonProps: `weight` lets a component
 * participate in Row / Column layout weights.
 */
export const platformCommonProps = {
  accessibility: AccessibilityAttributesSchema.optional(),
  weight: z
    .number()
    .describe(
      "The relative weight of this component within a Row or Column. This is similar to the CSS 'flex-grow' property. Note: this may ONLY be set when the component is a direct descendant of a Row or Column.",
    )
    .optional(),
};

/**
 * A bindable string-or-number value: a literal, a `{ path }` data binding,
 * or a `{ call, args, returnType }` function call. Used by platform
 * components whose displayed value is naturally numeric or textual.
 */
export const dynamicStringOrNumberSchema = z.union([
  z.string(),
  z.number(),
  DataBindingSchema,
  FunctionCallSchema,
]);
