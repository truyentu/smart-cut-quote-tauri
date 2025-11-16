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

interface FileListGridProps {
  selectedFileId?: string | null;
  onSelectFile?: (fileId: string) => void;
}

export default function FileListGrid({ selectedFileId, onSelectFile }: FileListGridProps) {
  const files = useQuoteStore((state) => state.files);
  const removeFile = useQuoteStore((state) => state.removeFile);
  const updateFile = useQuoteStore((state) => state.updateFile);

  const handleQuantityChange = (fileId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (!isNaN(quantity) && quantity > 0) {
      updateFile(fileId, { quantity });
    }
  };

  const handleRowClick = (fileId: string) => {
    if (onSelectFile) {
      onSelectFile(fileId);
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
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>File Name</strong></TableCell>
            <TableCell align="center"><strong>Qty</strong></TableCell>
            <TableCell align="center"><strong>Status</strong></TableCell>
            <TableCell align="center"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
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
              <TableCell>
                <Box>
                  <Typography variant="body2">{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {file.path.length > 50 ? `...${file.path.slice(-50)}` : file.path}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  size="small"
                  value={file.quantity}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(file.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  inputProps={{ min: 1, style: { textAlign: 'center', width: '60px' } }}
                />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
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
