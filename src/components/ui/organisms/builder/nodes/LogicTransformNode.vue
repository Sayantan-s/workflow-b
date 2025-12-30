<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { TransformLogicData } from "@/types/workflow";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";
import {
  getNodeIcon,
  getNodeColor,
  getNodeLabel,
  getNodeSubtext,
  getNodeIconBgColor,
  getNodeIconBorderColor,
  getNodeIconTextColor,
} from "@/lib/nodeIcons";

interface Props extends NodeProps {
  data: TransformLogicData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || getNodeLabel(props.data.type));
const icon = computed(() => getNodeIcon(props.data.type));
const nodeColor = computed(() => getNodeColor(props.data.type));
const subtext = computed(() => getNodeSubtext(props.data.type));
const iconBgColor = computed(() => getNodeIconBgColor(props.data.type));
const iconBorderColor = computed(() => getNodeIconBorderColor(props.data.type));
const iconTextColor = computed(() => getNodeIconTextColor(props.data.type));

const mappingCount = computed(() => props.data.mappings?.length ?? 0);

// Show first 3 mappings as preview
const mappingPreview = computed(() => {
  const mappings = props.data.mappings || [];
  return mappings.slice(0, 3);
});
</script>

<template>
  <BaseNode v-bind="$props" :color="nodeColor">
    <BaseNodeHandle type="target" />

    <BaseNodeHeader
      :icon="icon"
      :label="label"
      :subtext="subtext"
      :icon-bg-color="iconBgColor"
      :icon-border-color="iconBorderColor"
      :icon-text-color="iconTextColor"
    />

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
            <!-- Source -->
            <div class="flex items-center max-w-[80px]">
              <span
                v-if="mapping.type === 'static'"
                class="text-[8px] px-1 bg-gray-100 rounded text-gray-500 mr-1 shrink-0"
                >V</span
              >
              <span
                v-else
                class="text-[8px] px-1 bg-blue-50 rounded text-blue-500 mr-1 shrink-0"
                >P</span
              >
              <code class="text-gray-500 truncate block">{{
                mapping.value
              }}</code>
            </div>

            <span class="text-gray-400 shrink-0">→</span>

            <!-- Target -->
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
        <div v-else class="text-[10px] text-gray-400 italic">
          Click to configure mappings
        </div>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" />
  </BaseNode>
</template>
