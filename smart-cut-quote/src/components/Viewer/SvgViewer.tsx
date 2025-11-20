/**
 * SVG Viewer Component
 * Displays SVG output from nesting optimization with zoom and pan controls
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, CircularProgress, Alert, Typography, IconButton, Tooltip, Slider } from '@mui/material';
import { readTextFile } from '@tauri-apps/plugin-fs';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FitScreenIcon from '@mui/icons-material/FitScreen';

interface SvgViewerProps {
  svgPath: string;
}

export default function SvgViewer({ svgPath }: SvgViewerProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (svgPath) {
      loadSvg(svgPath);
      // Reset zoom and position when new SVG is loaded
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [svgPath]);

  const loadSvg = async (path: string) => {
    try {
      setLoading(true);
      setError(null);

      let content: string;

      // Check if it's a Blob URL or HTTP URL
      if (path.startsWith('blob:') || path.startsWith('http')) {
        // Fetch from URL
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        content = await response.text();
      } else {
        // Read SVG file content using Tauri API
        content = await readTextFile(path);
      }

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

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (containerRef.current && contentRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      const content = contentRef.current.getBoundingClientRect();

      const scaleX = (container.width - 40) / (content.width / scale);
      const scaleY = (container.height - 40) / (content.height / scale);
      const newScale = Math.min(scaleX, scaleY, 1);

      setScale(newScale);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 10));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Slider change handler
  const handleSliderChange = useCallback((_: Event, value: number | number[]) => {
    setScale(value as number);
  }, []);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>

        <Slider
          value={scale}
          min={0.1}
          max={5}
          step={0.1}
          onChange={handleSliderChange}
          sx={{ width: 100 }}
          size="small"
        />

        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="body2" sx={{ minWidth: 50 }}>
          {Math.round(scale * 100)}%
        </Typography>

        <Tooltip title="Fit to Screen">
          <IconButton size="small" onClick={handleFitToScreen}>
            <FitScreenIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset View">
          <IconButton size="small" onClick={handleReset}>
            <RestartAltIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          Scroll to zoom, drag to pan
        </Typography>
      </Box>

      {/* SVG Container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 400,
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: '#ffffff',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {svgContent && (
          <div
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
          />
        )}
      </Box>
    </Box>
  );
}
