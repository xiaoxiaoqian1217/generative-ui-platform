import { describe, expect, it } from "vitest";
import { locateDevice } from "../../src/features/frontend-tools/locate-device.js";
import { findDevice } from "../../src/features/map/devices.js";

describe("locateDevice", () => {
  it("resolves Drone 01 through the business tool contract", () => {
    const device = findDevice("01");
    expect(device).toEqual({
      batteryPercent: 78,
      coordinates: [121.4737, 31.2304],
      id: "01",
      location: "上海市黄浦区巡检走廊",
      name: "Drone 01",
      status: "online",
    });

    expect(locateDevice({ deviceId: "01" })).toEqual({
      device,
      status: "located",
    });
  });

  it("reports an unknown device without inventing map coordinates", () => {
    expect(locateDevice({ deviceId: "404" })).toEqual({
      deviceId: "404",
      status: "not-found",
    });
  });
});
