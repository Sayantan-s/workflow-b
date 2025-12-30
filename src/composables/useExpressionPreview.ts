import { computed, type Ref, type ComputedRef } from "vue";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * Expression pattern: ${{expression}}
 * Supports:
 *   - $json.field - current node's input data
 *   - $node.NodeName.json.field - specific node's output
 */
const EXPRESSION_REGEX = /\$\{\{(.+?)\}\}/g;

/**
 * Traverse an object by dot-notation path
 */
function traversePath(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (!key) continue;
    if (current && typeof current === "object") {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Resolve a single expression against the workflow store data
 */
function resolveExpression(expression: string, store: ReturnType<typeof useWorkflowStore>): string | undefined {
  const expr = expression.trim();
  
  // Case 1: $json.field - resolve from active node's result or input
  if (expr.startsWith("$json.")) {
    const path = expr.slice(6).split(".");
    const activeNode = store.activeNode;
    if (!activeNode) return undefined;
    
    // Try to get the result from the active node or its input
    const result = store.nodeResults[activeNode.id];
    if (result !== undefined) {
      const value = traversePath(result, path);
      return value !== undefined ? String(value) : undefined;
    }
    return undefined;
  }
  
  // Case 2: $node.NodeName.json.field - resolve from specific node
  if (expr.startsWith("$node.")) {
    const parts = expr.slice(6).split(".");
    if (parts.length < 2) return undefined;
    
    const nodeName = parts[0];
    const node = store.nodes.find(n => n?.data?.label === nodeName);
    if (!node) return undefined;
    
    // Check if accessing .json
    if (parts[1] === "json") {
      const path = parts.slice(2);
      const result = store.nodeResults[node.id];
      if (result !== undefined) {
        const value = traversePath(result, path);
        return value !== undefined ? String(value) : undefined;
      }
    }
    return undefined;
  }
  
  return undefined;
}

/**
 * Composable to resolve expressions in a string and provide a preview
 * @param value - Reactive reference to the input value
 * @returns Object with resolved preview (null if no expressions or same as input)
 */
export function useExpressionPreview(value: Ref<string | undefined> | ComputedRef<string | undefined>) {
  const store = useWorkflowStore();
  
  const resolvedPreview = computed(() => {
    const input = value.value;
    if (!input || typeof input !== "string") return null;
    
    // Check if there are any expressions in the input
    if (!input.includes("${{")) return null;
    
    let hasResolutions = false;
    const resolved = input.replace(EXPRESSION_REGEX, (match, expr) => {
      const result = resolveExpression(expr, store);
      if (result !== undefined) {
        hasResolutions = true;
        return result;
      }
      // Keep the original expression if not resolved
      return match;
    });
    
    // Only return preview if we actually resolved something
    if (!hasResolutions) return null;
    
    // Don't show preview if it's the same as input
    if (resolved === input) return null;
    
    return resolved;
  });
  
  const hasExpressions = computed(() => {
    const input = value.value;
    return input && typeof input === "string" && input.includes("${{");
  });
  
  return {
    resolvedPreview,
    hasExpressions,
  };
}
