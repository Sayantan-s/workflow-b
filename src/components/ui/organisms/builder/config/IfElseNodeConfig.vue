<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-vue-next";
import type {
  IfElseLogicData,
  Condition,
  ConditionOperator,
  ConditionValueType,
} from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props {
  nodeId: string;
  data: IfElseLogicData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();

// Local conditions state
const conditions = ref<Condition[]>([]);

// Validation errors per condition
const conditionErrors = ref<Record<number, Record<string, string>>>({});

// Zod schema for a single condition
const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.string(),
  valueType: z.string(),
  value: z.string(),
});

const operatorOptions = [
  { value: "equals", label: "Equals (===)" },
  { value: "notEquals", label: "Not Equals (!==)" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater Than (>)" },
  { value: "lt", label: "Less Than (<)" },
  { value: "isEmpty", label: "Is Empty" },
];

const typeOptions = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
];

const logicalOpOptions = [
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
];

// Generate unique ID for conditions
function generateId(): string {
  return `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new empty condition
function createEmptyCondition(): Condition {
  return {
    field: "",
    operator: "equals",
    valueType: "string",
    value: "",
    logicalOp: "AND",
  };
}

// Add a new condition
function addCondition() {
  conditions.value.push(createEmptyCondition());
  saveConditions();
}

// Remove a condition
function removeCondition(index: number) {
  conditions.value.splice(index, 1);
  delete conditionErrors.value[index];
  saveConditions();
}

// Validate a single condition
function validateCondition(condition: Condition, index: number): boolean {
  const result = conditionSchema.safeParse(condition);

  if (!result.success) {
    conditionErrors.value[index] = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      conditionErrors.value[index][field] = err.message;
    });
    return false;
  }

  // Additional validation: value is required unless operator is "isEmpty"
  if (condition.operator !== "isEmpty" && !condition.value) {
    conditionErrors.value[index] = { value: "Value is required" };
    return false;
  }

  conditionErrors.value[index] = {};
  return true;
}

// Update a condition field
function updateCondition(index: number, field: keyof Condition, value: string) {
  if (conditions.value[index]) {
    (conditions.value[index] as Record<string, unknown>)[field] = value;
    validateCondition(conditions.value[index], index);
    saveConditions();
  }
}

// Save conditions to store
function saveConditions() {
  const allValid = conditions.value.every((cond, i) =>
    validateCondition(cond, i)
  );
  const hasAtLeastOne =
    conditions.value.length > 0 && conditions.value[0].field;

  workflowStore.updateNodeData(props.nodeId, {
    conditions: conditions.value,
    isValid: allValid && !!hasAtLeastOne,
  });
}

// Check if value input should be shown for a condition
function showValueInput(condition: Condition): boolean {
  return condition.operator !== "isEmpty";
}

// Format condition for preview
function formatCondition(condition: Condition): string {
  const operatorMap: Record<string, string> = {
    equals: "===",
    notEquals: "!==",
    contains: "contains",
    gt: ">",
    lt: "<",
    isEmpty: "is empty",
  };

  const op = operatorMap[condition.operator] || condition.operator;

  if (condition.operator === "isEmpty") {
    return `${condition.field || "field"} ${op}`;
  }

  const displayValue =
    condition.valueType === "string" ? `"${condition.value}"` : condition.value;

  return `${condition.field || "field"} ${op} ${displayValue || "value"}`;
}

// Computed preview of all conditions
const conditionsPreview = computed(() => {
  if (conditions.value.length === 0) return "No conditions defined";

  return conditions.value
    .map((cond, i) => {
      const formatted = formatCondition(cond);
      if (i === 0) return formatted;
      return `${cond.logicalOp} ${formatted}`;
    })
    .join(" ");
});

// Sync from props
watch(
  () => props.data.conditions,
  (newConditions) => {
    if (newConditions && newConditions.length > 0) {
      conditions.value = newConditions.map((c) => ({ ...c }));
    } else {
      conditions.value = [createEmptyCondition()];
    }
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-[10px] text-gray-400">Define conditions</p>
      <button
        type="button"
        class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        @click="addCondition"
      >
        <Plus class="size-3" />
        Condition
      </button>
    </div>

    <!-- Conditions List -->
    <div class="space-y-3">
      <div
        v-for="(condition, index) in conditions"
        :key="index"
        class="relative p-3 bg-gray-50 rounded-lg border border-gray-200"
      >
        <!-- Logical Operator (for conditions after the first) -->
        <div v-if="index > 0" class="mb-3">
          <Select
            :model-value="condition.logicalOp"
            size="sm"
            :options="logicalOpOptions"
            @update:model-value="updateCondition(index, 'logicalOp', $event)"
          />
        </div>

        <!-- Remove button -->
        <button
          v-if="conditions.length > 1"
          type="button"
          class="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          @click="removeCondition(index)"
        >
          <Trash2 class="size-3.5" />
        </button>

        <div class="space-y-2.5">
          <!-- Field Name -->
          <div>
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide"
            >
              Field Name
            </label>
            <Input
              :model-value="condition.field"
              size="sm"
              type="text"
              placeholder="e.g., response.status"
              :error="conditionErrors[index]?.field"
              @update:model-value="updateCondition(index, 'field', $event)"
            />
          </div>

          <!-- Condition (Operator) -->
          <div>
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide"
            >
              Condition
            </label>
            <Select
              :model-value="condition.operator"
              size="sm"
              :options="operatorOptions"
              placeholder="Select condition"
              @update:model-value="updateCondition(index, 'operator', $event)"
            />
          </div>

          <!-- Type -->
          <div>
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide"
            >
              Type
            </label>
            <Select
              :model-value="condition.valueType"
              size="sm"
              :options="typeOptions"
              placeholder="Select type"
              @update:model-value="updateCondition(index, 'valueType', $event)"
            />
          </div>

          <!-- Value (conditionally shown) -->
          <div v-if="showValueInput(condition)">
            <label
              class="text-[10px] font-medium text-gray-500 uppercase tracking-wide"
            >
              Value
            </label>
            <Input
              :model-value="condition.value"
              size="sm"
              :type="condition.valueType === 'number' ? 'number' : 'text'"
              placeholder="Value to compare"
              :error="conditionErrors[index]?.value"
              @update:model-value="updateCondition(index, 'value', $event)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
      <p class="text-xs text-amber-700">
        <span class="font-medium">Expression:</span>
      </p>
      <code
        class="block mt-1 px-2 py-1 bg-amber-100 rounded text-[10px] text-amber-800 break-all"
      >
        {{ conditionsPreview }}
      </code>
      <div class="flex items-center gap-4 text-[10px] mt-2">
        <span class="text-green-600">✓ True → continue</span>
        <span class="text-red-600">✗ False → alternative path</span>
      </div>
    </div>
  </div>
</template>
