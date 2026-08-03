import {
  readProcessState,
  removeProcessState,
  stopTrackedPlatformProcesses,
} from "./platform-processes.mjs";

const processes = await readProcessState();
await stopTrackedPlatformProcesses(processes);
await removeProcessState();
process.stdout.write("Platform processes stopped.\n");
