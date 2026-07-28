import type {
  LayoutIR,
  UICompileRequest,
} from "@generative-ui/compiler-contract";
import { fail } from "./failure.js";

const narrowViewportWidth = 640;
const gridColumnWidth = 320;
const defaultGridColumns = 2;
const maximumGridColumns = 4;

type PlanLayout = UICompileRequest["plan"]["regions"][number]["layout"];

function layoutError(
  regionIndex: number,
  constraint: string,
  message: string,
): never {
  return fail({
    code: "NO_COMPATIBLE_COMPOSITION",
    message,
    stage: "composition-planning",
    retryable: false,
    path: `/plan/regions/${regionIndex}/layout`,
    constraint,
  });
}

export function normalizeLayout(
  layout: PlanLayout,
  context: UICompileRequest["context"],
  regionIndex: number,
): LayoutIR {
  if (
    layout.minColumns !== undefined &&
    layout.maxColumns !== undefined &&
    layout.minColumns > layout.maxColumns
  ) {
    layoutError(
      regionIndex,
      "layout-column-range",
      "Layout minimum columns cannot exceed maximum columns.",
    );
  }

  if (
    layout.flow !== "grid" &&
    (layout.minColumns !== undefined || layout.maxColumns !== undefined)
  ) {
    layoutError(
      regionIndex,
      "layout-columns-require-grid",
      "Column constraints require a grid layout.",
    );
  }

  if (
    layout.flow === "horizontal" &&
    context?.viewport !== undefined &&
    context.viewport.width < narrowViewportWidth
  ) {
    return {
      flow: "vertical",
      density: layout.density,
    };
  }

  if (layout.flow !== "grid") {
    return {
      flow: layout.flow,
      density: layout.density,
    };
  }

  const minimum = layout.minColumns ?? 1;
  const maximum = layout.maxColumns ?? maximumGridColumns;
  const viewportCapacity =
    context?.viewport === undefined
      ? Math.max(minimum, defaultGridColumns)
      : Math.max(
          1,
          Math.min(
            maximumGridColumns,
            Math.floor(context.viewport.width / gridColumnWidth),
          ),
        );

  if (viewportCapacity < minimum) {
    layoutError(
      regionIndex,
      "viewport-grid-capacity",
      "Viewport cannot satisfy the grid minimum column constraint.",
    );
  }

  return {
    flow: "grid",
    density: layout.density,
    columns: Math.min(maximum, Math.max(minimum, viewportCapacity)),
  };
}
