export type DeviceStatus = "online" | "offline";

export interface Device {
  readonly batteryPercent: number;
  readonly coordinates: readonly [longitude: number, latitude: number];
  readonly deviceId: string;
  readonly location: string;
  readonly name: string;
  readonly status: DeviceStatus;
}

export const TEST_DEVICES: readonly Device[] = [
  {
    batteryPercent: 82,
    coordinates: [116.3974, 39.9093],
    deviceId: "01",
    location: "北京市东城区",
    name: "无人机 01",
    status: "online",
  },
];

export function findDevice(deviceId: string): Device | undefined {
  return TEST_DEVICES.find((device) => device.deviceId === deviceId);
}
