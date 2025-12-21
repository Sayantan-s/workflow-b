import type { DelayExecutorInput } from "@/types/execution";

export interface DelayExecutorOutput {
  delayed: boolean;
  requestedDelay: string;
  actualDelay: number;
  timestamp: string;
}

/**
 * Execute a delay node
 * In preview mode, we use a shortened delay (max 5 seconds)
 */
export async function executeDelay(
  input: DelayExecutorInput,
  options?: { maxPreviewDelay?: number }
): Promise<DelayExecutorOutput> {
  const maxDelay = options?.maxPreviewDelay ?? 5000; // 5 seconds max for preview

  // Calculate actual delay in milliseconds
  let delayMs: number;
  switch (input.delayUnit) {
    case "seconds":
      delayMs = input.delayValue * 1000;
      break;
    case "minutes":
      delayMs = input.delayValue * 60 * 1000;
      break;
    case "hours":
      delayMs = input.delayValue * 60 * 60 * 1000;
      break;
    case "days":
      delayMs = input.delayValue * 24 * 60 * 60 * 1000;
      break;
    default:
      delayMs = input.delayValue * 1000;
  }

  // Cap delay for preview mode
  const actualDelay = Math.min(delayMs, maxDelay);

  // Wait for the delay
  await new Promise((resolve) => setTimeout(resolve, actualDelay));

  return {
    delayed: true,
    requestedDelay: `${input.delayValue} ${input.delayUnit}`,
    actualDelay,
    timestamp: new Date().toISOString(),
  };
}

