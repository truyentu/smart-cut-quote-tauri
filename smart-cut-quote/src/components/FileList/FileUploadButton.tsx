/**
 * File Upload Button Component
 * Uses Tauri dialog API to select DXF files
 */

import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { open } from '@tauri-apps/plugin-dialog';
import { useQuoteStore } from '../../stores/quoteStore';
import { DxfFile } from '../../types/quote';

export default function FileUploadButton() {
  const [loading, setLoading] = useState(false);
  const addFiles = useQuoteStore((state) => state.addFiles);

  const handleUpload = async () => {
    try {
      setLoading(true);

      // Open file dialog - only DXF files
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'DXF Files',
            extensions: ['dxf']
          }
        ]
      });

      if (!selected) {
        setLoading(false);
        return;
      }

      // Convert to array if single file
      const filePaths = Array.isArray(selected) ? selected : [selected];

      // Create DxfFile objects
      const newFiles: DxfFile[] = filePaths.map((path, index) => {
        // Extract filename from path
        const pathParts = path.split(/[\\/]/);
        const fileName = pathParts[pathParts.length - 1];

        return {
          id: `file-${Date.now()}-${index}`,
          name: fileName,
          path: path,
          size: 0, // Will be populated later when reading file
          quantity: 1,
          operations: [],
          status: 'pending' as const
        };
      });

      // Add to store
      addFiles(newFiles);
      setLoading(false);
    } catch (error) {
      console.error('Failed to upload files:', error);
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
      onClick={handleUpload}
      disabled={loading}
    >
      {loading ? 'Uploading...' : 'Upload DXF Files'}
    </Button>
  );
}
