/**
 * File List Grid Component
 * Displays uploaded DXF files in a table with file information and delete actions
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

  const handleRowClick = (fileId: string) => {
    if (onSelectFile) {
      onSelectFile(fileId);
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
    <TableContainer component={Paper} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width="60px"><strong>No.</strong></TableCell>
            <TableCell><strong>File Name</strong></TableCell>
            <TableCell align="center"><strong>Size</strong></TableCell>
            <TableCell align="center" width="80px"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file, index) => (
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
