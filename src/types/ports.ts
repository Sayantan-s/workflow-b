// ============ PORT DATA TYPES ============
// These define the data contracts between nodes

export const PortDataType = {
  // Primitives
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  
  // Complex types
  JSON: "json",
  ARRAY: "array",
  BINARY: "binary",
  
  // Domain-specific
  EMAIL_ADDRESS: "email_address",
  PHONE_NUMBER: "phone_number",
  URL: "url",
  HTTP_RESPONSE: "http_response",
  
  // Generic/Any (accepts any type)
  ANY: "any",
  
  // Trigger payload
  TRIGGER_PAYLOAD: "trigger_payload",
} as const;

export type PortDataType = (typeof PortDataType)[keyof typeof PortDataType];

// ============ PORT DEFINITIONS ============

export interface PortDefinition {
  id: string;
  label: string;
  dataType: PortDataType;
  description?: string;
  required?: boolean;
}

export interface InputPort extends PortDefinition {
  acceptsTypes: PortDataType[]; // Types this input can accept (for flexibility)
}

export interface OutputPort extends PortDefinition {
  // Output ports emit a specific type
}

// ============ CONDITIONAL PORT LABELS ============
// Required labels for conditional branches

export const ConditionalLabel = {
  // Binary conditions
  TRUE: "true",
  FALSE: "false",
  
  // API/HTTP outcomes
  SUCCESS: "success",
  ERROR: "error",
  
  // Filter outcomes
  MATCH: "match",
  NO_MATCH: "no_match",
  
  // Loop controls
  CONTINUE: "continue",
  BREAK: "break",
  COMPLETE: "complete",
} as const;

export type ConditionalLabel = (typeof ConditionalLabel)[keyof typeof ConditionalLabel];

// ============ NODE PORT SCHEMAS ============
// Defines input/output ports for each node type

export interface NodePortSchema {
  inputs: InputPort[];
  outputs: OutputPort[];
  isConditional: boolean; // If true, outputs must have labels
}

// ============ TYPE COMPATIBILITY ============
// Rules for which types can connect to which

export const TYPE_COMPATIBILITY: Record<PortDataType, PortDataType[]> = {
  [PortDataType.STRING]: [PortDataType.STRING, PortDataType.ANY],
  [PortDataType.NUMBER]: [PortDataType.NUMBER, PortDataType.STRING, PortDataType.ANY],
  [PortDataType.BOOLEAN]: [PortDataType.BOOLEAN, PortDataType.STRING, PortDataType.ANY],
  [PortDataType.JSON]: [PortDataType.JSON, PortDataType.STRING, PortDataType.ANY],
  [PortDataType.ARRAY]: [PortDataType.ARRAY, PortDataType.JSON, PortDataType.ANY],
  [PortDataType.BINARY]: [PortDataType.BINARY, PortDataType.ANY],
  [PortDataType.EMAIL_ADDRESS]: [PortDataType.EMAIL_ADDRESS, PortDataType.STRING, PortDataType.ANY],
  [PortDataType.PHONE_NUMBER]: [PortDataType.PHONE_NUMBER, PortDataType.STRING, PortDataType.ANY],
  [PortDataType.URL]: [PortDataType.URL, PortDataType.STRING, PortDataType.ANY],
  [PortDataType.HTTP_RESPONSE]: [PortDataType.HTTP_RESPONSE, PortDataType.JSON, PortDataType.ANY],
  [PortDataType.ANY]: Object.values(PortDataType),
  [PortDataType.TRIGGER_PAYLOAD]: [PortDataType.TRIGGER_PAYLOAD, PortDataType.JSON, PortDataType.ANY],
};

/**
 * Check if an output type can connect to an input type
 */
export function isTypeCompatible(
  outputType: PortDataType,
  inputType: PortDataType
): boolean {
  // ANY accepts everything
  if (inputType === PortDataType.ANY) return true;
  
  // Check compatibility list
  const compatibleWith = TYPE_COMPATIBILITY[outputType];
  return compatibleWith?.includes(inputType) ?? false;
}

