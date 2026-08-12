import { type Device, findDevice } from "../map/devices.js";

export interface LocateDeviceInput {
  readonly deviceId: string;
}

export type LocateDeviceResult =
  | { readonly device: Device; readonly status: "located" }
  | { readonly deviceId: string; readonly status: "not-found" };

export function locateDevice(input: LocateDeviceInput): LocateDeviceResult {
  const device = findDevice(input.deviceId);
  return device === undefined
    ? { deviceId: input.deviceId, status: "not-found" }
    : { device, status: "located" };
}
