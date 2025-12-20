<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { TransformLogicData } from "@/types/workflow";
import { Shuffle } from "lucide-vue-next";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";

interface Props extends NodeProps {
  data: TransformLogicData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || "Transform");

const mappingCount = computed(() => props.data.mappings?.length ?? 0);

const mappingSummary = computed(() => {
  const mappings = props.data.mappings || [];
  if (mappings.length === 0) return "No mappings configured";
  if (mappings.length === 1) {
    const m = mappings[0];
    return `${m.sourcePath} → ${m.variableName}`;
  }
  return `${mappings.length} variable mappings`;
});

// Show first 3 mappings as preview
const mappingPreview = computed(() => {
  const mappings = props.data.mappings || [];
  return mappings.slice(0, 3);
});
</script>

<template>
  <BaseNode v-bind="$props" color="#f59e0b">
    <BaseNodeHandle type="target" />

    <BaseNodeHeader>
      <template #icon>
        <div
          class="bg-amber-100 border border-amber-700/20 p-1.5 rounded-full"
        >
          <Shuffle class="text-amber-700 size-4" />
        </div>
      </template>
      <div>
        <div class="text-amber-900 text-xs font-medium">{{ label }}</div>
        <p class="text-xs! text-amber-800/50 font-normal">
          Extract & map data
        </p>
      </div>
    </BaseNodeHeader>

    <BaseNodeContent>
      <div class="space-y-2">
        <!-- Mapping count badge -->
        <div class="flex items-center gap-2">
          <span
            class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium"
          >
            {{ mappingCount }} mapping{{ mappingCount !== 1 ? "s" : "" }}
          </span>
        </div>

        <!-- Mapping previews -->
        <div
          v-if="mappingPreview.length > 0"
          class="space-y-1 border-t border-gray-100 pt-2"
        >
          <div
            v-for="mapping in mappingPreview"
            :key="mapping.id"
            class="flex items-center gap-1 text-[10px]"
          >
            <code class="text-gray-500 truncate max-w-[60px]">{{
              mapping.sourcePath
            }}</code>
            <span class="text-gray-400">→</span>
            <code class="text-amber-600 font-medium truncate max-w-[60px]">{{
              mapping.variableName
            }}</code>
          </div>
          <div
            v-if="props.data.mappings?.length > 3"
            class="text-[10px] text-gray-400"
          >
            +{{ props.data.mappings.length - 3 }} more...
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="text-[10px] text-gray-400 italic"
        >
          Click to configure mappings
        </div>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" />
  </BaseNode>
</template>

