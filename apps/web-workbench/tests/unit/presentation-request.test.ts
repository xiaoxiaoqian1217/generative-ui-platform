import { describe, expect, it } from "vitest";
import { presentationForwardedProps } from "../../src/settings/presentation-request.js";

describe("presentation request", () => {
  it("leaves ordinary input without any presentation request", () => {
    expect(presentationForwardedProps(undefined)).toBeUndefined();
  });

  it("maps the dynamic scenario request onto explicit forwardedProps", () => {
    expect(presentationForwardedProps("dynamic")).toEqual({
      clientCapabilities: { a2ui: true },
      requestedMode: "dynamic",
    });
  });
});
