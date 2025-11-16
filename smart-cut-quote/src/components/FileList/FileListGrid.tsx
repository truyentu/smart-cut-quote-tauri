/**
 * File List Grid Component
 * Displays uploaded DXF files in a table with editable quantity and delete actions
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Chip,
  Box,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuoteStore } from '../../stores/quoteStore';

export default function FileListGrid() {
  const files = useQuoteStore((state) => state.files);
  const removeFile = useQuoteStore((state) => state.removeFile);
  const updateFile = useQuoteStore((state) => state.updateFile);

  const handleQuantityChange = (fileId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (!isNaN(quantity) && quantity > 0) {
      updateFile(fileId, { quantity });
    }
  };

  const getStatusColor = (status: 'pending' | 'ok' | 'error') => {
    switch (status) {
      case 'ok':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
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
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>File Name</strong></TableCell>
            <TableCell align="center"><strong>Quantity</strong></TableCell>
            <TableCell><strong>Material</strong></TableCell>
            <TableCell><strong>Machine</strong></TableCell>
            <TableCell align="center"><strong>Status</strong></TableCell>
            <TableCell align="center"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id} hover>
              <TableCell>
                <Box>
                  <Typography variant="body2">{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {file.path}
                  </Typography>
                </Box>
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
                {file.material ? (
                  <Typography variant="body2">
                    {file.material.name} - {file.material.thickness}mm
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not set
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {file.machine ? (
                  <Typography variant="body2">{file.machine}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not set
                  </Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={file.status.toUpperCase()}
                  color={getStatusColor(file.status)}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">
                <IconButton
                  color="error"
                  onClick={() => removeFile(file.id)}
                  title="Delete file"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
