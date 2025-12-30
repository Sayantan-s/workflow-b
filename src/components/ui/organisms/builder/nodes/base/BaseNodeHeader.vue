<script setup lang="ts">
import { inject, type Component } from "vue";
import { WorkflowExecutionStatus } from "@/types/workflow";
import { BASE_NODE_INJECTION_KEY } from "./context";

interface Props {
  icon?: Component;
  label?: string;
  subtext?: string;
  iconBgColor?: string;
  iconBorderColor?: string;
  iconTextColor?: string;
  labelColorClass?: string;
  subtextColorClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  iconBgColor: undefined,
  iconBorderColor: undefined,
  iconTextColor: undefined,
  labelColorClass: undefined,
  subtextColorClass: undefined,
});

const context = inject(BASE_NODE_INJECTION_KEY);

if (!context) {
  throw new Error("BaseNodeHeader must be used within BaseNode");
}

// Determine icon colors based on node color if not explicitly provided
const iconBg = props.iconBgColor || context.color + "15";
const iconBorder = props.iconBorderColor || context.color + "33";
const iconColor = props.iconTextColor || context.color;

// Determine text colors - use provided classes or default based on color
const getLabelColorClass = () => {
  if (props.labelColorClass) return props.labelColorClass;
  // Default colors based on node color
  if (context.color === "#22c55e") return "text-green-900";
  if (context.color === "#3b82f6") return "text-blue-900";
  if (context.color === "#f59e0b") return "text-amber-900";
  return "text-gray-900";
};

const getSubtextColorClass = () => {
  if (props.subtextColorClass) return props.subtextColorClass;
  // Default colors based on node color
  if (context.color === "#22c55e") return "text-green-800/50";
  if (context.color === "#3b82f6") return "text-blue-800/50";
  if (context.color === "#f59e0b") return "text-amber-800/50";
  return "text-gray-800/50";
};
</script>

<template>
  <div
    class="base-node-header flex items-center gap-2 px-2 py-2.5 rounded-t-md"
    :style="{ backgroundColor: context.color + '15' }"
  >
    <!-- Icon: Use prop if provided, otherwise fall back to slot -->
    <span v-if="icon" class="shrink-0">
      <div
        v-if="iconBgColor || iconBorderColor"
        class="p-1.5 rounded-full"
        :style="{
          backgroundColor: iconBg,
          borderColor: iconBorder,
          borderWidth: iconBorder ? '1px' : '0',
        }"
      >
        <component :is="icon" class="size-4" :style="{ color: iconColor }" />
      </div>
      <component
        v-else
        :is="icon"
        class="size-4"
        :style="{ color: iconColor }"
      />
    </span>
    <span v-else class="shrink-0 [&>svg]:size-4" :style="{ color: iconColor }">
      <slot name="icon" />
    </span>

    <!-- Content: Use props if provided, otherwise fall back to slot -->
    <div v-if="label || subtext" class="flex-1 min-w-0">
      <div
        v-if="label"
        :class="['text-xs font-medium truncate', getLabelColorClass()]"
      >
        {{ label }}
      </div>
      <p
        v-if="subtext"
        :class="['text-xs font-normal truncate', getSubtextColorClass()]"
      >
        {{ subtext }}
      </p>
    </div>
    <span v-else class="text-sm truncate">
      <slot />
    </span>

    <!-- Status indicator -->
    <span
      v-if="context.executionStatus.value === WorkflowExecutionStatus.RUNNING"
      class="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse"
    />
    <span
      v-else-if="
        context.executionStatus.value === WorkflowExecutionStatus.SUCCESS
      "
      class="ml-auto w-2 h-2 rounded-full bg-green-500"
    />
    <span
      v-else-if="
        context.executionStatus.value === WorkflowExecutionStatus.ERROR
      "
      class="ml-auto w-2 h-2 rounded-full bg-red-500"
    />

    <!-- Extra slot for additional header content -->
    <slot name="extra" />
  </div>
</template>

<style scoped></style>
