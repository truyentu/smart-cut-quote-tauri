/**
 * DXF Healing State Management
 * Zustand store for DXF editor state, selection, undo/redo
 */

import { create } from 'zustand';
import type {
  DxfEntity,
  DxfTool,
  ValidationIssue,
  DxfHealingSettings,
} from '../types/dxfHealing';

interface DxfHealingState {
  // File data
  filePath: string | null;
  fileName: string | null;
  originalDxfContent: string | null;

  // Entities
  entities: DxfEntity[];
  selectedEntityIds: string[];

  // Validation
  validationIssues: ValidationIssue[];

  // View state
  visibleLayers: Set<string>;

  // Settings
  settings: DxfHealingSettings;

  // Tool state
  activeTool: DxfTool;

  // Undo/Redo
  history: DxfEntity[][];
  historyIndex: number;

  // Actions
  setFilePath: (path: string, name: string) => void;
  setOriginalContent: (content: string) => void;
  setEntities: (entities: DxfEntity[]) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;

  selectEntity: (id: string, multiSelect?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;

  deleteSelected: () => void;
  mergeEndpoints: (
    id1: string,
    vertexIndex1: number,
    id2: string,
    vertexIndex2: number
  ) => boolean;
  changeLayer: (entityIds: string[], layer: string) => void;

  // Auto-fix actions
  autoFixDuplicates: () => number;
  autoFixZeroLength: () => number;

  toggleLayerVisibility: (layer: string) => void;
  setActiveTool: (tool: DxfTool) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  reset: () => void;
}

const DEFAULT_SETTINGS: DxfHealingSettings = {
  snapTolerance: 0.1,      // 0.1mm
  maxHistorySize: 10,      // 10 undo levels
  autoSaveOnExit: true,
};

export const useDxfHealingStore = create<DxfHealingState>((set, get) => ({
  // Initial state
  filePath: null,
  fileName: null,
  originalDxfContent: null,
  entities: [],
  selectedEntityIds: [],
  validationIssues: [],
  visibleLayers: new Set(['CUTTING', 'BEND', 'IGNORE']),
  settings: DEFAULT_SETTINGS,
  activeTool: 'SELECT',
  history: [],
  historyIndex: -1,

  // File actions
  setFilePath: (path, name) => set({ filePath: path, fileName: name }),

  setOriginalContent: (content) => set({ originalDxfContent: content }),

  setEntities: (entities) => {
    const currentState = get();

    // Extract unique layers from entities
    const layers = new Set(entities.map(e => e.layer));

    // Only update visibleLayers if entities changed (not just re-render)
    const shouldUpdateLayers = currentState.entities.length === 0 ||
      JSON.stringify([...layers].sort()) !== JSON.stringify([...currentState.visibleLayers].sort());

    if (shouldUpdateLayers) {
      set({
        entities,
        visibleLayers: layers,
      });
    } else {
      set({ entities });
    }
  },

  setValidationIssues: (issues) => set({ validationIssues: issues }),

  // Selection actions
  selectEntity: (id, multiSelect = false) => {
    const { selectedEntityIds } = get();

    if (multiSelect) {
      const isSelected = selectedEntityIds.includes(id);
      const newSelection = isSelected
        ? selectedEntityIds.filter(eid => eid !== id)
        : [...selectedEntityIds, id];

      set({ selectedEntityIds: newSelection });
    } else {
      set({ selectedEntityIds: [id] });
    }

    // Update entity selected state
    set(state => ({
      entities: state.entities.map(e => ({
        ...e,
        selected: state.selectedEntityIds.includes(e.id),
      })),
    }));
  },

  selectMultiple: (ids) => {
    set({ selectedEntityIds: ids });
    set(state => ({
      entities: state.entities.map(e => ({
        ...e,
        selected: ids.includes(e.id),
      })),
    }));
  },

  clearSelection: () => {
    set({ selectedEntityIds: [] });
    set(state => ({
      entities: state.entities.map(e => ({ ...e, selected: false })),
    }));
  },

  // Edit actions
  deleteSelected: () => {
    const { entities, selectedEntityIds, pushHistory } = get();

    if (selectedEntityIds.length === 0) return;

    pushHistory(); // Save current state

    const filtered = entities.filter(e => !selectedEntityIds.includes(e.id));
    set({ entities: filtered, selectedEntityIds: [] });
  },

  mergeEndpoints: (
    id1: string,
    vertexIndex1: number,
    id2: string,
    vertexIndex2: number
  ) => {
    const { entities, pushHistory, settings, setValidationIssues } = get();

    const entity1 = entities.find(e => e.id === id1);
    const entity2 = entities.find(e => e.id === id2);

    if (!entity1 || !entity2) return false;

    // Don't allow merging same entity to itself
    if (id1 === id2) return false;

    // Get the vertices at specified indices
    const v1 = entity1.vertices[vertexIndex1];
    const v2 = entity2.vertices[vertexIndex2];

    if (!v1 || !v2) return false;

    // Check distance
    const distance = Math.sqrt(
      Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
    );

    if (distance > settings.snapTolerance) {
      return false; // Too far apart
    }

    pushHistory(); // Save current state

    // Calculate midpoint for snap position
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;

    // Update both vertices to midpoint
    entity1.vertices[vertexIndex1] = { x: midX, y: midY };
    entity2.vertices[vertexIndex2] = { x: midX, y: midY };

    // Recalculate metadata for both entities
    entity1.metadata = {
      ...entity1.metadata,
      closed: isClosedContour(entity1.vertices),
      length: calculatePolylineLength(entity1.vertices),
    };

    entity2.metadata = {
      ...entity2.metadata,
      closed: isClosedContour(entity2.vertices),
      length: calculatePolylineLength(entity2.vertices),
    };

    const updatedEntities = [...entities];
    set({ entities: updatedEntities });

    // Re-run validation after merge (import synchronously to avoid async)
    import('../services/dxfValidationService').then(({ validateEntities }) => {
      const issues = validateEntities(updatedEntities);
      setValidationIssues(issues);
    });

    return true;
  },

  changeLayer: (entityIds, layer) => {
    const { entities, pushHistory } = get();

    if (entityIds.length === 0) return;

    pushHistory(); // Save current state

    const updated = entities.map(e =>
      entityIds.includes(e.id) ? { ...e, layer } : e
    );

    set({ entities: updated });
  },

  // Auto-fix actions
  autoFixDuplicates: () => {
    const { entities, pushHistory, setValidationIssues } = get();

    pushHistory(); // Save current state

    // Find duplicates (entities with same vertices within 1 micron tolerance)
    const duplicateIds = new Set<string>();
    const TOLERANCE = 0.001; // 1 micron

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        // Skip if different number of vertices
        if (e1.vertices.length !== e2.vertices.length) continue;

        // Check if all vertices match
        const isDuplicate = e1.vertices.every((v1, idx) => {
          const v2 = e2.vertices[idx];
          const dx = Math.abs(v1.x - v2.x);
          const dy = Math.abs(v1.y - v2.y);
          return dx < TOLERANCE && dy < TOLERANCE;
        });

        if (isDuplicate) {
          duplicateIds.add(e2.id); // Mark second one for removal
        }
      }
    }

    // Remove duplicates
    const filtered = entities.filter(e => !duplicateIds.has(e.id));
    set({ entities: filtered });

    // Re-run validation
    import('../services/dxfValidationService').then(({ validateEntities }) => {
      const issues = validateEntities(filtered);
      setValidationIssues(issues);
    });

    return duplicateIds.size;
  },

  autoFixZeroLength: () => {
    const { entities, pushHistory, setValidationIssues } = get();

    pushHistory(); // Save current state

    // Find zero-length entities (< 0.001mm)
    const MIN_LENGTH = 0.001;
    const zeroLengthIds = entities
      .filter(e => e.metadata.length < MIN_LENGTH)
      .map(e => e.id);

    // Remove zero-length entities
    const filtered = entities.filter(e => !zeroLengthIds.includes(e.id));
    set({ entities: filtered });

    // Re-run validation
    import('../services/dxfValidationService').then(({ validateEntities }) => {
      const issues = validateEntities(filtered);
      setValidationIssues(issues);
    });

    return zeroLengthIds.length;
  },

  // View actions
  toggleLayerVisibility: (layer) => {
    set(state => {
      const newVisibleLayers = new Set(state.visibleLayers);
      if (newVisibleLayers.has(layer)) {
        newVisibleLayers.delete(layer);
      } else {
        newVisibleLayers.add(layer);
      }
      return { visibleLayers: newVisibleLayers };
    });
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  // Undo/Redo actions
  pushHistory: () => {
    const { entities, history, historyIndex, settings } = get();

    // Deep clone entities
    const snapshot = JSON.parse(JSON.stringify(entities));

    // Remove any history after current index (for redo invalidation)
    const newHistory = history.slice(0, historyIndex + 1);

    // Add new snapshot
    newHistory.push(snapshot);

    // Limit history size
    if (newHistory.length > settings.maxHistorySize) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();

    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      set({
        entities: JSON.parse(JSON.stringify(previousState)),
        historyIndex: historyIndex - 1,
        selectedEntityIds: [], // Clear selection on undo
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        entities: JSON.parse(JSON.stringify(nextState)),
        historyIndex: historyIndex + 1,
        selectedEntityIds: [], // Clear selection on redo
      });
    }
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // Reset
  reset: () => set({
    filePath: null,
    fileName: null,
    originalDxfContent: null,
    entities: [],
    selectedEntityIds: [],
    validationIssues: [],
    visibleLayers: new Set(['CUTTING', 'BEND', 'IGNORE']),
    activeTool: 'SELECT',
    history: [],
    historyIndex: -1,
  }),
}));

// Helper functions
function isClosedContour(vertices: { x: number; y: number }[]): boolean {
  if (vertices.length < 3) return false;

  const first = vertices[0];
  const last = vertices[vertices.length - 1];

  const distance = Math.sqrt(
    Math.pow(last.x - first.x, 2) +
    Math.pow(last.y - first.y, 2)
  );

  return distance < 0.001; // 1 micron tolerance
}

function calculatePolylineLength(vertices: { x: number; y: number }[]): number {
  if (vertices.length < 2) return 0;

  let length = 0;
  for (let i = 1; i < vertices.length; i++) {
    const dx = vertices[i].x - vertices[i - 1].x;
    const dy = vertices[i].y - vertices[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
}
