export const WORKBENCH_ROUTES = [
  "/playground",
  "/inspect",
  "/cases",
  "/catalog",
  "/scenarios",
  "/settings",
] as const;

export type WorkbenchRoute = (typeof WORKBENCH_ROUTES)[number];

export function resolveWorkbenchRoute(pathname: string): WorkbenchRoute {
  return (WORKBENCH_ROUTES as readonly string[]).includes(pathname)
    ? (pathname as WorkbenchRoute)
    : "/playground";
}

export function workbenchRouteLabel(route: WorkbenchRoute): string {
  return {
    "/playground": "Playground",
    "/inspect": "Inspect",
    "/cases": "Cases",
    "/catalog": "Catalog",
    "/scenarios": "Scenarios",
    "/settings": "Settings",
  }[route];
}
