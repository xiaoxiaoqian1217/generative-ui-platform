export type DeviceStatus = "online" | "offline";

export interface Device {
  readonly batteryPercent: number;
  readonly coordinates: readonly [longitude: number, latitude: number];
  readonly id: string;
  readonly location: string;
  readonly name: string;
  readonly status: DeviceStatus;
}

export const DEVICES: readonly Device[] = [
  {
    batteryPercent: 78,
    coordinates: [121.4737, 31.2304],
    id: "01",
    location: "上海市黄浦区巡检走廊",
    name: "Drone 01",
    status: "online",
  },
];

export function findDevice(deviceId: string): Device | undefined {
  return DEVICES.find((device) => device.id === deviceId);
}
