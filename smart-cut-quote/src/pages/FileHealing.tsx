/**
 * File Healing page - Stage 4
 * Fix and validate DXF files
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useQuoteStore } from '../stores/quoteStore';
import DxfHealingDialog from '../components/DxfHealing/DxfHealingDialog';
import { parseDxfFile } from '../services/dxfParserService';
import { validateEntities } from '../services/dxfValidationService';
import type { ValidationIssue } from '../types/dxfHealing';

interface FileValidationStatus {
  fileId: string;
  fileName: string;
  filePath: string;
  validating: boolean;
  validated: boolean;
  issues: ValidationIssue[];
  hasErrors: boolean;
}

// Helper function to validate DXF file
async function validateDxfFile(filePath: string): Promise<{ issues: ValidationIssue[] }> {
  try {
    const parsedDxf = await parseDxfFile(filePath);
    const issues = validateEntities(parsedDxf.entities);
    return { issues };
  } catch (error) {
    console.error('Failed to parse DXF file:', error);
    return { issues: [] };
  }
}

export default function FileHealing() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);

  const [validationStatuses, setValidationStatuses] = useState<Map<string, FileValidationStatus>>(new Map());
  const [healingDialogOpen, setHealingDialogOpen] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Auto-validate all files on mount
  useEffect(() => {
    if (files.length > 0) {
      validateAllFiles();
    }
  }, []); // Only run on mount

  const validateAllFiles = async () => {
    const newStatuses = new Map<string, FileValidationStatus>();

    // Initialize all files as validating
    for (const file of files) {
      newStatuses.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        filePath: file.path,
        validating: true,
        validated: false,
        issues: [],
        hasErrors: false,
      });
    }
    setValidationStatuses(newStatuses);

    // Validate each file
    for (const file of files) {
      try {
        const result = await validateDxfFile(file.path);

        newStatuses.set(file.id, {
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          validating: false,
          validated: true,
          issues: result.issues,
          hasErrors: result.issues.some(issue => issue.severity === 'ERROR'),
        });
        setValidationStatuses(new Map(newStatuses));
      } catch (error) {
        console.error(`Failed to validate ${file.name}:`, error);
        newStatuses.set(file.id, {
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          validating: false,
          validated: true,
          issues: [],
          hasErrors: false,
        });
        setValidationStatuses(new Map(newStatuses));
      }
    }
  };

  const handleOpenHealing = (filePath: string) => {
    setSelectedFilePath(filePath);
    setHealingDialogOpen(true);
  };

  const handleCloseHealing = () => {
    setHealingDialogOpen(false);
    setSelectedFilePath(null);

    // Re-validate all files after editing
    validateAllFiles();
  };

  const handleNext = () => {
    navigate('/library');
  };

  const handleBack = () => {
    navigate('/upload');
  };

  if (files.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          File Healing & Validation
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          No files uploaded yet. Please go back to upload DXF files.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/upload')}>
            Back to Upload
          </Button>
        </Box>
      </Box>
    );
  }

  const totalFiles = files.length;
  const validatedFiles = Array.from(validationStatuses.values()).filter(s => s.validated).length;
  const filesWithErrors = Array.from(validationStatuses.values()).filter(s => s.hasErrors).length;
  const allValidated = validatedFiles === totalFiles;
  const allClean = allValidated && filesWithErrors === 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Healing & Validation
      </Typography>

      {/* Summary Alert */}
      {allValidated && (
        <Alert
          severity={allClean ? 'success' : 'warning'}
          sx={{ mt: 2, mb: 3 }}
          icon={allClean ? <CheckCircleIcon /> : <ErrorIcon />}
        >
          {allClean ? (
            <Typography>
              ✓ All {totalFiles} file{totalFiles > 1 ? 's' : ''} validated successfully with no issues!
            </Typography>
          ) : (
            <Typography>
              {filesWithErrors} of {totalFiles} file{totalFiles > 1 ? 's' : ''} {filesWithErrors > 1 ? 'have' : 'has'} validation errors.
              Click "Fix Issues" to open the healing editor.
            </Typography>
          )}
        </Alert>
      )}

      {!allValidated && (
        <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
          Validating files... ({validatedFiles} / {totalFiles})
        </Alert>
      )}

      {/* File List */}
      <Paper sx={{ mt: 2 }}>
        <List>
          {files.map((file) => {
            const status = validationStatuses.get(file.id);
            const issueCount = status?.issues.length || 0;
            const hasErrors = status?.hasErrors || false;

            return (
              <ListItem
                key={file.id}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* Fix Issues Button - Only shown if there are errors */}
                    {hasErrors && status?.validated && (
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<BuildIcon />}
                        onClick={() => handleOpenHealing(file.path)}
                      >
                        Fix Issues ({issueCount})
                      </Button>
                    )}

                    {/* Edit Button - Always shown */}
                    <Tooltip title="Edit DXF file">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenHealing(file.path)}
                      >
                        Edit
                      </Button>
                    </Tooltip>
                  </Box>
                }
                sx={{ borderBottom: '1px solid #e0e0e0' }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">{file.name}</Typography>

                      {/* Status Chip */}
                      {status?.validating && (
                        <Chip label="Validating..." size="small" color="default" />
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
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {file.path.length > 60 ? `...${file.path.slice(-60)}` : file.path}
                      </Typography>

                      {/* Show issue details if any */}
                      {status?.validated && issueCount > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          {status.issues.map((issue, idx) => (
                            <Typography
                              key={idx}
                              variant="caption"
                              color="error"
                              sx={{ display: 'block' }}
                            >
                              • {issue.message}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Upload
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          disabled={!allValidated}
        >
          Next: Part Library
        </Button>
      </Box>

      {/* DXF Healing Dialog */}
      <DxfHealingDialog
        open={healingDialogOpen}
        filePath={selectedFilePath}
        onClose={handleCloseHealing}
        onSave={handleCloseHealing}
      />
    </Box>
  );
}
