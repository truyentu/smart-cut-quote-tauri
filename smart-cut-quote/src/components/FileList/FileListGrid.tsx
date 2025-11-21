/**
 * File List Grid Component
 * Displays uploaded DXF files in a table with file information, validation status, and edit actions
 */

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Typography,
  Chip,
  Button,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useQuoteStore } from '../../stores/quoteStore';
import DxfHealingDialog from '../DxfHealing/DxfHealingDialog';
import { parseDxfFile } from '../../services/dxfParserService';
import { validateEntities } from '../../services/dxfValidationService';
import type { ValidationIssue } from '../../types/dxfHealing';

interface FileListGridProps {
  selectedFileId?: string | null;
  onSelectFile?: (fileId: string) => void;
}

interface FileValidationStatus {
  validating: boolean;
  validated: boolean;
  issues: ValidationIssue[];
  hasErrors: boolean;
}

export default function FileListGrid({ selectedFileId, onSelectFile }: FileListGridProps) {
  const files = useQuoteStore((state) => state.files);
  const removeFile = useQuoteStore((state) => state.removeFile);

  const [validationStatuses, setValidationStatuses] = useState<Map<string, FileValidationStatus>>(new Map());
  const [healingDialogOpen, setHealingDialogOpen] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Validate file when it's added
  useEffect(() => {
    files.forEach(async (file) => {
      // Skip if already validated or validating
      if (validationStatuses.has(file.id)) {
        return;
      }

      // Mark as validating
      setValidationStatuses(prev => new Map(prev).set(file.id, {
        validating: true,
        validated: false,
        issues: [],
        hasErrors: false,
      }));

      // Validate
      try {
        const parsedDxf = await parseDxfFile(file.path);
        const issues = validateEntities(parsedDxf.entities);
        const hasErrors = issues.some(issue => issue.severity === 'ERROR');

        setValidationStatuses(prev => new Map(prev).set(file.id, {
          validating: false,
          validated: true,
          issues,
          hasErrors,
        }));
      } catch (error) {
        console.error(`Failed to validate ${file.name}:`, error);
        setValidationStatuses(prev => new Map(prev).set(file.id, {
          validating: false,
          validated: true,
          issues: [],
          hasErrors: false,
        }));
      }
    });
  }, [files]);

  const handleRowClick = (fileId: string) => {
    if (onSelectFile) {
      onSelectFile(fileId);
    }
  };

  const handleOpenHealing = (filePath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedFilePath(filePath);
    setHealingDialogOpen(true);
  };

  const handleCloseHealing = () => {
    setHealingDialogOpen(false);
    setSelectedFilePath(null);

    // Re-validate the file after editing
    if (selectedFilePath) {
      const file = files.find(f => f.path === selectedFilePath);
      if (file) {
        // Remove validation status to trigger re-validation
        setValidationStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(file.id);
          return newMap;
        });
      }
    }
  };

  const formatSize = (dimensions?: { width: number; height: number }) => {
    if (!dimensions) {
      return 'Calculating...';
    }
    return `${dimensions.width.toFixed(2)} × ${dimensions.height.toFixed(2)}`;
  };

  if (files.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No files uploaded yet. Click "Upload DXF Files" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width="60px"><strong>No.</strong></TableCell>
              <TableCell><strong>File Name</strong></TableCell>
              <TableCell align="center"><strong>Size</strong></TableCell>
              <TableCell align="center" width="140px"><strong>Status</strong></TableCell>
              <TableCell align="center" width="200px"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file, index) => {
              const status = validationStatuses.get(file.id);
              const issueCount = status?.issues.length || 0;
              const hasErrors = status?.hasErrors || false;

              return (
                <TableRow
                  key={file.id}
                  hover
                  onClick={() => handleRowClick(file.id)}
                  selected={selectedFileId === file.id}
                  sx={{
                    cursor: 'pointer',
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <TableCell align="center">
                    <Typography variant="body2">{index + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{file.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {file.path.length > 50 ? `...${file.path.slice(-50)}` : file.path}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatSize(file.metadata?.dimensions)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {status?.validating && (
                      <Chip
                        icon={<CircularProgress size={16} />}
                        label="Validating..."
                        size="small"
                        color="default"
                      />
                    )}

                    {status?.validated && !hasErrors && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="No Issues"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}

                    {status?.validated && hasErrors && (
                      <Chip
                        icon={<ErrorIcon />}
                        label={`${issueCount} Issue${issueCount > 1 ? 's' : ''}`}
                        size="small"
                        color="error"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                      {/* Fix Issues Button - Only if has errors */}
                      {hasErrors && status?.validated && (
                        <Tooltip title={`Fix ${issueCount} issue${issueCount > 1 ? 's' : ''}`}>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<BuildIcon />}
                            onClick={(e) => handleOpenHealing(file.path, e)}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            Fix
                          </Button>
                        </Tooltip>
                      )}

                      {/* Edit Button - Always shown */}
                      <Tooltip title="Edit DXF file">
                        <IconButton
                          color="primary"
                          onClick={(e) => handleOpenHealing(file.path, e)}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Delete Button */}
                      <Tooltip title="Delete file">
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DXF Healing Dialog */}
      <DxfHealingDialog
        open={healingDialogOpen}
        filePath={selectedFilePath}
        onClose={handleCloseHealing}
        onSave={handleCloseHealing}
      />
    </>
  );
}
