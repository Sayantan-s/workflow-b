import { ref, computed, onMounted, onUnmounted } from "vue";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { cloneDeep as deepClone } from "es-toolkit";

// ============ TYPES ============

export interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  timestamp: number;
}

// ============ HISTORY STORE ============

// Singleton state - shared across all uses
const pastStack = ref<WorkflowSnapshot[]>([]);
const futureStack = ref<WorkflowSnapshot[]>([]);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isUndoRedoInProgress = false;

const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 300;

/**
 * Deep clone that handles Vue reactive proxies
 */

/**
 * Composable for workflow history management (Undo/Redo)
 */
export function useWorkflowHistory() {
  // ============ COMPUTED ============

  const canUndo = computed(() => pastStack.value.length > 0);
  const canRedo = computed(() => futureStack.value.length > 0);
  const historyLength = computed(() => pastStack.value.length);
  const futureLength = computed(() => futureStack.value.length);

  // ============ HELPERS ============

  function trimPastStack() {
    while (pastStack.value.length > MAX_HISTORY_SIZE) {
      pastStack.value.shift();
    }
  }

  // ============ ACTIONS ============

  /**
   * Take an immediate snapshot of the current state
   */
  function takeSnapshot(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    if (isUndoRedoInProgress) return;

    try {
      const snapshot: WorkflowSnapshot = {
        nodes: deepClone(nodes),
        edges: deepClone(edges),
        timestamp: Date.now(),
      };

      pastStack.value = [...pastStack.value, snapshot];
      trimPastStack();

      // Clear future stack when new action is performed
      futureStack.value = [];
    } catch (e) {
      console.error("Failed to take snapshot:", e);
    }
  }

  /**
   * Debounced snapshot for drag operations
   */
  function takeSnapshotDebounced(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    if (isUndoRedoInProgress) return;

    // Only take snapshot on first call in debounce period
    if (!debounceTimer) {
      takeSnapshot(nodes, edges);
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  /**
   * Flush any pending debounced snapshot
   */
  function flushDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  /**
   * Undo - returns the previous state
   */
  function undo(
    currentNodes: WorkflowNode[],
    currentEdges: WorkflowEdge[]
  ): WorkflowSnapshot | null {
    if (pastStack.value.length === 0) return null;

    isUndoRedoInProgress = true;

    try {
      // Save current state to future stack
      const currentSnapshot: WorkflowSnapshot = {
        nodes: deepClone(currentNodes),
        edges: deepClone(currentEdges),
        timestamp: Date.now(),
      };
      futureStack.value = [...futureStack.value, currentSnapshot];

      // Pop from past stack
      const newPast = [...pastStack.value];
      const previousSnapshot = newPast.pop()!;
      pastStack.value = newPast;

      return previousSnapshot;
    } finally {
      isUndoRedoInProgress = false;
    }
  }

  /**
   * Redo - returns the next state
   */
  function redo(
    currentNodes: WorkflowNode[],
    currentEdges: WorkflowEdge[]
  ): WorkflowSnapshot | null {
    if (futureStack.value.length === 0) return null;

    isUndoRedoInProgress = true;

    try {
      // Save current state to past stack
      const currentSnapshot: WorkflowSnapshot = {
        nodes: deepClone(currentNodes),
        edges: deepClone(currentEdges),
        timestamp: Date.now(),
      };
      pastStack.value = [...pastStack.value, currentSnapshot];
      trimPastStack();

      // Pop from future stack
      const newFuture = [...futureStack.value];
      const nextSnapshot = newFuture.pop()!;
      futureStack.value = newFuture;

      return nextSnapshot;
    } finally {
      isUndoRedoInProgress = false;
    }
  }

  /**
   * Clear all history
   */
  function clearHistory() {
    pastStack.value = [];
    futureStack.value = [];
    flushDebounce();
  }

  return {
    // State
    canUndo,
    canRedo,
    historyLength,
    futureLength,

    // Actions
    takeSnapshot,
    takeSnapshotDebounced,
    flushDebounce,
    undo,
    redo,
    clearHistory,
  };
}

// ============ KEYBOARD SHORTCUTS ============

export interface KeyboardOptions {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Composable for keyboard shortcuts
 */
export function useHistoryKeyboard(options: KeyboardOptions) {
  function handleKeyDown(e: KeyboardEvent) {
    // Check if we're in an input field
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    // Undo: Cmd/Ctrl + Z
    if (e.key === "z" && !e.shiftKey) {
      if (options.canUndo()) {
        e.preventDefault();
        e.stopPropagation();
        options.onUndo();
      }
      return;
    }

    // Redo: Cmd/Ctrl + Shift + Z OR Cmd/Ctrl + Y
    if ((e.key === "z" && e.shiftKey) || e.key === "y") {
      if (options.canRedo()) {
        e.preventDefault();
        e.stopPropagation();
        options.onRedo();
      }
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });
}
