/**
 * DXF Status Bar Component
 * Display status messages and tool instructions
 */

import { Box, Typography } from '@mui/material';
import { useDxfHealingStore } from '../../stores/dxfHealingStore';

export default function DxfStatusBar() {
  const activeTool = useDxfHealingStore(state => state.activeTool);
  const selectedEntityIds = useDxfHealingStore(state => state.selectedEntityIds);
  const validationIssues = useDxfHealingStore(state => state.validationIssues);

  const getStatusMessage = (): string => {
    switch (activeTool) {
      case 'SELECT':
        if (selectedEntityIds.length === 0) {
          return 'Click to select entity • Ctrl+Click for multi-select • Drag to select area';
        }
        return `${selectedEntityIds.length} entity(ies) selected • Press Delete to remove`;

      case 'DELETE':
        return 'Click entity to delete • Or use Delete key after selecting';

      case 'MERGE':
        return 'Click first endpoint (yellow ring appears) • Then click second endpoint to merge (max 0.1mm apart) • Green circle shows snap points';

      case 'PAN':
        return 'Pan mode: Drag to move canvas • Release Space to return to Select mode';

      default:
        return 'Ready';
    }
  };

  const getValidationMessage = (): string | null => {
    if (validationIssues.length === 0) {
      return 'No issues found ✓';
    }

    const errors = validationIssues.filter(i => i.severity === 'ERROR').length;
    const warnings = validationIssues.filter(i => i.severity === 'WARNING').length;

    return `${errors} error(s), ${warnings} warning(s) found`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 1.5,
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#fff',
      }}
    >
      {/* Status message */}
      <Typography variant="body2" color="text.secondary">
        {getStatusMessage()}
      </Typography>

      {/* Validation summary */}
      <Typography
        variant="body2"
        sx={{
          color: validationIssues.length === 0 ? 'success.main' : 'warning.main',
        }}
      >
        {getValidationMessage()}
      </Typography>
    </Box>
  );
}
