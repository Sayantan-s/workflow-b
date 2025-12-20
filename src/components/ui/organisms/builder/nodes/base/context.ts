import type { InjectionKey, ComputedRef } from "vue";
import type { Position } from "@vue-flow/core";
import type { WorkflowNodeData, WorkflowExecutionStatus } from "@/types/workflow";

export interface HandleConfig {
  id: string;
  label?: string;
  position?: Position;
}

export interface BaseNodeContext {
  id: string;
  data: WorkflowNodeData;
  color: string;
  isActive: ComputedRef<boolean>;
  isSelected: ComputedRef<boolean>;
  hasValidationError: ComputedRef<boolean>;
  executionStatus: ComputedRef<WorkflowExecutionStatus | undefined>;
  handleClick: () => void;
}

export const BASE_NODE_INJECTION_KEY: InjectionKey<BaseNodeContext> = Symbol("BaseNodeContext");
