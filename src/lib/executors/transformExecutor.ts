import type { TransformExecutorInput } from "@/types/execution";

export interface TransformExecutorOutput {
  variables: Record<string, unknown>;
  mappingResults: Array<{
    sourcePath: string;
    variableName: string;
    value: unknown;
    success: boolean;
  }>;
}

/**
 * Get a value from an object using JSONPath-like syntax
 * Supports: $.data.user.name, $.items[0], etc.
 */
function getValueByPath(data: unknown, path: string): unknown {
  if (!path) return undefined;

  // Remove leading $. if present
  let normalizedPath = path.startsWith("$.") ? path.slice(2) : path;
  if (normalizedPath.startsWith(".")) {
    normalizedPath = normalizedPath.slice(1);
  }

  // Split by dots and brackets
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

/**
 * Execute transform/mapper node
 * Extracts values from source data and creates variables
 */
export async function executeTransform(
  input: TransformExecutorInput
): Promise<TransformExecutorOutput> {
  const variables: Record<string, unknown> = {};
  const mappingResults: TransformExecutorOutput["mappingResults"] = [];

  for (const mapping of input.mappings) {
    try {
      const value = getValueByPath(input.sourceData, mapping.sourcePath);
      
      // Use default value if path returns undefined
      const finalValue = value !== undefined ? value : mapping.defaultValue;

      variables[mapping.variableName] = finalValue;
      
      mappingResults.push({
        sourcePath: mapping.sourcePath,
        variableName: mapping.variableName,
        value: finalValue,
        success: true,
      });
    } catch (error) {
      // Use default value on error
      variables[mapping.variableName] = mapping.defaultValue;
      
      mappingResults.push({
        sourcePath: mapping.sourcePath,
        variableName: mapping.variableName,
        value: mapping.defaultValue,
        success: false,
      });
    }
  }

  return {
    variables,
    mappingResults,
  };
}

