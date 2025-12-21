import type { IfElseExecutorInput } from "@/types/execution";

export interface IfElseExecutorOutput {
  result: boolean;
  evaluatedConditions: Array<{
    condition: string;
    result: boolean;
  }>;
  branch: "true" | "false";
}

/**
 * Get a value from an object using dot notation path
 * e.g., getNestedValue({ a: { b: 1 } }, "a.b") => 1
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== "object" || obj === null) {
    return undefined;
  }

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  field: string,
  operator: string,
  value: string,
  valueType: string,
  context: Record<string, unknown>
): boolean {
  // Get the actual value from context
  const actualValue = getNestedValue(context, field);

  // Convert expected value based on type
  let expectedValue: unknown = value;
  if (valueType === "number") {
    expectedValue = parseFloat(value);
  } else if (valueType === "boolean") {
    expectedValue = value.toLowerCase() === "true";
  }

  // Evaluate based on operator
  switch (operator) {
    case "equals":
      return actualValue === expectedValue;

    case "notEquals":
      return actualValue !== expectedValue;

    case "contains":
      if (typeof actualValue === "string") {
        return actualValue.includes(String(expectedValue));
      }
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return false;

    case "gt":
      return Number(actualValue) > Number(expectedValue);

    case "lt":
      return Number(actualValue) < Number(expectedValue);

    case "isEmpty":
      if (actualValue === null || actualValue === undefined) return true;
      if (typeof actualValue === "string") return actualValue.trim() === "";
      if (Array.isArray(actualValue)) return actualValue.length === 0;
      if (typeof actualValue === "object") return Object.keys(actualValue).length === 0;
      return false;

    default:
      return false;
  }
}

/**
 * Execute IF/ELSE condition evaluation
 */
export async function executeIfElse(
  input: IfElseExecutorInput
): Promise<IfElseExecutorOutput> {
  const evaluatedConditions: IfElseExecutorOutput["evaluatedConditions"] = [];
  
  if (input.conditions.length === 0) {
    // No conditions - default to true
    return {
      result: true,
      evaluatedConditions: [],
      branch: "true",
    };
  }

  let finalResult = true;
  let isFirstCondition = true;

  for (const condition of input.conditions) {
    const conditionResult = evaluateCondition(
      condition.field,
      condition.operator,
      condition.value,
      condition.valueType,
      input.context
    );

    const conditionString = `${condition.field} ${condition.operator} ${condition.value}`;
    evaluatedConditions.push({
      condition: conditionString,
      result: conditionResult,
    });

    if (isFirstCondition) {
      finalResult = conditionResult;
      isFirstCondition = false;
    } else {
      // Apply logical operator
      if (condition.logicalOp === "OR") {
        finalResult = finalResult || conditionResult;
      } else {
        // Default to AND
        finalResult = finalResult && conditionResult;
      }
    }
  }

  return {
    result: finalResult,
    evaluatedConditions,
    branch: finalResult ? "true" : "false",
  };
}

