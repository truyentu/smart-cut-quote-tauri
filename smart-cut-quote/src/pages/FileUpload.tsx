/**
 * File Upload page - Stage 2
 * Upload DXF files with drag-drop and live preview
 * Combined upload and preview functionality
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FileUploadButton from '../components/FileList/FileUploadButton';
import FileListGrid from '../components/FileList/FileListGrid';
import DxfViewer from '../components/Viewer/DxfViewer';
import { useQuoteStore } from '../stores/quoteStore';

export default function FileUpload() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const addFiles = useQuoteStore((state) => state.addFiles);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    // Listen for file-drop event from Tauri
    const unlisten = listen<string[]>('tauri://file-drop', (event) => {
      const paths = event.payload;

      // Filter only .dxf files
      const dxfPaths = paths.filter(path => path.toLowerCase().endsWith('.dxf'));

      if (dxfPaths.length > 0) {
        const newFiles = dxfPaths.map(path => ({
          id: `file-${Date.now()}-${Math.random()}`,
          name: path.split(/[/\\]/).pop() || path,
          path: path,
          size: 0, // Will be updated later if needed
          quantity: 1,
          operations: [],
          status: 'pending' as const,
        }));

        addFiles(newFiles);

        // Auto-select first dropped file
        if (newFiles.length > 0) {
          setSelectedFileId(newFiles[0].id);
        }
      }

      setDragActive(false);
    });

    // Listen for drag hover
    const unlistenDragOver = listen('tauri://file-drop-hover', () => {
      setDragActive(true);
    });

    const unlistenDragCancelled = listen('tauri://file-drop-cancelled', () => {
      setDragActive(false);
    });

    return () => {
      unlisten.then(fn => fn());
      unlistenDragOver.then(fn => fn());
      unlistenDragCancelled.then(fn => fn());
    };
  }, [addFiles]);

  // Auto-select first file if none selected
  useEffect(() => {
    if (!selectedFileId && files.length > 0) {
      setSelectedFileId(files[0].id);
    }
  }, [files, selectedFileId]);

  const handleNext = () => {
    if (files.length > 0) {
      navigate('/healing');
    }
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">File Upload & Preview</Typography>
        <FileUploadButton />
      </Box>

      {dragActive && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Drop DXF files here to upload
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left column: File List */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Uploaded Files
            </Typography>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <FileListGrid
                selectedFileId={selectedFileId}
                onSelectFile={setSelectedFileId}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right column: DXF Preview */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Preview
            </Typography>
            <Box sx={{ flexGrow: 1 }}>
              {selectedFile ? (
                <DxfViewer
                  filePath={selectedFile.path}
                  fileId={selectedFile.id}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    border: '2px dashed #ccc',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {files.length === 0
                      ? 'Upload or drag & drop DXF files to preview'
                      : 'Select a file from the list to preview'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {files.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
          >
            Next: File Healing
          </Button>
        </Box>
      )}
    </Box>
  );
}
