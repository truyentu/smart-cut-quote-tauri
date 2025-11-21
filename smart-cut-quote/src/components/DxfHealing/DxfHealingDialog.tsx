/**
 * DXF Healing Dialog
 * Full-screen dialog for editing DXF files
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { useDxfHealingStore } from '../../stores/dxfHealingStore';
import { parseDxfFile } from '../../services/dxfParserService';
import { validateEntities, getValidationSummary } from '../../services/dxfValidationService';
import { writeDxfFile } from '../../services/dxfWriterService';
import DxfCanvas from './DxfCanvas';
import DxfToolbar from './DxfToolbar';
import DxfSidebar from './DxfSidebar';
import DxfStatusBar from './DxfStatusBar';
import { useHotkeys } from './useHotkeys';

interface DxfHealingDialogProps {
  open: boolean;
  filePath: string | null;
  onClose: () => void;
  onSave?: () => void;
}

export default function DxfHealingDialog({
  open,
  filePath,
  onClose,
  onSave,
}: DxfHealingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Store actions
  const setFilePath = useDxfHealingStore(state => state.setFilePath);
  const setEntities = useDxfHealingStore(state => state.setEntities);
  const setValidationIssues = useDxfHealingStore(state => state.setValidationIssues);
  const reset = useDxfHealingStore(state => state.reset);
  const entities = useDxfHealingStore(state => state.entities);
  const validationIssues = useDxfHealingStore(state => state.validationIssues);
  const settings = useDxfHealingStore(state => state.settings);

  // Enable keyboard shortcuts
  useHotkeys();

  // Load DXF file when dialog opens
  useEffect(() => {
    if (open && filePath) {
      loadDxfFile(filePath);
    } else if (!open) {
      // Reset store when dialog closes
      reset();
    }
  }, [open, filePath]);

  const loadDxfFile = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      // Parse DXF file
      const parsed = await parseDxfFile(path);

      // Extract filename from path
      const fileName = path.split(/[/\\]/).pop() || path;

      // Update store
      setFilePath(path, fileName);
      setEntities(parsed.entities);

      // DXF loaded successfully

      // Validate entities
      const issues = validateEntities(parsed.entities);
      setValidationIssues(issues);
    } catch (err) {
      console.error('Failed to load DXF file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load DXF file');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!filePath) return;

    setSaving(true);
    setError(null);

    try {
      // Write DXF file
      await writeDxfFile(filePath, entities);

      // Call onSave callback
      if (onSave) {
        onSave();
      }

      // Auto-close if setting is enabled
      if (settings.autoSaveOnExit) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save DXF file:', err);
      setError(err instanceof Error ? err.message : 'Failed to save DXF file');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (settings.autoSaveOnExit && entities.length > 0) {
      handleSave();
    } else {
      onClose();
    }
  };

  const validationSummary = getValidationSummary(validationIssues);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#fafafa',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          // Loading state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6" color="text.secondary">
              Loading DXF file...
            </Typography>
          </Box>
        ) : error ? (
          // Error state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
              p: 4,
            }}
          >
            <Alert severity="error" sx={{ maxWidth: 600 }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={onClose}>
              Close
            </Button>
          </Box>
        ) : (
          // Main editing interface
          <>
            {/* Toolbar */}
            <DxfToolbar />

            {/* Validation summary banner */}
            {validationSummary.total > 0 && (
              <Alert
                severity={validationSummary.errors > 0 ? 'error' : 'warning'}
                sx={{ m: 2, mb: 0 }}
              >
                Found {validationSummary.total} issue(s): {validationSummary.errors} error(s),{' '}
                {validationSummary.warnings} warning(s)
                {validationSummary.autoFixable > 0 &&
                  ` (${validationSummary.autoFixable} auto-fixable)`}
              </Alert>
            )}

            {/* Main content area */}
            <Box
              sx={{
                display: 'flex',
                flexGrow: 1,
                minHeight: 0,
                overflow: 'hidden',
                p: 2,
                gap: 2,
              }}
            >
              {/* Sidebar */}
              <Box sx={{ width: 300, flexShrink: 0 }}>
                <DxfSidebar />
              </Box>

              {/* Canvas */}
              <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: 0 }}>
                <DxfCanvas />
              </Box>
            </Box>

            {/* Status bar */}
            <DxfStatusBar />
          </>
        )}
      </DialogContent>

      {!loading && !error && (
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={handleClose} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || entities.length === 0}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save & Close'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
