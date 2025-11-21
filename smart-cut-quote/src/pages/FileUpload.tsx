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
          selected: true, // Select by default
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0 }}>
        <Typography variant="h4">File Upload & Preview</Typography>
        <FileUploadButton />
      </Box>

      {dragActive && (
        <Alert severity="info" sx={{ mb: 2, flexShrink: 0 }}>
          Drop DXF files here to upload
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left column: File List */}
        <Box sx={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Typography variant="h6" gutterBottom sx={{ px: 2 }}>
            Uploaded Files
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FileListGrid
              selectedFileId={selectedFileId}
              onSelectFile={setSelectedFileId}
            />
          </Box>
        </Box>

        {/* Right column: DXF Preview */}
        <Box sx={{ flex: '1 1 58%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Typography variant="h6" gutterBottom>
              Preview
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #ccc',
                borderRadius: 1,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#fafafa'
              }}
            >
              {selectedFile ? (
                <Box sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                  <DxfViewer
                    filePath={selectedFile.path}
                    fileId={selectedFile.id}
                  />
                </Box>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  {files.length === 0
                    ? 'Upload or drag & drop DXF files to preview'
                    : 'Select a file from the list to preview'}
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

    </Box>
  );
}
