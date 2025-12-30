<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { z } from "zod";
import { Plus, Trash2, Info, Database } from "lucide-vue-next";
import type {
  TransformLogicData,
  VariableMapping,
  WorkflowNode,
} from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowExecution } from "@/stores/execution";

interface Props {
  nodeId: string;
  data: TransformLogicData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();
const executionStore = useWorkflowExecution();

// Local mappings state
const mappings = ref<VariableMapping[]>([]);

// Validation errors per mapping
const mappingErrors = ref<Record<number, Record<string, string>>>({});

// Zod schema for a single mapping
const mappingSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid variable name (alphanumeric, _)")
    .refine((val) => val !== "input" && val !== "output", {
      message: "Reserved variable name",
    }),
  type: z.enum(["static", "path"]),
  value: z.string().min(1, "Value is required"),
});

const typeOptions = [
  { value: "path", label: "Dynamic Value (Path)" },
  { value: "static", label: "Static Value" },
];

// Generate unique ID for mappings
function generateId(): string {
  return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new empty mapping
function createEmptyMapping(): VariableMapping {
  return {
    id: generateId(),
    variableName: "",
    type: "path", // Default to path as it's the primary use case
    value: "",
  };
}

// Add a new mapping
function addMapping() {
  mappings.value.push(createEmptyMapping());
  saveMappings();
}

// Remove a mapping
function removeMapping(index: number) {
  mappings.value.splice(index, 1);
  delete mappingErrors.value[index];
  saveMappings();
}

// Validate a single mapping
function validateMapping(mapping: VariableMapping, index: number): boolean {
  const result = mappingSchema.safeParse(mapping);

  if (!result.success) {
    mappingErrors.value[index] = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      mappingErrors.value[index][field] = err.message;
    });
    return false;
  }

  mappingErrors.value[index] = {};
  return true;
}

// Update a mapping field
function updateMapping(index: number, field: keyof VariableMapping, value: any) {
  if (mappings.value[index]) {
    // @ts-ignore
    mappings.value[index][field] = value;
    validateMapping(mappings.value[index], index);
    saveMappings();
  }
}

// Save mappings to store
function saveMappings() {
  const allValid = mappings.value.every((map, i) => validateMapping(map, i));
  const hasMappings = mappings.value.length > 0;

  workflowStore.updateNodeData(props.nodeId, {
    mappings: mappings.value,
    isValid: allValid && hasMappings,
  });
}

// Computed preview of output variables
const outputVariables = computed(() => {
  if (mappings.value.length === 0) return [];
  return mappings.value
    .filter((m) => m.variableName)
    .map((m) => m.variableName);
});

// Get available upstream node outputs for path extraction
const upstreamNodeOutputs = computed(() => {
  const currentNode = workflowStore.nodes.find((n) => n.id === props.nodeId);
  if (!currentNode) return [];

  const outputs: Array<{ nodeId: string; nodeLabel: string; data: unknown }> =
    [];

  // Get upstream nodes
  const upstreamEdges = workflowStore.edges.filter(
    (e) => e.target === props.nodeId
  );

  upstreamEdges.forEach((edge) => {
    const upstreamNode = workflowStore.nodes.find((n) => n.id === edge.source);
    if (upstreamNode) {
      // Try to get execution result if available
      const executionResult = executionStore.getNodeResult(upstreamNode.id);
      outputs.push({
        nodeId: upstreamNode.id,
        nodeLabel: upstreamNode.data.label || upstreamNode.id,
        data: executionResult?.output || {},
      });
    }
  });

  return outputs;
});

// Sync from props
watch(
  () => props.data.mappings,
  (newMappings) => {
    if (newMappings && newMappings.length > 0) {
      mappings.value = newMappings.map((m) => ({ ...m }));
    } else {
      mappings.value = [];
    }
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Variables
        </h3>
        <p class="text-[10px] text-gray-400">Map data to variables</p>
      </div>
      <button
        type="button"
        class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
        @click="addMapping"
      >
        <Plus class="size-3" />
        Add Variable
      </button>
    </div>

    <!-- Mappings List -->
    <div v-if="mappings.length > 0" class="space-y-3">
      <div
        v-for="(mapping, index) in mappings"
        :key="mapping.id"
        class="relative p-3 bg-gray-50 rounded-lg border border-gray-200 group"
      >
        <!-- Remove button -->
        <button
          type="button"
          class="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
          @click="removeMapping(index)"
          title="Remove mapping"
        >
          <Trash2 class="size-3.5" />
        </button>

        <div class="space-y-3">
          <!-- Variable Name -->
          <div>
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1"
            >
              Target Variable
              <span class="text-red-500">*</span>
            </label>
            <VariableInput
              :model-value="mapping.variableName"
              :node-id="props.nodeId"
              size="sm"
              type="text"
              placeholder="e.g. userId"
              :error="mappingErrors[index]?.variableName"
              @update:model-value="updateMapping(index, 'variableName', $event)"
            />
          </div>

          <!-- Source Type -->
          <div>
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide"
            >
              Source Type
            </label>
            <Select
              :model-value="mapping.type"
              size="sm"
              :options="typeOptions"
              @update:model-value="updateMapping(index, 'type', $event)"
            />
          </div>

          <!-- Value -->
          <div>
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1"
            >
              <span v-if="mapping.type === 'path'">JSON Path Expression</span>
              <span v-else>Value</span>
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <VariableInput
                :model-value="mapping.value"
                :node-id="props.nodeId"
                size="sm"
                type="text"
                :placeholder="
                  mapping.type === 'path'
                    ? 'e.g. response.data.id'
                    : 'Static value or {{ variableName }}'
                "
                :error="mappingErrors[index]?.value"
                @update:model-value="updateMapping(index, 'value', $event)"
              />
              <!-- Hint for dynamic values -->
              <div
                v-if="mapping.type === 'path'"
                class="mt-1 space-y-1"
              >
                <div class="flex items-start gap-1 text-[10px] text-gray-400">
                  <Info class="size-3 shrink-0 mt-0.5" />
                  <span>
                    Use dot notation to access data from previous steps. e.g.
                    <code class="px-1 bg-gray-100 rounded">response.body.data</code>
                  </span>
                </div>
                <!-- Show available upstream outputs -->
                <div
                  v-if="upstreamNodeOutputs.length > 0"
                  class="ml-4 p-2 bg-blue-50 rounded border border-blue-200"
                >
                  <div class="flex items-center gap-1 text-[10px] font-medium text-blue-700 mb-1">
                    <Database class="size-3" />
                    Available from upstream:
                  </div>
                  <div class="space-y-0.5">
                    <div
                      v-for="output in upstreamNodeOutputs"
                      :key="output.nodeId"
                      class="text-[10px] text-blue-600"
                    >
                      <span class="font-medium">{{ output.nodeLabel }}:</span>
                      <code class="ml-1 text-[9px] bg-blue-100 px-1 rounded">
                        {{ Object.keys(output.data as object).slice(0, 3).join(", ") }}
                        {{ Object.keys(output.data as object).length > 3 ? "..." : "" }}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center"
    >
      <div class="p-2 bg-gray-100 rounded-full mb-2">
        <Info class="size-4 text-gray-400" />
      </div>
      <p class="text-xs text-gray-500 font-medium">No variables mapped</p>
      <p class="text-[10px] text-gray-400 mt-1">
        Add a variable to extract data or store static values for later use.
      </p>
      <button
        type="button"
        class="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        @click="addMapping"
      >
        + Add Variable
      </button>
    </div>

    <!-- Usage Preview -->
    <div
      v-if="outputVariables.length > 0"
      class="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4"
    >
      <p class="text-xs text-amber-800 font-medium flex items-center gap-1">
        <Info class="size-3" />
        Usage in future nodes:
      </p>
      <div class="mt-2 space-y-1">
        <div
          v-for="v in outputVariables"
          :key="v"
          class="text-[10px] text-amber-700 font-mono bg-amber-100/50 px-2 py-1 rounded border border-amber-100"
        >
          &#123;&#123; {{ v }} &#125;&#125;
        </div>
      </div>
    </div>
  </div>
</template>

