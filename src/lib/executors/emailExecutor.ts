import type { EmailExecutorInput } from "@/types/execution";

export interface EmailExecutorOutput {
  messageId: string;
  accepted: string[];
  rejected: string[];
  timestamp: string;
}

/**
 * Simulate email sending with random success/error
 * This is a dummy async function for preview purposes
 */
export async function executeEmail(
  input: EmailExecutorInput
): Promise<EmailExecutorOutput> {
  // Simulate network delay (500ms - 2000ms)
  const delay = 500 + Math.random() * 1500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Random success rate (80% success, 20% error)
  const isSuccess = Math.random() > 0.2;

  if (!isSuccess) {
    // Random error scenarios
    const errors = [
      "SMTP connection timeout",
      "Invalid recipient address",
      "Email server rejected message",
      "Rate limit exceeded",
      "Authentication failed with email provider",
    ];
    const errorMessage = errors[Math.floor(Math.random() * errors.length)];
    throw new Error(`Email sending failed: ${errorMessage}`);
  }

  // Generate fake message ID
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    messageId,
    accepted: input.to,
    rejected: [],
    timestamp: new Date().toISOString(),
  };
}

