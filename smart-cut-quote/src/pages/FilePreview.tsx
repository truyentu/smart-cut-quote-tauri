/**
 * File Preview page - Stage 3
 * Preview uploaded DXF files with interactive viewer
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Alert,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuoteStore } from '../stores/quoteStore';
import DxfViewer from '../components/Viewer/DxfViewer';

export default function FilePreview() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    files.length > 0 ? files[0].id : null
  );

  const selectedFile = files.find((f) => f.id === selectedFileId);

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const handleNext = () => {
    navigate('/healing');
  };

  const handleBack = () => {
    navigate('/upload');
  };

  if (files.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          File Preview
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          No files uploaded yet. Please go back to upload DXF files.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to Upload
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Preview
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, height: 'calc(100vh - 300px)' }}>
        {/* Left: File list */}
        <Paper sx={{ width: 300, overflow: 'auto' }}>
          <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6">Files ({files.length})</Typography>
          </Box>
          <Divider />
          <List>
            {files.map((file) => (
              <ListItem key={file.id} disablePadding>
                <ListItemButton
                  selected={file.id === selectedFileId}
                  onClick={() => handleFileSelect(file.id)}
                >
                  <ListItemText
                    primary={file.name}
                    secondary={`Qty: ${file.quantity}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Right: DXF Viewer */}
        <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          {selectedFile ? (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedFile.name}
              </Typography>
              <DxfViewer filePath={selectedFile.path} />
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Select a file from the list to preview
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Upload
        </Button>
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext}>
          Next: File Healing
        </Button>
      </Box>
    </Box>
  );
}
