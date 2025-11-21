/**
 * Hotkeys Hook
 * Keyboard shortcuts for DXF healing editor
 */

import { useEffect } from 'react';
import { useDxfHealingStore } from '../../stores/dxfHealingStore';

export function useHotkeys() {
  const activeTool = useDxfHealingStore(state => state.activeTool);
  const setActiveTool = useDxfHealingStore(state => state.setActiveTool);
  const deleteSelected = useDxfHealingStore(state => state.deleteSelected);
  const undo = useDxfHealingStore(state => state.undo);
  const redo = useDxfHealingStore(state => state.redo);
  const selectedEntityIds = useDxfHealingStore(state => state.selectedEntityIds);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Tool selection
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setActiveTool('SELECT');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setActiveTool('DELETE');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setActiveTool('MERGE');
      }

      // Delete action
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEntityIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      }

      // Undo/Redo
      else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Pan mode (Space key)
      else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        setActiveTool('PAN');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Return to SELECT mode when Space is released
      if (e.key === ' ') {
        e.preventDefault();
        if (activeTool === 'PAN') {
          setActiveTool('SELECT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, selectedEntityIds, setActiveTool, deleteSelected, undo, redo]);
}
