import type { SmsExecutorInput } from "@/types/execution";

export interface SmsExecutorOutput {
  sid: string;
  status: "queued" | "sent" | "delivered";
  to: string;
  from: string;
  segments: number;
  timestamp: string;
}

/**
 * Simulate SMS sending with random success/error
 * This is a dummy async function for preview purposes
 */
export async function executeSms(
  input: SmsExecutorInput
): Promise<SmsExecutorOutput> {
  // Simulate network delay (300ms - 1500ms)
  const delay = 300 + Math.random() * 1200;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Random success rate (85% success, 15% error)
  const isSuccess = Math.random() > 0.15;

  if (!isSuccess) {
    // Random error scenarios
    const errors = [
      "Invalid phone number format",
      "Carrier rejected message",
      "Insufficient account balance",
      "Number is on do-not-call list",
      "SMS gateway timeout",
    ];
    const errorMessage = errors[Math.floor(Math.random() * errors.length)];
    throw new Error(`SMS sending failed: ${errorMessage}`);
  }

  // Generate fake SID
  const sid = `SM${Date.now()}${Math.random().toString(36).substring(7)}`;

  // Calculate segments (160 chars per segment)
  const segments = Math.ceil(input.message.length / 160) || 1;

  return {
    sid,
    status: "queued",
    to: input.to,
    from: input.from,
    segments,
    timestamp: new Date().toISOString(),
  };
}

