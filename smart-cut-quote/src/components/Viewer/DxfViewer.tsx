/**
 * DXF Viewer Component
 * Reads and renders DXF files on HTML5 canvas
 * Based on IMPLEMENTATION_PLAN.md section 7.2
 * Enhanced with metadata calculation (cutLength, pierceCount, area, dimensions)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { readTextFile } from '@tauri-apps/api/fs';
import DxfParser from 'dxf-parser';
import { useQuoteStore } from '../../stores/quoteStore';

interface DxfViewerProps {
  filePath: string;
  fileId?: string; // Optional: if provided, will update file metadata in store
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export default function DxfViewer({ filePath, fileId }: DxfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dxfData, setDxfData] = useState<any>(null);
  const updateFile = useQuoteStore((state) => state.updateFile);

  useEffect(() => {
    if (filePath) {
      loadAndRenderDxf(filePath);
    }
  }, [filePath]);

  const loadAndRenderDxf = async (path: string) => {
    try {
      setLoading(true);
      setError(null);

      // Read DXF file content using Tauri API
      const content = await readTextFile(path);

      // Parse DXF using dxf-parser
      const parser = new DxfParser();
      const dxf = parser.parseSync(content);

      if (!dxf) {
        throw new Error('Failed to parse DXF file');
      }

      setDxfData(dxf);
      setLoading(false);

      // Calculate metadata (cutLength, pierceCount, etc.)
      if (fileId && dxf.entities) {
        const metadata = calculateMetadata(dxf.entities);
        updateFile(fileId, { metadata });
      }

      // Render to canvas
      renderDxfToCanvas(dxf);
    } catch (err: any) {
      console.error('Failed to load DXF:', err);
      setError(err.message || 'Failed to load DXF file');
      setLoading(false);
    }
  };

  const calculateMetadata = (entities: any[]) => {
    let totalCutLength = 0;
    let pierceCount = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    entities.forEach((entity: any) => {
      // Update pierce count (count each distinct entity as one pierce)
      pierceCount++;

      switch (entity.type) {
        case 'LINE':
          if (entity.vertices && entity.vertices.length >= 2) {
            const v0 = entity.vertices[0];
            const v1 = entity.vertices[1];
            const length = Math.sqrt(
              Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2)
            );
            totalCutLength += length;

            // Update bounds
            minX = Math.min(minX, v0.x, v1.x);
            maxX = Math.max(maxX, v0.x, v1.x);
            minY = Math.min(minY, v0.y, v1.y);
            maxY = Math.max(maxY, v0.y, v1.y);
          }
          break;

        case 'CIRCLE':
          if (entity.center && entity.radius) {
            // Circumference = 2 * π * r
            totalCutLength += 2 * Math.PI * entity.radius;

            // Update bounds
            minX = Math.min(minX, entity.center.x - entity.radius);
            maxX = Math.max(maxX, entity.center.x + entity.radius);
            minY = Math.min(minY, entity.center.y - entity.radius);
            maxY = Math.max(maxY, entity.center.y + entity.radius);
          }
          break;

        case 'ARC':
          if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
            // Arc length = radius * angle (in radians)
            let angleDiff = entity.endAngle - entity.startAngle;
            if (angleDiff < 0) angleDiff += 360;
            const angleRad = (angleDiff * Math.PI) / 180;
            totalCutLength += entity.radius * angleRad;

            // Update bounds (simplified - use full circle bounds)
            minX = Math.min(minX, entity.center.x - entity.radius);
            maxX = Math.max(maxX, entity.center.x + entity.radius);
            minY = Math.min(minY, entity.center.y - entity.radius);
            maxY = Math.max(maxY, entity.center.y + entity.radius);
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (entity.vertices && entity.vertices.length > 1) {
            // Calculate total length of polyline
            for (let i = 0; i < entity.vertices.length - 1; i++) {
              const v0 = entity.vertices[i];
              const v1 = entity.vertices[i + 1];
              const length = Math.sqrt(
                Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2)
              );
              totalCutLength += length;
            }

            // If closed, add closing segment
            if (entity.shape && entity.vertices.length > 2) {
              const first = entity.vertices[0];
              const last = entity.vertices[entity.vertices.length - 1];
              const length = Math.sqrt(
                Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
              );
              totalCutLength += length;
            }

            // Update bounds
            entity.vertices.forEach((v: any) => {
              minX = Math.min(minX, v.x);
              maxX = Math.max(maxX, v.x);
              minY = Math.min(minY, v.y);
              maxY = Math.max(maxY, v.y);
            });
          }
          break;

        case 'SPLINE':
          // Approximate spline length by control points
          if (entity.controlPoints && entity.controlPoints.length > 1) {
            for (let i = 0; i < entity.controlPoints.length - 1; i++) {
              const v0 = entity.controlPoints[i];
              const v1 = entity.controlPoints[i + 1];
              const length = Math.sqrt(
                Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2)
              );
              totalCutLength += length;
            }

            // Update bounds
            entity.controlPoints.forEach((v: any) => {
              minX = Math.min(minX, v.x);
              maxX = Math.max(maxX, v.x);
              minY = Math.min(minY, v.y);
              maxY = Math.max(maxY, v.y);
            });
          }
          break;

        default:
          // Unknown entity type - don't count for pierce
          pierceCount--;
          break;
      }
    });

    // Calculate dimensions and area
    const width = isFinite(maxX) ? maxX - minX : 0;
    const height = isFinite(maxY) ? maxY - minY : 0;
    const area = width * height;

    return {
      cutLength: Math.round(totalCutLength * 100) / 100, // Round to 2 decimal places
      pierceCount,
      area: Math.round(area * 100) / 100,
      dimensions: {
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
      },
    };
  };

  const renderDxfToCanvas = (dxf: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas background to white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!dxf.entities || dxf.entities.length === 0) {
      return;
    }

    // Calculate bounds
    const bounds = calculateBounds(dxf.entities);

    // Setup viewport transform
    const padding = 50;
    const scale = calculateScale(bounds, canvas.width - padding * 2, canvas.height - padding * 2);

    // Center the drawing
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, -scale); // Flip Y axis (DXF uses bottom-up)
    ctx.translate(-centerX, -centerY);

    // Draw entities
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 / scale;

    dxf.entities.forEach((entity: any) => {
      drawEntity(ctx, entity, scale);
    });

    ctx.restore();
  };

  const calculateBounds = (entities: any[]): Bounds => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    entities.forEach((entity: any) => {
      switch (entity.type) {
        case 'LINE':
          if (entity.vertices && entity.vertices.length >= 2) {
            const v0 = entity.vertices[0];
            const v1 = entity.vertices[1];
            minX = Math.min(minX, v0.x, v1.x);
            maxX = Math.max(maxX, v0.x, v1.x);
            minY = Math.min(minY, v0.y, v1.y);
            maxY = Math.max(maxY, v0.y, v1.y);
          }
          break;

        case 'CIRCLE':
          if (entity.center && entity.radius) {
            minX = Math.min(minX, entity.center.x - entity.radius);
            maxX = Math.max(maxX, entity.center.x + entity.radius);
            minY = Math.min(minY, entity.center.y - entity.radius);
            maxY = Math.max(maxY, entity.center.y + entity.radius);
          }
          break;

        case 'ARC':
          if (entity.center && entity.radius) {
            // Simplified: use full circle bounds
            minX = Math.min(minX, entity.center.x - entity.radius);
            maxX = Math.max(maxX, entity.center.x + entity.radius);
            minY = Math.min(minY, entity.center.y - entity.radius);
            maxY = Math.max(maxY, entity.center.y + entity.radius);
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (entity.vertices) {
            entity.vertices.forEach((v: any) => {
              minX = Math.min(minX, v.x);
              maxX = Math.max(maxX, v.x);
              minY = Math.min(minY, v.y);
              maxY = Math.max(maxY, v.y);
            });
          }
          break;
      }
    });

    // Fallback if no valid bounds found
    if (!isFinite(minX)) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    return { minX, maxX, minY, maxY };
  };

  const calculateScale = (bounds: Bounds, targetWidth: number, targetHeight: number): number => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    if (width === 0 || height === 0) {
      return 1;
    }

    const scaleX = targetWidth / width;
    const scaleY = targetHeight / height;

    return Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, entity: any, scale: number) => {
    try {
      switch (entity.type) {
        case 'LINE':
          if (entity.vertices && entity.vertices.length >= 2) {
            const v0 = entity.vertices[0];
            const v1 = entity.vertices[1];
            ctx.beginPath();
            ctx.moveTo(v0.x, v0.y);
            ctx.lineTo(v1.x, v1.y);
            ctx.stroke();
          }
          break;

        case 'CIRCLE':
          if (entity.center && entity.radius) {
            ctx.beginPath();
            ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;

        case 'ARC':
          if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
            ctx.beginPath();
            // Convert degrees to radians
            const startAngle = (entity.startAngle * Math.PI) / 180;
            const endAngle = (entity.endAngle * Math.PI) / 180;
            ctx.arc(entity.center.x, entity.center.y, entity.radius, startAngle, endAngle);
            ctx.stroke();
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (entity.vertices && entity.vertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(entity.vertices[0].x, entity.vertices[0].y);
            for (let i = 1; i < entity.vertices.length; i++) {
              ctx.lineTo(entity.vertices[i].x, entity.vertices[i].y);
            }
            // Close if needed
            if (entity.shape) {
              ctx.closePath();
            }
            ctx.stroke();
          }
          break;

        case 'SPLINE':
          // Simplified spline rendering (draw as polyline)
          if (entity.controlPoints && entity.controlPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(entity.controlPoints[0].x, entity.controlPoints[0].y);
            for (let i = 1; i < entity.controlPoints.length; i++) {
              ctx.lineTo(entity.controlPoints[i].x, entity.controlPoints[i].y);
            }
            ctx.stroke();
          }
          break;

        // Add more entity types as needed
        default:
          // Unsupported entity type - skip silently
          break;
      }
    } catch (err) {
      // Skip entities that fail to render
      console.warn('Failed to render entity:', entity.type, err);
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
          minHeight: 400
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

  if (!filePath) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          border: '2px dashed #ccc',
          borderRadius: 1
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Select a file to preview
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 400 }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: '#ffffff'
        }}
      />
      {dxfData && (
        <Box sx={{ mt: 1, display: 'flex', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
          <Typography variant="caption">
            Entities: {dxfData.entities?.length || 0}
          </Typography>
          <Typography variant="caption">
            Layers: {Object.keys(dxfData.tables?.layer?.layers || {}).length}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
