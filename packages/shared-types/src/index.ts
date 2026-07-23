export type Brand<T, B extends string> = T & { readonly __brand: B };
export type RequestId = Brand<string, "RequestId">;
export type ThreadId = Brand<string, "ThreadId">;
export type RunId = Brand<string, "RunId">;
export type SurfaceId = Brand<string, "SurfaceId">;
export type ActionId = Brand<string, "ActionId">;
