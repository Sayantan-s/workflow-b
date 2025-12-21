import type { InjectionKey, ComputedRef } from "vue";
import type { Position } from "@vue-flow/core";
import type { WorkflowNodeData } from "@/types/workflow";
import type { ExecutionStatus } from "@/types/execution";

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
  executionStatus: ComputedRef<ExecutionStatus>;
  handleClick: () => void;
}

export const BASE_NODE_INJECTION_KEY: InjectionKey<BaseNodeContext> = Symbol("BaseNodeContext");
