import {
  type AGUIEvent as CoreAGUIEvent,
  EventSchemas,
  type RunAgentInput,
  RunAgentInputSchema,
} from "@ag-ui/core";
import { z } from "zod";

export const agUIEventSchema = EventSchemas;
export const agUIRunInputSchema = RunAgentInputSchema;
export const agUIEventSequenceSchema = z.array(EventSchemas).min(2);

export type AGUIEvent = CoreAGUIEvent;
export type AGUIEventSequence = readonly CoreAGUIEvent[];
export type AGUIRunInput = RunAgentInput;
