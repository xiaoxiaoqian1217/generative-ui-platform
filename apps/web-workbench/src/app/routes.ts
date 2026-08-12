export const WORKBENCH_ROUTES = [
  "/conversation",
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
    : "/conversation";
}

export function workbenchRouteLabel(route: WorkbenchRoute): string {
  return {
    "/conversation": "Conversation",
    "/playground": "Playground",
    "/inspect": "Inspect",
    "/cases": "Cases",
    "/catalog": "Catalog",
    "/scenarios": "Scenarios",
    "/settings": "Settings",
  }[route];
}
