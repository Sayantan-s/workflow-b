import { type useWorkflowStore } from "@/stores/workflow";

type WorkflowStore = ReturnType<typeof useWorkflowStore>;

/**
 * Resolves a string containing {{ handlebars }} expressions using data from the workflow store.
 * Supported patterns:
 * - $node.NODE_NAME.json.KEY (access execution results)
 * - $vars.KEY (access variables - placeholder for now)
 * - $env.KEY (access environment variables - placeholder for now)
 *
 * @param expression The string to resolve
 * @param store The workflow store instance
 * @returns The resolved string
 */
export function resolveExpression(expression: string, store: WorkflowStore): string {
  if (!expression) return "";

  // Regex to match {{ ... }}
  const regex = /\{\{\s*(.*?)\s*\}\}/g;

  return expression.replace(regex, (match, path) => {
    try {
      const result = resolvePath(path, store);
      return result !== undefined && result !== null ? String(result) : "";
    } catch (e) {
      console.warn(`Failed to resolve expression: ${match}`, e);
      return match; // Return original on error
    }
  });
}

/**
 * Resolves a specific path like "$node.MyNode.json.data"
 */
function resolvePath(path: string, store: WorkflowStore): any {
  const parts = path.split(".");
  const root = parts[0];

  if (root === "$node") {
    // Format: $node.NodeName.json.key...
    if (parts.length < 3) return undefined;
    
    const nodeName = parts[1];
    // We need to find the node ID by name. 
    // Since names might not be unique or we might address by ID, 
    // strict n8n style is by Name. 
    // Assuming for now the store has a way to lookup by name or we iterate.
    const node = store.nodes.find(n => n?.data?.label === nodeName); // strict name match?
    
    if (!node) return undefined;

    const outputType = parts[2]; // usually "json"
    if (outputType !== "json") return undefined; // strict for now?

    // Get result from store
    const result = store.nodeResults[node.id];
    if (!result) return undefined;

    // Traverse the rest of the path
    return traverseObject(result, parts.slice(3));
  }
  
  // TODO: Add $vars, $env support
  return undefined;
}

function traverseObject(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}
