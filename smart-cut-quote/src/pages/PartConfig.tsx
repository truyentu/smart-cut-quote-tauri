/**
 * Part Configuration page - Stage 5
 * Configure materials, quantities, and machines for each part
 */

import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuoteStore } from '../stores/quoteStore';
import { MOCK_MATERIALS, MOCK_MACHINES } from '../data/mockData';

export default function PartConfig() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const updateFile = useQuoteStore((state) => state.updateFile);

  const handleQuantityChange = (fileId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (!isNaN(quantity) && quantity > 0) {
      updateFile(fileId, { quantity });
    }
  };

  const handleMaterialChange = (fileId: string, materialId: string) => {
    const material = MOCK_MATERIALS.find((m) => m.id === materialId);
    if (material) {
      updateFile(fileId, { material });
    }
  };

  const handleMachineChange = (fileId: string, machineName: string) => {
    updateFile(fileId, { machine: machineName });
  };

  const handleNext = () => {
    navigate('/nesting');
  };

  const handleBack = () => {
    navigate('/healing');
  };

  // Check if all files have material and machine assigned
  const allConfigured = files.every((f) => f.material && f.machine);

  if (files.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Part Configuration
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
        Part Configuration
      </Typography>

      <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
        Configure material and machine for each part. This information will be used for cost calculation.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>File Name</strong></TableCell>
              <TableCell align="center"><strong>Quantity</strong></TableCell>
              <TableCell><strong>Material</strong></TableCell>
              <TableCell><strong>Machine</strong></TableCell>
              <TableCell><strong>Metadata</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>
                  <Typography variant="body2">{file.name}</Typography>
                </TableCell>
                <TableCell align="center">
                  <TextField
                    type="number"
                    size="small"
                    value={file.quantity}
                    onChange={(e) => handleQuantityChange(file.id, e.target.value)}
                    inputProps={{ min: 1, style: { textAlign: 'center', width: '60px' } }}
                  />
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={file.material?.id || ''}
                      onChange={(e) => handleMaterialChange(file.id, e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        <em>Select Material</em>
                      </MenuItem>
                      {MOCK_MATERIALS.map((material) => (
                        <MenuItem key={material.id} value={material.id}>
                          {material.name} ({material.grade}, {material.thickness}mm)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={file.machine || ''}
                      onChange={(e) => handleMachineChange(file.id, e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        <em>Select Machine</em>
                      </MenuItem>
                      {MOCK_MACHINES.map((machine) => (
                        <MenuItem key={machine.id} value={machine.name}>
                          {machine.name} (${machine.hourlyRate}/hr)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  {file.metadata ? (
                    <Box>
                      <Typography variant="caption" display="block">
                        Cut: {file.metadata.cutLength.toFixed(2)} mm
                      </Typography>
                      <Typography variant="caption" display="block">
                        Pierces: {file.metadata.pierceCount}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Size: {file.metadata.dimensions.width.toFixed(1)} × {file.metadata.dimensions.height.toFixed(1)} mm
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No metadata
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!allConfigured && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please assign material and machine to all parts before proceeding.
        </Alert>
      )}

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Healing
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          disabled={!allConfigured}
        >
          Next: Nesting
        </Button>
      </Box>
    </Box>
  );
}
