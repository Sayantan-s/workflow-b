import type { Component } from "vue";
import {
  Play,
  Webhook,
  Globe,
  Mail,
  MessageSquare,
  GitBranch,
  Clock,
  Shuffle,
  CircleDashed,
  SquareDashed,
  Code,
  Wrench,
} from "lucide-vue-next";
import {
  WorkflowNodeType,
  type WorkflowNodeType as NodeType,
  type WorkflowNodeCategory as NodeCategory,
  WorkflowNodeCategory,
} from "@/types/workflow";

/**
 * Central mapping of node types to their Lucide icon components
 * Use this across the project whenever you need to get an icon for a node type
 */
export const NODE_ICON_MAP: Record<NodeType, Component> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: Play,
  [WorkflowNodeType.TRIGGER_WEBHOOK]: Webhook,
  [WorkflowNodeType.ACTION_HTTP]: Globe,
  [WorkflowNodeType.ACTION_EMAIL]: Mail,
  [WorkflowNodeType.ACTION_SMS]: MessageSquare,
  [WorkflowNodeType.LOGIC_IF_ELSE]: GitBranch,
  [WorkflowNodeType.LOGIC_DELAY]: Clock,
  [WorkflowNodeType.LOGIC_TRANSFORM]: Shuffle,
};

const CATEGORY_ICON_MAP: Record<NodeCategory, Component> = {
  [WorkflowNodeCategory.TRIGGER]: CircleDashed,
  [WorkflowNodeCategory.ACTION]: Wrench,
  [WorkflowNodeCategory.LOGIC]: Code,
};

/**
 * Node color configuration (hex colors)
 */
export const NODE_COLOR_MAP: Record<NodeType, string> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: "#22c55e",
  [WorkflowNodeType.TRIGGER_WEBHOOK]: "#22c55e",
  [WorkflowNodeType.ACTION_HTTP]: "#3b82f6",
  [WorkflowNodeType.ACTION_EMAIL]: "#3b82f6",
  [WorkflowNodeType.ACTION_SMS]: "#3b82f6",
  [WorkflowNodeType.LOGIC_IF_ELSE]: "#f59e0b",
  [WorkflowNodeType.LOGIC_DELAY]: "#f59e0b",
  [WorkflowNodeType.LOGIC_TRANSFORM]: "#f59e0b",
};

/**
 * Tailwind background color classes for nodes
 */
export const NODE_BG_COLOR_MAP: Record<NodeType, string> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: "bg-green-50",
  [WorkflowNodeType.TRIGGER_WEBHOOK]: "bg-green-50",
  [WorkflowNodeType.ACTION_HTTP]: "bg-blue-50",
  [WorkflowNodeType.ACTION_EMAIL]: "bg-blue-50",
  [WorkflowNodeType.ACTION_SMS]: "bg-blue-50",
  [WorkflowNodeType.LOGIC_IF_ELSE]: "bg-amber-50",
  [WorkflowNodeType.LOGIC_DELAY]: "bg-amber-50",
  [WorkflowNodeType.LOGIC_TRANSFORM]: "bg-amber-50",
};

/**
 * Icon background colors (hex)
 */
export const NODE_ICON_BG_COLOR_MAP: Record<NodeType, string | undefined> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: "#dcfce7",
  [WorkflowNodeType.TRIGGER_WEBHOOK]: "#dcfce7",
  [WorkflowNodeType.ACTION_HTTP]: "",
  [WorkflowNodeType.ACTION_EMAIL]: undefined,
  [WorkflowNodeType.ACTION_SMS]: undefined,
  [WorkflowNodeType.LOGIC_IF_ELSE]: "#fef3c7",
  [WorkflowNodeType.LOGIC_DELAY]: "#fef3c7",
  [WorkflowNodeType.LOGIC_TRANSFORM]: "#fef3c7",
};

/**
 * Icon border colors (hex with opacity)
 */
export const NODE_ICON_BORDER_COLOR_MAP: Record<NodeType, string | undefined> =
  {
    [WorkflowNodeType.TRIGGER_MANUAL]: "#22c55e33",
    [WorkflowNodeType.TRIGGER_WEBHOOK]: "#22c55e33",
    [WorkflowNodeType.ACTION_HTTP]: "#3b82f633",
    [WorkflowNodeType.ACTION_EMAIL]: "#3b82f633",
    [WorkflowNodeType.ACTION_SMS]: "#3b82f633",
    [WorkflowNodeType.LOGIC_IF_ELSE]: "#f59e0b33",
    [WorkflowNodeType.LOGIC_DELAY]: "#f59e0b33",
    [WorkflowNodeType.LOGIC_TRANSFORM]: "#f59e0b33",
  };

/**
 * Icon text colors (hex)
 */
export const NODE_ICON_TEXT_COLOR_MAP: Record<NodeType, string | undefined> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: "#15803d",
  [WorkflowNodeType.TRIGGER_WEBHOOK]: "#15803d",
  [WorkflowNodeType.ACTION_HTTP]: "#1e40af",
  [WorkflowNodeType.ACTION_EMAIL]: "#1e40af",
  [WorkflowNodeType.ACTION_SMS]: "#1e40af",
  [WorkflowNodeType.LOGIC_IF_ELSE]: "#b45309",
  [WorkflowNodeType.LOGIC_DELAY]: "#b45309",
  [WorkflowNodeType.LOGIC_TRANSFORM]: "#b45309",
};

/**
 * Default labels for nodes
 */
export const NODE_LABEL_MAP: Record<NodeType, string> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: "Manual Trigger",
  [WorkflowNodeType.TRIGGER_WEBHOOK]: "Webhook",
  [WorkflowNodeType.ACTION_HTTP]: "HTTP Request",
  [WorkflowNodeType.ACTION_EMAIL]: "Send Email",
  [WorkflowNodeType.ACTION_SMS]: "Send SMS",
  [WorkflowNodeType.LOGIC_IF_ELSE]: "If / Else",
  [WorkflowNodeType.LOGIC_DELAY]: "Delay",
  [WorkflowNodeType.LOGIC_TRANSFORM]: "Transform",
};

/**
 * Default subtext/descriptions for nodes
 */
export const NODE_SUBTEXT_MAP: Record<NodeType, string | undefined> = {
  [WorkflowNodeType.TRIGGER_MANUAL]: "Runs workflow on button click",
  [WorkflowNodeType.TRIGGER_WEBHOOK]: "Triggers on HTTP webhook",
  [WorkflowNodeType.ACTION_HTTP]: "Make an HTTP request",
  [WorkflowNodeType.ACTION_EMAIL]: "Send an email",
  [WorkflowNodeType.ACTION_SMS]: "Send an SMS message",
  [WorkflowNodeType.LOGIC_IF_ELSE]: "Conditional branching",
  [WorkflowNodeType.LOGIC_DELAY]: "Wait before continuing",
  [WorkflowNodeType.LOGIC_TRANSFORM]: "Extract & map data",
};

/**
 * Get the icon component for a given node type
 * @param nodeType - The workflow node type
 * @returns The Lucide icon component
 */
export function getNodeIcon(nodeType: NodeType): Component {
  return NODE_ICON_MAP[nodeType];
}

/**
 * Get the color for a given node type
 * @param nodeType - The workflow node type
 * @returns The hex color string
 */

export function getNodeCategoryIcon(category: NodeCategory): Component {
  return CATEGORY_ICON_MAP[category];
}

export function getNodeColor(nodeType: NodeType): string {
  return NODE_COLOR_MAP[nodeType];
}

/**
 * Get the Tailwind background color class for a given node type
 * @param nodeType - The workflow node type
 * @returns The Tailwind class string
 */
export function getNodeBgColor(nodeType: NodeType): string {
  return NODE_BG_COLOR_MAP[nodeType];
}

/**
 * Get the icon background color for a given node type
 * @param nodeType - The workflow node type
 * @returns The hex color string or undefined
 */
export function getNodeIconBgColor(nodeType: NodeType): string | undefined {
  return NODE_ICON_BG_COLOR_MAP[nodeType];
}

/**
 * Get the icon border color for a given node type
 * @param nodeType - The workflow node type
 * @returns The hex color string or undefined
 */
export function getNodeIconBorderColor(nodeType: NodeType): string | undefined {
  return NODE_ICON_BORDER_COLOR_MAP[nodeType];
}

/**
 * Get the icon text color for a given node type
 * @param nodeType - The workflow node type
 * @returns The hex color string or undefined
 */
export function getNodeIconTextColor(nodeType: NodeType): string | undefined {
  return NODE_ICON_TEXT_COLOR_MAP[nodeType];
}

/**
 * Get the default label for a given node type
 * @param nodeType - The workflow node type
 * @returns The label string
 */
export function getNodeLabel(nodeType: NodeType): string {
  return NODE_LABEL_MAP[nodeType];
}

/**
 * Get the default subtext/description for a given node type
 * @param nodeType - The workflow node type
 * @returns The subtext string or undefined
 */
export function getNodeSubtext(nodeType: NodeType): string | undefined {
  return NODE_SUBTEXT_MAP[nodeType];
}

/**
 * Check if a node type has an icon mapping
 * @param nodeType - The workflow node type
 * @returns True if the node type has an icon mapping
 */
export function hasNodeIcon(nodeType: NodeType): boolean {
  return nodeType in NODE_ICON_MAP;
}
