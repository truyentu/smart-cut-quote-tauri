/**
 * Nesting page - Stage 6
 * Run nesting optimization and view results
 * Based on IMPLEMENTATION_PLAN.md section 8.5
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuoteStore } from '../stores/quoteStore';
import { runNestingWorkflow } from '../services/nestingService';
import SvgViewer from '../components/Viewer/SvgViewer';

export default function Nesting() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const setNestingResult = useQuoteStore((state) => state.setNestingResult);

  const [loading, setLoading] = useState(false);
  const [svgPath, setSvgPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripHeight, setStripHeight] = useState<number>(6000);
  const [partSpacing, setPartSpacing] = useState<number>(5);

  const handleStartNesting = async () => {
    if (files.length === 0) {
      setError('No files to nest. Please upload files first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSvgPath(null);

    try {
      const result = await runNestingWorkflow(files, stripHeight, partSpacing);

      if (result.success && result.data && result.svgPath) {
        // Save result to store
        setNestingResult(result.data);
        setSvgPath(result.svgPath);
        setError(null);
      } else {
        setError(result.error || 'Nesting failed with unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    navigate('/summary');
  };

  const handleBack = () => {
    navigate('/config');
  };

  if (files.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Nesting Optimization
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Nesting Optimization
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, height: 'calc(100vh - 300px)' }}>
        {/* Left: Controls and file list */}
        <Paper sx={{ width: 350, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6">Nesting Parameters</Typography>

          <TextField
            label="Strip Height (mm)"
            type="number"
            value={stripHeight}
            onChange={(e) => setStripHeight(Number(e.target.value))}
            fullWidth
            disabled={loading}
          />

          <TextField
            label="Part Spacing (mm)"
            type="number"
            value={partSpacing}
            onChange={(e) => setPartSpacing(Number(e.target.value))}
            fullWidth
            disabled={loading}
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleStartNesting}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          >
            {loading ? 'Processing...' : 'Start Nesting'}
          </Button>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Divider />

          <Typography variant="h6">Files to Nest ({files.length})</Typography>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <List dense>
              {files.map((file) => (
                <ListItem key={file.id}>
                  <ListItemText
                    primary={file.name}
                    secondary={`Quantity: ${file.quantity}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>

        {/* Right: SVG Viewer */}
        <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Nesting Result
          </Typography>
          <SvgViewer svgPath={svgPath || ''} />
        </Paper>
      </Box>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Config
        </Button>
        {svgPath && (
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext}>
            Next: Summary
          </Button>
        )}
      </Box>
    </Box>
  );
}
