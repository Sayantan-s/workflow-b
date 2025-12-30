import { ref, watch } from "vue";
import type { NodeType } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * Global drag and drop state
 * Shared across all components using this composable
 */
const state = {
  /**
   * The type of the node being dragged
   */
  draggedType: ref<NodeType | null>(null),
  /**
   * Whether the drag is currently over the dropzone
   */
  isDragOver: ref(false),
  /**
   * Whether a drag operation is in progress
   */
  isDragging: ref(false),
};

// Track if we've set up the dragging watcher
let watcherSetup = false;

// Debounce timer for dragleave (to prevent flickering)
let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Composable for handling drag and drop state management
 * This composable manages drag state and can be used outside VueFlow context
 *
 * For drop handling with VueFlow APIs, use the separate hook in Canvas.vue
 */
export function useDragAndDrop() {
  const { draggedType, isDragOver, isDragging } = state;

  const workflowStore = useWorkflowStore();

  // Set up the dragging watcher only once globally
  if (!watcherSetup) {
    watcherSetup = true;
    // Disable text selection while dragging for better UX
    watch(isDragging, (dragging) => {
      document.body.style.userSelect = dragging ? "none" : "";
    });
  }

  /**
   * Handles the drag start event from palette items
   * Can be called from anywhere (inside or outside VueFlow)
   * @param event - The drag event
   * @param type - The node type being dragged
   */
  function onDragStart(event: DragEvent, type: NodeType) {
    console.log("[DragAndDrop] onDragStart called with type:", type);

    // Prevent dragging disabled nodes
    const validation = workflowStore.canAddNode(type);
    if (!validation.allowed) {
      console.warn("[DragAndDrop] Node type not allowed:", validation.reason);
      event.preventDefault();
      return;
    }

    if (event.dataTransfer) {
      event.dataTransfer.setData("application/vueflow", type);
      event.dataTransfer.effectAllowed = "move";
    }

    draggedType.value = type;
    isDragging.value = true;

    console.log("[DragAndDrop] draggedType set to:", draggedType.value);

    // Also sync with workflow store for compatibility
    workflowStore.startDrag(type);

    // Only use dragend for cleanup (fires AFTER drop completes)
    // Don't use document drop listener as it interferes with Canvas's onDrop
    document.addEventListener("dragend", onDragEnd);
  }

  /**
   * Handles the drag over event on the dropzone
   * @param event - The drag event
   */
  function onDragOver(event: DragEvent) {
    event.preventDefault();

    // Cancel any pending dragleave (prevents flickering)
    if (dragLeaveTimer) {
      clearTimeout(dragLeaveTimer);
      dragLeaveTimer = null;
    }

    // Log only once when entering
    if (draggedType.value && !isDragOver.value) {
      console.log("[DragAndDrop] onDragOver - entering dropzone");
    }

    if (draggedType.value) {
      isDragOver.value = true;

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    }
  }

  /**
   * Handles when the drag leaves the dropzone
   * Uses debouncing to prevent flickering when hovering over child elements
   */
  function onDragLeave(_event: DragEvent) {
    // Use a small delay to prevent flickering when moving over child elements
    // The dragover event will cancel this if we're still in the dropzone
    if (dragLeaveTimer) {
      clearTimeout(dragLeaveTimer);
    }

    dragLeaveTimer = setTimeout(() => {
      isDragOver.value = false;
      dragLeaveTimer = null;
    }, 50);
  }

  /**
   * Cleanup function called when drag ends
   */
  function onDragEnd() {
    console.log("[DragAndDrop] onDragEnd called, clearing state");

    // Clear any pending dragleave timer
    if (dragLeaveTimer) {
      clearTimeout(dragLeaveTimer);
      dragLeaveTimer = null;
    }

    isDragging.value = false;
    isDragOver.value = false;
    draggedType.value = null;

    // Sync with workflow store
    workflowStore.endDrag();

    // Remove event listener
    document.removeEventListener("dragend", onDragEnd);
  }

  return {
    // State (reactive)
    draggedType,
    isDragOver,
    isDragging,
    // Methods
    onDragStart,
    onDragOver,
    onDragLeave,
    onDragEnd,
  };
}

export default useDragAndDrop;
