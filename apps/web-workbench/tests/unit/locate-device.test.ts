import { describe, expect, it, vi } from "vitest";
import { locateDevice } from "../../src/features/frontend-tools/locate-device.js";

describe("locateDevice", () => {
  it("selects the requested device and returns its public business data", () => {
    const selectDevice = vi.fn();

    const result = locateDevice({ deviceId: "01" }, selectDevice);

    expect(selectDevice).toHaveBeenCalledOnce();
    expect(selectDevice).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: "01", name: "无人机 01" }),
    );
    expect(result).toEqual({
      status: "located",
      device: {
        deviceId: "01",
        name: "无人机 01",
        status: "online",
        batteryPercent: 82,
        coordinates: [116.3974, 39.9093],
        location: "北京市东城区",
      },
    });
  });

  it("rejects an unknown device without changing the selected business state", () => {
    const selectDevice = vi.fn();

    const result = locateDevice({ deviceId: "missing" }, selectDevice);

    expect(result).toEqual({
      status: "not-found",
      code: "DEVICE_NOT_FOUND",
      deviceId: "missing",
    });
    expect(selectDevice).not.toHaveBeenCalled();
  });
});
