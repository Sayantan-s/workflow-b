import type { VariableMapping } from "@/types/workflow";

export interface TransformExecutorOutput {
  variables: Record<string, unknown>;
  mappingResults: Array<{
    variableName: string;
    value: unknown;
    success: boolean;
    sourceType: "static" | "path";
  }>;
}

/**
 * Get a value from an object using JSONPath-like syntax
 * Supports:
 * - $.data.user.name
 * - $.items[0]
 * - data.user.name
 * - response.data.id
 * - response.data.users[0].name (array access)
 * - data.items[0].value (nested array access)
 *
 * Special handling: If path starts with "response." and the data doesn't have
 * a "response" key, it strips "response." and tries again (for user convenience)
 *
 * Array handling: Supports bracket notation like [0], [1] to access array indices
 */
function getValueByPath(data: unknown, path: string): unknown {
  if (!path) return undefined;

  // Remove leading $. if present
  let normalizedPath = path.startsWith("$.") ? path.slice(2) : path;
  if (normalizedPath.startsWith(".")) {
    normalizedPath = normalizedPath.slice(1);
  }

  // Handle "response." prefix - if data doesn't have "response" key, strip it
  // This allows users to write "response.data.users[0].name" even when the
  // data itself is the response object (not wrapped in a "response" key)
  if (normalizedPath.startsWith("response.")) {
    // Check if data has a "response" key
    if (
      typeof data === "object" &&
      data !== null &&
      !("response" in (data as Record<string, unknown>))
    ) {
      // Strip "response." prefix since the data itself IS the response
      normalizedPath = normalizedPath.slice("response.".length);
    }
  }

  // Split by dots and brackets - this handles both object properties and array indices
  // Example: "data.users[0].name" -> ["data", "users", "0", "name"]
  const parts = normalizedPath.split(/\.|\[|\]/).filter(Boolean);

  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array index
    if (/^\d+$/.test(part)) {
      if (Array.isArray(current)) {
        current = current[parseInt(part, 10)];
      } else {
        return undefined;
      }
    } else {
      // Handle object property
      if (typeof current === "object" && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

export interface TransformExecutorInput {
  mappings: VariableMapping[];
  sourceData: unknown;
}

/**
 * Execute transform/mapper node
 * Extracts values from source data and creates variables
 * Supports both static values and JSONPath extraction
 */
export async function executeTransform(
  input: TransformExecutorInput
): Promise<TransformExecutorOutput> {
  const variables: Record<string, unknown> = {};
  const mappingResults: TransformExecutorOutput["mappingResults"] = [];

  for (const mapping of input.mappings) {
    try {
      let finalValue: unknown;
      let success = true;

      if (mapping.type === "static") {
        // Static value - use as-is
        finalValue = mapping.value;
      } else {
        // Path-based extraction
        const extractedValue = getValueByPath(input.sourceData, mapping.value);

        if (extractedValue === undefined) {
          // Path extraction failed - throw error to stop execution
          let errorMessage = `Failed to extract path "${mapping.value}" for variable "${mapping.variableName}".`;

          // Add helpful context about available data
          if (
            typeof input.sourceData === "object" &&
            input.sourceData !== null
          ) {
            const availableKeys = Object.keys(input.sourceData);
            if (availableKeys.length > 0) {
              errorMessage += ` Available keys in source data: ${availableKeys.join(
                ", "
              )}.`;
            } else {
              errorMessage += " Source data is an empty object.";
            }
          } else if (input.sourceData === null) {
            errorMessage += " Source data is null.";
          } else if (input.sourceData === undefined) {
            errorMessage +=
              " Source data is undefined (upstream node may not have executed successfully).";
          } else {
            errorMessage += ` Source data type: ${typeof input.sourceData}.`;
          }

          throw new Error(errorMessage);
        } else {
          finalValue = extractedValue;
        }
      }

      variables[mapping.variableName] = finalValue;

      mappingResults.push({
        variableName: mapping.variableName,
        value: finalValue,
        success,
        sourceType: mapping.type,
      });
    } catch (error) {
      // Re-throw the error to stop execution and show error in UI
      // This ensures that undefined path extractions break the workflow
      throw error;
    }
  }

  return {
    variables,
    mappingResults,
  };
}
