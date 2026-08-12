import { type Device, findDevice } from "../map/devices.js";

export interface LocateDeviceInput {
  readonly deviceId: string;
}

export interface LocateDeviceSuccess {
  readonly device: Device;
  readonly status: "located";
}

export interface LocateDeviceNotFound {
  readonly code: "DEVICE_NOT_FOUND";
  readonly deviceId: string;
  readonly status: "not-found";
}

export type LocateDeviceResult = LocateDeviceSuccess | LocateDeviceNotFound;

export type SelectDevice = (device: Device) => void;

export function locateDevice(
  input: LocateDeviceInput,
  selectDevice: SelectDevice,
): LocateDeviceResult {
  const device = findDevice(input.deviceId);
  if (device === undefined) {
    return {
      code: "DEVICE_NOT_FOUND",
      deviceId: input.deviceId,
      status: "not-found",
    };
  }
  selectDevice(device);
  return { status: "located", device };
}
