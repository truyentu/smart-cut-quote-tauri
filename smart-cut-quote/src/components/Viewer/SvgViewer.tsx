/**
 * SVG Viewer Component
 * Displays SVG output from nesting optimization
 */

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { readTextFile } from '@tauri-apps/plugin-fs';

interface SvgViewerProps {
  svgPath: string;
}

export default function SvgViewer({ svgPath }: SvgViewerProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (svgPath) {
      loadSvg(svgPath);
    }
  }, [svgPath]);

  const loadSvg = async (path: string) => {
    try {
      setLoading(true);
      setError(null);

      // Read SVG file content using Tauri API
      const content = await readTextFile(path);

      if (!content) {
        throw new Error('SVG file is empty');
      }

      setSvgContent(content);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load SVG:', err);
      setError(err.message || 'Failed to load SVG file');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  if (!svgPath) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          border: '2px dashed #ccc',
          borderRadius: 1,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Nesting result will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 400,
        overflow: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        backgroundColor: '#ffffff',
        p: 2,
      }}
    >
      {svgContent && (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        />
      )}
    </Box>
  );
}
