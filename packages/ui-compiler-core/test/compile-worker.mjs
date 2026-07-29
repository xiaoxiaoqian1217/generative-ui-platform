import { parentPort, workerData } from "node:worker_threads";
import { compileUI } from "../dist/index.js";

const results = workerData.map(({ input, options }) =>
  compileUI(input, options),
);

parentPort?.postMessage(results);
