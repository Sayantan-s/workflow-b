import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import {
  WorkflowNodeType,
  WorkflowExecutionStatus,
  type WorkflowNodeData,
} from "@/types/workflow";
import {
  getVueFlowNodeType,
  generateNodeId,
  generateEdgeId,
} from "@/lib/nodeFactory";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/**
 * Helper function to create a node with custom data
 */
function createNode(
  type: WorkflowNodeType,
  position: { x: number; y: number },
  data: Partial<WorkflowNodeData>
): WorkflowNode {
  const id = generateNodeId();
  const baseData: WorkflowNodeData = {
    type,
    label: "",
    isValid: false,
    executionStatus: WorkflowExecutionStatus.IDLE,
    ...data,
  } as WorkflowNodeData;

  return {
    id,
    type: getVueFlowNodeType(type),
    position,
    data: baseData,
  };
}

/**
 * Helper function to create an edge
 * @param source - Source node ID
 * @param target - Target node ID
 * @param sourceHandleBaseId - Base handle ID (e.g., "true", "false", or undefined for default "source")
 */
function createEdge(
  source: string,
  target: string,
  sourceHandleBaseId?: string
): WorkflowEdge {
  // Format handle ID with prefix: "source__true", "source__false", or just "source"
  const sourceHandle = sourceHandleBaseId ? `source__${sourceHandleBaseId}` : "source";
  // Target handles are always "target" (not "target__target")
  const targetHandle = "target";
  
  return {
    id: generateEdgeId(source, target, sourceHandle),
    source,
    target,
    sourceHandle,
    targetHandle,
    animated: true,
    style: {
      stroke: sourceHandleBaseId === "true" ? "#22c55e" : sourceHandleBaseId === "false" ? "#ef4444" : "#3b82f6",
    },
    data: {
      label: sourceHandleBaseId === "true" ? "True" : sourceHandleBaseId === "false" ? "False" : undefined,
      condition: sourceHandleBaseId as "true" | "false" | undefined,
    },
  };
}

/**
 * Template 1: New Lead Welcome & Follow-up
 * Webhook trigger (new lead) → Send Email (welcome) → Delay (1 hour) → HTTP Request (add lead to CRM) → 
 * Condition (if response.status == 200) → True branch: Send SMS (success message) → 
 * False branch: Send SMS (error alert to support)
 */
function createNewLeadWorkflow(): WorkflowTemplate {
  const startX = 100;
  const startY = 300;
  const spacingX = 300;
  const spacingY = 150;

  // Webhook Trigger
  const webhookNode = createNode(
    WorkflowNodeType.TRIGGER_WEBHOOK,
    { x: startX, y: startY },
    {
      label: "New Lead Webhook",
      webhookUrl: "https://api.example.com/webhooks/new-lead",
      method: "POST",
      auth: { type: "none" },
      isValid: true,
    }
  );

  // Send Email (Welcome)
  const emailWelcomeNode = createNode(
    WorkflowNodeType.ACTION_EMAIL,
    { x: startX + spacingX, y: startY },
    {
      label: "Send Welcome Email",
      recipients: { to: ["{{lead.email}}"], cc: [], bcc: [] },
      subject: "Welcome! We're excited to have you",
      body: "Hi {{lead.name}},\n\nWelcome to our platform! We're thrilled to have you on board.",
      bodyFormat: "plaintext",
      attachments: [],
      isValid: true,
    }
  );

  // Delay (1 hour)
  const delayNode = createNode(
    WorkflowNodeType.LOGIC_DELAY,
    { x: startX + spacingX * 2, y: startY },
    {
      label: "Wait 1 Hour",
      delayUnit: "hours",
      delayValue: 1,
      isValid: true,
    }
  );

  // HTTP Request (Add to CRM)
  const httpCrmNode = createNode(
    WorkflowNodeType.ACTION_HTTP,
    { x: startX + spacingX * 3, y: startY },
    {
      label: "Add Lead to CRM",
      url: "https://api.crm.example.com/leads",
      method: "POST",
      auth: { type: "none" },
      bodyType: "json",
      body: JSON.stringify({
        name: "{{lead.name}}",
        email: "{{lead.email}}",
        source: "webhook",
      }, null, 2),
      timeout: 30,
      isValid: true,
    }
  );

  // Condition (if response.status == 200)
  const conditionNode = createNode(
    WorkflowNodeType.LOGIC_IF_ELSE,
    { x: startX + spacingX * 4, y: startY },
    {
      label: "Check CRM Response",
      conditions: [
        {
          field: "response.status",
          operator: "equals",
          valueType: "number",
          value: "200",
        },
      ],
      isValid: true,
    }
  );

  // True branch: Send SMS (success)
  const smsSuccessNode = createNode(
    WorkflowNodeType.ACTION_SMS,
    { x: startX + spacingX * 5, y: startY - spacingY },
    {
      label: "Send Success SMS",
      fromNumber: "+1234567890",
      toNumber: "{{lead.phone}}",
      message: "Your lead has been successfully added to our CRM. We'll be in touch soon!",
      isValid: true,
    }
  );

  // False branch: Send SMS (error alert)
  const smsErrorNode = createNode(
    WorkflowNodeType.ACTION_SMS,
    { x: startX + spacingX * 5, y: startY + spacingY },
    {
      label: "Alert Support (Error)",
      fromNumber: "+1234567890",
      toNumber: "+1987654321",
      message: "ALERT: Failed to add lead {{lead.email}} to CRM. Status: {{response.status}}",
      isValid: true,
    }
  );

  const nodes = [
    webhookNode,
    emailWelcomeNode,
    delayNode,
    httpCrmNode,
    conditionNode,
    smsSuccessNode,
    smsErrorNode,
  ];

  const edges = [
    createEdge(webhookNode.id, emailWelcomeNode.id),
    createEdge(emailWelcomeNode.id, delayNode.id),
    createEdge(delayNode.id, httpCrmNode.id),
    createEdge(httpCrmNode.id, conditionNode.id),
    createEdge(conditionNode.id, smsSuccessNode.id, "true"),
    createEdge(conditionNode.id, smsErrorNode.id, "false"),
  ];

  return {
    id: "new-lead-welcome",
    name: "New Lead Welcome & Follow-up",
    description: "Webhook trigger → Welcome email → Delay → Add to CRM → Conditional SMS notifications",
    nodes,
    edges,
  };
}

/**
 * Template 2: Abandoned Cart Recovery & Inventory Hold
 * Webhook trigger (cart event) → Condition (item in stock) → Email #1 (reminder) → Delay (2h) → 
 * Condition (still not purchased) → SMS nudge → HTTP create temp discount & hold inventory → 
 * Email #2 with code → Delay (24h) → Condition (purchased?) → 
 * True: HTTP release hold → Email "Thanks for your order" → Log analytics; 
 * False: HTTP cancel hold → Email "Last-chance offer" → Log analytics
 */
function createAbandonedCartWorkflow(): WorkflowTemplate {
  const startX = 100;
  const startY = 200;
  const spacingX = 280;
  const spacingY = 120;

  // Webhook Trigger (cart event)
  const webhookNode = createNode(
    WorkflowNodeType.TRIGGER_WEBHOOK,
    { x: startX, y: startY },
    {
      label: "Cart Event Webhook",
      webhookUrl: "https://api.example.com/webhooks/cart-event",
      method: "POST",
      auth: { type: "none" },
      isValid: true,
    }
  );

  // Condition (item in stock)
  const stockConditionNode = createNode(
    WorkflowNodeType.LOGIC_IF_ELSE,
    { x: startX + spacingX, y: startY },
    {
      label: "Check Item in Stock",
      conditions: [
        {
          field: "cart.item.stock",
          operator: "gt",
          valueType: "number",
          value: "0",
        },
      ],
      isValid: true,
    }
  );

  // Email #1 (reminder)
  const emailReminderNode = createNode(
    WorkflowNodeType.ACTION_EMAIL,
    { x: startX + spacingX * 2, y: startY - spacingY },
    {
      label: "Cart Reminder Email",
      recipients: { to: ["{{cart.customer.email}}"], cc: [], bcc: [] },
      subject: "Don't forget your items!",
      body: "Hi {{cart.customer.name}},\n\nYou left some items in your cart. Complete your purchase now!",
      bodyFormat: "plaintext",
      attachments: [],
      isValid: true,
    }
  );

  // Delay (2h)
  const delay2hNode = createNode(
    WorkflowNodeType.LOGIC_DELAY,
    { x: startX + spacingX * 3, y: startY - spacingY },
    {
      label: "Wait 2 Hours",
      delayUnit: "hours",
      delayValue: 2,
      isValid: true,
    }
  );

  // Condition (still not purchased)
  const purchaseConditionNode = createNode(
    WorkflowNodeType.LOGIC_IF_ELSE,
    { x: startX + spacingX * 4, y: startY - spacingY },
    {
      label: "Check if Purchased",
      conditions: [
        {
          field: "cart.status",
          operator: "equals",
          valueType: "string",
          value: "purchased",
        },
      ],
      isValid: true,
    }
  );

  // SMS nudge
  const smsNudgeNode = createNode(
    WorkflowNodeType.ACTION_SMS,
    { x: startX + spacingX * 5, y: startY - spacingY * 2 },
    {
      label: "SMS Nudge",
      fromNumber: "+1234567890",
      toNumber: "{{cart.customer.phone}}",
      message: "Hi! Your cart is waiting. Use code SAVE10 for 10% off!",
      isValid: true,
    }
  );

  // HTTP create temp discount & hold inventory
  const httpDiscountNode = createNode(
    WorkflowNodeType.ACTION_HTTP,
    { x: startX + spacingX * 5, y: startY - spacingY },
    {
      label: "Create Discount & Hold Inventory",
      url: "https://api.example.com/inventory/hold",
      method: "POST",
      auth: { type: "none" },
      bodyType: "json",
      body: JSON.stringify({
        cartId: "{{cart.id}}",
        discountCode: "SAVE10",
        holdDuration: 24,
      }, null, 2),
      timeout: 30,
      isValid: true,
    }
  );

  // Email #2 with code
  const emailCodeNode = createNode(
    WorkflowNodeType.ACTION_EMAIL,
    { x: startX + spacingX * 6, y: startY - spacingY },
    {
      label: "Email with Discount Code",
      recipients: { to: ["{{cart.customer.email}}"], cc: [], bcc: [] },
      subject: "Special Offer: 10% Off Your Cart!",
      body: "Hi {{cart.customer.name}},\n\nUse code SAVE10 for 10% off! This offer expires in 24 hours.",
      bodyFormat: "plaintext",
      attachments: [],
      isValid: true,
    }
  );

  // Delay (24h)
  const delay24hNode = createNode(
    WorkflowNodeType.LOGIC_DELAY,
    { x: startX + spacingX * 7, y: startY - spacingY },
    {
      label: "Wait 24 Hours",
      delayUnit: "hours",
      delayValue: 24,
      isValid: true,
    }
  );

  // Condition (purchased?)
  const finalPurchaseConditionNode = createNode(
    WorkflowNodeType.LOGIC_IF_ELSE,
    { x: startX + spacingX * 8, y: startY - spacingY },
    {
      label: "Check Final Purchase Status",
      conditions: [
        {
          field: "cart.status",
          operator: "equals",
          valueType: "string",
          value: "purchased",
        },
      ],
      isValid: true,
    }
  );

  // True: HTTP release hold → Email "Thanks for your order" → Log analytics
  const httpReleaseNode = createNode(
    WorkflowNodeType.ACTION_HTTP,
    { x: startX + spacingX * 9, y: startY - spacingY * 2 },
    {
      label: "Release Inventory Hold",
      url: "https://api.example.com/inventory/release",
      method: "POST",
      auth: { type: "none" },
      bodyType: "json",
      body: JSON.stringify({ cartId: "{{cart.id}}" }, null, 2),
      timeout: 30,
      isValid: true,
    }
  );

  const emailThanksNode = createNode(
    WorkflowNodeType.ACTION_EMAIL,
    { x: startX + spacingX * 10, y: startY - spacingY * 2 },
    {
      label: "Thanks for Your Order",
      recipients: { to: ["{{cart.customer.email}}"], cc: [], bcc: [] },
      subject: "Thank you for your order!",
      body: "Hi {{cart.customer.name}},\n\nThank you for your purchase! Your order is being processed.",
      bodyFormat: "plaintext",
      attachments: [],
      isValid: true,
    }
  );

  const httpLogAnalyticsTrueNode = createNode(
    WorkflowNodeType.ACTION_HTTP,
    { x: startX + spacingX * 11, y: startY - spacingY * 2 },
    {
      label: "Log Analytics (Purchased)",
      url: "https://api.example.com/analytics/log",
      method: "POST",
      auth: { type: "none" },
      bodyType: "json",
      body: JSON.stringify({
        event: "cart_recovery_success",
        cartId: "{{cart.id}}",
      }, null, 2),
      timeout: 30,
      isValid: true,
    }
  );

  // False: HTTP cancel hold → Email "Last-chance offer" → Log analytics
  const httpCancelHoldNode = createNode(
    WorkflowNodeType.ACTION_HTTP,
    { x: startX + spacingX * 9, y: startY },
    {
      label: "Cancel Inventory Hold",
      url: "https://api.example.com/inventory/cancel",
      method: "POST",
      auth: { type: "none" },
      bodyType: "json",
      body: JSON.stringify({ cartId: "{{cart.id}}" }, null, 2),
      timeout: 30,
      isValid: true,
    }
  );

  const emailLastChanceNode = createNode(
    WorkflowNodeType.ACTION_EMAIL,
    { x: startX + spacingX * 10, y: startY },
    {
      label: "Last-Chance Offer",
      recipients: { to: ["{{cart.customer.email}}"], cc: [], bcc: [] },
      subject: "Last chance: Your items are waiting!",
      body: "Hi {{cart.customer.name}},\n\nThis is your last chance! Complete your purchase now with code SAVE10.",
      bodyFormat: "plaintext",
      attachments: [],
      isValid: true,
    }
  );

  const httpLogAnalyticsFalseNode = createNode(
    WorkflowNodeType.ACTION_HTTP,
    { x: startX + spacingX * 11, y: startY },
    {
      label: "Log Analytics (Abandoned)",
      url: "https://api.example.com/analytics/log",
      method: "POST",
      auth: { type: "none" },
      bodyType: "json",
      body: JSON.stringify({
        event: "cart_recovery_failed",
        cartId: "{{cart.id}}",
      }, null, 2),
      timeout: 30,
      isValid: true,
    }
  );

  const nodes = [
    webhookNode,
    stockConditionNode,
    emailReminderNode,
    delay2hNode,
    purchaseConditionNode,
    smsNudgeNode,
    httpDiscountNode,
    emailCodeNode,
    delay24hNode,
    finalPurchaseConditionNode,
    httpReleaseNode,
    emailThanksNode,
    httpLogAnalyticsTrueNode,
    httpCancelHoldNode,
    emailLastChanceNode,
    httpLogAnalyticsFalseNode,
  ];

  const edges = [
    createEdge(webhookNode.id, stockConditionNode.id),
    createEdge(stockConditionNode.id, emailReminderNode.id, "true"),
    createEdge(emailReminderNode.id, delay2hNode.id),
    createEdge(delay2hNode.id, purchaseConditionNode.id),
    createEdge(purchaseConditionNode.id, smsNudgeNode.id, "false"),
    createEdge(purchaseConditionNode.id, httpDiscountNode.id, "false"),
    createEdge(smsNudgeNode.id, httpDiscountNode.id),
    createEdge(httpDiscountNode.id, emailCodeNode.id),
    createEdge(emailCodeNode.id, delay24hNode.id),
    createEdge(delay24hNode.id, finalPurchaseConditionNode.id),
    createEdge(finalPurchaseConditionNode.id, httpReleaseNode.id, "true"),
    createEdge(httpReleaseNode.id, emailThanksNode.id),
    createEdge(emailThanksNode.id, httpLogAnalyticsTrueNode.id),
    createEdge(finalPurchaseConditionNode.id, httpCancelHoldNode.id, "false"),
    createEdge(httpCancelHoldNode.id, emailLastChanceNode.id),
    createEdge(emailLastChanceNode.id, httpLogAnalyticsFalseNode.id),
  ];

  return {
    id: "abandoned-cart-recovery",
    name: "Abandoned Cart Recovery & Inventory Hold",
    description: "Cart event → Stock check → Reminder → Delay → Purchase check → Discount & hold → Final check → Recovery or cleanup",
    nodes,
    edges,
  };
}

/**
 * Get all available workflow templates
 */
export function getWorkflowTemplates(): WorkflowTemplate[] {
  return [createNewLeadWorkflow(), createAbandonedCartWorkflow()];
}

/**
 * Get a workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | null {
  const templates = getWorkflowTemplates();
  return templates.find((t) => t.id === id) || null;
}

