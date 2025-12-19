import { z } from "zod";
import { WorkflowNodeType, WorkflowExecutionStatus } from "@/types/workflow";

// ============ BASE SCHEMAS ============

export const executionStatusSchema = z.enum([
  WorkflowExecutionStatus.IDLE,
  WorkflowExecutionStatus.RUNNING,
  WorkflowExecutionStatus.SUCCESS,
  WorkflowExecutionStatus.ERROR,
]);

export const baseNodeDataSchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  isValid: z.boolean(),
  executionStatus: executionStatusSchema.optional(),
  lastExecutedAt: z.string().optional(),
});

// ============ AUTH SCHEMAS ============

export const authNoneSchema = z.object({
  type: z.literal("none"),
});

export const authBasicSchema = z.object({
  type: z.literal("basic"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const authApiKeySchema = z.object({
  type: z.literal("api-key"),
  key: z.string().min(1, "API key name is required"),
  value: z.string().min(1, "API key value is required"),
  location: z.enum(["header", "query"]),
});

export const authSettingsSchema = z.discriminatedUnion("type", [
  authNoneSchema,
  authBasicSchema,
  authApiKeySchema,
]);

// ============ HTTP METHOD SCHEMA ============

export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

// ============ TRIGGER NODE SCHEMAS ============

export const manualTriggerDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.TRIGGER_MANUAL),
});

export const webhookTriggerDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.TRIGGER_WEBHOOK),
  webhookUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  method: httpMethodSchema,
  auth: authSettingsSchema,
});

// ============ ACTION NODE SCHEMAS ============

export const httpActionDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.ACTION_HTTP),
  url: z.string().url("Must be a valid URL").or(z.literal("")),
  method: httpMethodSchema,
  auth: authSettingsSchema,
  bodyType: z.enum(["json", "raw"]),
  body: z.string().optional(),
  timeout: z.number().min(1).max(300),
});

export const emailActionDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.ACTION_EMAIL),
  recipients: z.object({
    to: z.array(z.string().email("Invalid email address")),
    cc: z.array(z.string().email("Invalid email address")),
    bcc: z.array(z.string().email("Invalid email address")),
  }),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  bodyFormat: z.enum(["richtext", "markdown", "plaintext"]),
  attachments: z.array(z.string()),
});

export const smsActionDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.ACTION_SMS),
  toNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().min(1, "Message is required").max(160, "SMS message too long"),
});

// ============ LOGIC NODE SCHEMAS ============

export const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum(["equals", "notEquals", "contains", "gt", "lt", "isEmpty"]),
  value: z.string(),
  logicalOp: z.enum(["AND", "OR"]).optional(),
});

export const ifElseLogicDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.LOGIC_IF_ELSE),
  conditions: z.array(conditionSchema).min(1, "At least one condition is required"),
});

export const delayLogicDataSchema = baseNodeDataSchema.extend({
  type: z.literal(WorkflowNodeType.LOGIC_DELAY),
  delayType: z.enum(["hours", "days"]),
  delayValue: z.number().min(1).max(365),
});

// ============ UNION SCHEMA ============

export const workflowNodeDataSchema = z.discriminatedUnion("type", [
  manualTriggerDataSchema,
  webhookTriggerDataSchema,
  httpActionDataSchema,
  emailActionDataSchema,
  smsActionDataSchema,
  ifElseLogicDataSchema,
  delayLogicDataSchema,
]);

// ============ VALIDATION HELPERS ============

/**
 * Validate node data and return typed result
 */
export function validateNodeData(data: unknown) {
  return workflowNodeDataSchema.safeParse(data);
}

/**
 * Get validation schema for a specific node type
 */
export function getNodeSchema(nodeType: WorkflowNodeType) {
  const schemas: Record<WorkflowNodeType, z.ZodType> = {
    [WorkflowNodeType.TRIGGER_MANUAL]: manualTriggerDataSchema,
    [WorkflowNodeType.TRIGGER_WEBHOOK]: webhookTriggerDataSchema,
    [WorkflowNodeType.ACTION_HTTP]: httpActionDataSchema,
    [WorkflowNodeType.ACTION_EMAIL]: emailActionDataSchema,
    [WorkflowNodeType.ACTION_SMS]: smsActionDataSchema,
    [WorkflowNodeType.LOGIC_IF_ELSE]: ifElseLogicDataSchema,
    [WorkflowNodeType.LOGIC_DELAY]: delayLogicDataSchema,
  };
  return schemas[nodeType];
}

// ============ TYPE EXPORTS ============

export type ManualTriggerDataInput = z.input<typeof manualTriggerDataSchema>;
export type WebhookTriggerDataInput = z.input<typeof webhookTriggerDataSchema>;
export type HttpActionDataInput = z.input<typeof httpActionDataSchema>;
export type EmailActionDataInput = z.input<typeof emailActionDataSchema>;
export type SmsActionDataInput = z.input<typeof smsActionDataSchema>;
export type IfElseLogicDataInput = z.input<typeof ifElseLogicDataSchema>;
export type DelayLogicDataInput = z.input<typeof delayLogicDataSchema>;
export type WorkflowNodeDataInput = z.input<typeof workflowNodeDataSchema>;

