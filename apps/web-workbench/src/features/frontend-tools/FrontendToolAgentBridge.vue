<script setup lang="ts">
import { useAgent, useCopilotKit, useFrontendTool } from "@copilotkit/vue/v2";
import { watch } from "vue";
import { z } from "zod";
import type { Device } from "../map/devices.js";
import { locateDevice } from "./locate-device.js";

const emit = defineEmits<{
  activityChange: [
    activity: { deviceId: string; status: "running" | "completed" | "failed" },
  ];
  deviceLocated: [device: Device];
}>();

const { agent } = useAgent({ agentId: "default" });
const { copilotkit } = useCopilotKit();
type AgentInstance = NonNullable<typeof agent.value>;

useFrontendTool({
  name: "locateDevice",
  description:
    "Locate a business device in the persistent GIS workspace by device ID.",
  parameters: z.object({
    deviceId: z.string().describe("Business device ID, for example 01"),
  }),
  async handler({ deviceId }) {
    emit("activityChange", { deviceId, status: "running" });
    const result = locateDevice({ deviceId });
    if (result.status === "not-found") {
      emit("activityChange", { deviceId, status: "failed" });
      throw new Error(`DEVICE_NOT_FOUND:${deviceId}`);
    }
    emit("deviceLocated", result.device);
    emit("activityChange", { deviceId, status: "completed" });
    return JSON.stringify({
      deviceId: result.device.id,
      location: result.device.location,
      status: "located",
    });
  },
});

function resolvedAgent(timeoutMs = 5_000): Promise<AgentInstance> {
  const current = agent.value;
  if (current !== null) return Promise.resolve(current);
  return new Promise<AgentInstance>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      stop();
      reject(new Error("AG_UI_MOCK_AGENT_UNAVAILABLE"));
    }, timeoutMs);
    const stop = watch(agent, (value) => {
      if (value === null) return;
      globalThis.clearTimeout(timeout);
      stop();
      resolve(value);
    });
  });
}

async function run(message: string): Promise<string> {
  const currentAgent = await resolvedAgent();
  currentAgent.addMessage({
    content: message,
    id: globalThis.crypto.randomUUID(),
    role: "user",
  });
  await copilotkit.value.runAgent({ agent: currentAgent });
  const response = [...currentAgent.messages]
    .reverse()
    .find(
      (candidate) =>
        candidate.role === "assistant" && typeof candidate.content === "string",
    );
  return response?.role === "assistant" && typeof response.content === "string"
    ? response.content
    : "定位请求已完成";
}

defineExpose({ run });
</script>

<template><span hidden></span></template>
