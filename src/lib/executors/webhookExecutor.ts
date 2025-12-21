import type { HttpExecutorInput, HttpExecutorOutput } from "@/types/execution";
import { executeHttp } from "./httpExecutor";

/**
 * Execute a Webhook trigger
 * Makes actual HTTP calls similar to HTTP executor
 */
export async function executeWebhook(
  input: HttpExecutorInput
): Promise<HttpExecutorOutput> {
  // Webhook execution is essentially the same as HTTP
  // but we might want to add specific webhook handling in the future
  return executeHttp(input);
}

