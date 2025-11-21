/**
 * DXF Toolbar Component
 * Tool selection and editing actions
 */

import { useState } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Button,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';
import MouseIcon from '@mui/icons-material/Mouse';
import DeleteIcon from '@mui/icons-material/Delete';
import MergeIcon from '@mui/icons-material/MergeType';
import LayersIcon from '@mui/icons-material/Layers';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import BuildIcon from '@mui/icons-material/Build';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StraightenIcon from '@mui/icons-material/Straighten';
import { useDxfHealingStore } from '../../stores/dxfHealingStore';
import type { DxfTool } from '../../types/dxfHealing';

export default function DxfToolbar() {
  const activeTool = useDxfHealingStore(state => state.activeTool);
  const setActiveTool = useDxfHealingStore(state => state.setActiveTool);
  const deleteSelected = useDxfHealingStore(state => state.deleteSelected);
  const undo = useDxfHealingStore(state => state.undo);
  const redo = useDxfHealingStore(state => state.redo);
  const canUndo = useDxfHealingStore(state => state.canUndo);
  const canRedo = useDxfHealingStore(state => state.canRedo);
  const selectedEntityIds = useDxfHealingStore(state => state.selectedEntityIds);
  const changeLayer = useDxfHealingStore(state => state.changeLayer);
  const autoFixDuplicates = useDxfHealingStore(state => state.autoFixDuplicates);
  const autoFixZeroLength = useDxfHealingStore(state => state.autoFixZeroLength);
  const validationIssues = useDxfHealingStore(state => state.validationIssues);

  const [layerMenuAnchor, setLayerMenuAnchor] = useState<null | HTMLElement>(null);
  const [autoFixMenuAnchor, setAutoFixMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleToolChange = (_event: React.MouseEvent<HTMLElement>, newTool: DxfTool | null) => {
    if (newTool !== null) {
      setActiveTool(newTool);
    }
  };

  const handleDelete = () => {
    if (selectedEntityIds.length > 0) {
      deleteSelected();
    }
  };

  const handleLayerMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLayerMenuAnchor(event.currentTarget);
  };

  const handleLayerMenuClose = () => {
    setLayerMenuAnchor(null);
  };

  const handleChangeLayer = (layer: string) => {
    if (selectedEntityIds.length > 0) {
      changeLayer(selectedEntityIds, layer);
    }
    handleLayerMenuClose();
  };

  const handleAutoFixMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAutoFixMenuAnchor(event.currentTarget);
  };

  const handleAutoFixMenuClose = () => {
    setAutoFixMenuAnchor(null);
  };

  const handleFixDuplicates = () => {
    const count = autoFixDuplicates();
    handleAutoFixMenuClose();
    if (count > 0) {
      setSnackbarMessage(`✓ Fixed ${count} duplicate ${count === 1 ? 'entity' : 'entities'}`);
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage('No duplicate entities found');
      setSnackbarOpen(true);
    }
  };

  const handleFixZeroLength = () => {
    const count = autoFixZeroLength();
    handleAutoFixMenuClose();
    if (count > 0) {
      setSnackbarMessage(`✓ Removed ${count} zero-length ${count === 1 ? 'entity' : 'entities'}`);
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage('No zero-length entities found');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
      }}
    >
      {/* Tool selection */}
      <ToggleButtonGroup
        value={activeTool}
        exclusive
        onChange={handleToolChange}
        size="small"
      >
        <ToggleButton value="SELECT">
          <Tooltip title="Select (S)">
            <MouseIcon />
          </Tooltip>
        </ToggleButton>

        <ToggleButton value="DELETE">
          <Tooltip title="Delete (D)">
            <DeleteIcon />
          </Tooltip>
        </ToggleButton>

        <ToggleButton value="MERGE">
          <Tooltip title="Merge Endpoints (M)">
            <MergeIcon />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem />

      {/* Editing actions */}
      <Tooltip title="Delete Selected (Delete)">
        <span>
          <IconButton
            size="small"
            onClick={handleDelete}
            disabled={selectedEntityIds.length === 0}
          >
            <DeleteIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Change Layer">
        <span>
          <IconButton
            size="small"
            onClick={handleLayerMenuOpen}
            disabled={selectedEntityIds.length === 0}
          >
            <LayersIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={layerMenuAnchor}
        open={Boolean(layerMenuAnchor)}
        onClose={handleLayerMenuClose}
      >
        <MenuItem onClick={() => handleChangeLayer('CUTTING')}>
          CUTTING
        </MenuItem>
        <MenuItem onClick={() => handleChangeLayer('BEND')}>
          BEND
        </MenuItem>
        <MenuItem onClick={() => handleChangeLayer('IGNORE')}>
          IGNORE
        </MenuItem>
      </Menu>

      <Divider orientation="vertical" flexItem />

      {/* Undo/Redo */}
      <Tooltip title="Undo (Ctrl+Z)">
        <span>
          <IconButton size="small" onClick={undo} disabled={!canUndo()}>
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Redo (Ctrl+Y)">
        <span>
          <IconButton size="small" onClick={redo} disabled={!canRedo()}>
            <RedoIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      {/* Auto-Fix Tools */}
      <Tooltip title="Auto-Fix Tools">
        <Button
          size="small"
          startIcon={<BuildIcon />}
          onClick={handleAutoFixMenuOpen}
          sx={{ textTransform: 'none' }}
        >
          Auto-Fix
        </Button>
      </Tooltip>

      <Menu
        anchorEl={autoFixMenuAnchor}
        open={Boolean(autoFixMenuAnchor)}
        onClose={handleAutoFixMenuClose}
      >
        <MenuItem onClick={handleFixDuplicates}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Fix Duplicates
            {validationIssues.some(i => i.type === 'DUPLICATE_LINE') && (
              <span style={{ marginLeft: 8, color: '#f44336' }}>
                ({validationIssues.filter(i => i.type === 'DUPLICATE_LINE').length})
              </span>
            )}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleFixZeroLength}>
          <ListItemIcon>
            <StraightenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Remove Zero-Length
            {validationIssues.some(i => i.type === 'ZERO_LENGTH') && (
              <span style={{ marginLeft: 8, color: '#f44336' }}>
                ({validationIssues.filter(i => i.type === 'ZERO_LENGTH').length})
              </span>
            )}
          </ListItemText>
        </MenuItem>
      </Menu>

      <Box sx={{ flexGrow: 1 }} />

      {/* Selection info */}
      {selectedEntityIds.length > 0 && (
        <Box sx={{ color: 'text.secondary', fontSize: 14 }}>
          {selectedEntityIds.length} selected
        </Box>
      )}

      {/* Toast notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
