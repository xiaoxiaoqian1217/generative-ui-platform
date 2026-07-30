export type SafeHttpEvent = Readonly<
  Record<string, string | number | boolean | undefined>
>;
export interface HttpObservability {
  record(
    event:
      | "ui_compiler.http.request_started"
      | "ui_compiler.http.request_completed"
      | "ui_compiler.http.request_cancelled"
      | "ui_compiler.http.request_timed_out",
    fields: SafeHttpEvent,
  ): void;
}

export const noopHttpObservability: HttpObservability = Object.freeze({
  record() {},
});
