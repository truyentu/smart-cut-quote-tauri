/**
 * DXF Viewer Component
 * Reads and renders DXF files on HTML5 canvas
 * Based on IMPLEMENTATION_PLAN.md section 7.2
 * Enhanced with metadata calculation (cutLength, pierceCount, area, dimensions)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Alert, Typography, IconButton, Tooltip } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { readTextFile } from '@tauri-apps/plugin-fs';
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

interface ViewportTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export default function DxfViewer({ filePath, fileId }: DxfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dxfData, setDxfData] = useState<any>(null);
  const updateFile = useQuoteStore((state) => state.updateFile);
  const renderRequestRef = useRef<number>(0);
  const loadRequestRef = useRef<number>(0);

  // Viewport state for pan and zoom
  const [viewport, setViewport] = useState<ViewportTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Effect to load and render DXF when filePath changes
  useEffect(() => {
    if (!filePath) {
      // Clear state when no file is selected
      setDxfData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Reset viewport when loading new file
    setViewport({ offsetX: 0, offsetY: 0, scale: 1 });

    // Increment request ID to invalidate previous requests
    const currentRequestId = ++loadRequestRef.current;

    loadAndRenderDxf(filePath, currentRequestId);

    // Cleanup function to cancel this request if component unmounts or filePath changes
    return () => {
      // Any in-flight request with ID < currentRequestId will be cancelled
    };
  }, [filePath]);

  // Effect to re-render when dxfData, viewport, or container size changes
  useEffect(() => {
    if (!dxfData) return;

    // Increment render ID for this specific dxfData instance
    const currentRenderRequestId = ++renderRequestRef.current;

    // Render immediately
    renderDxfToCanvas(dxfData, currentRenderRequestId);

    // Setup resize observer with request tracking
    const handleResize = () => {
      // Use the same render request ID for resize events of this dxfData instance
      renderDxfToCanvas(dxfData, currentRenderRequestId);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [dxfData, viewport]);

  const loadAndRenderDxf = async (path: string, requestId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Read DXF file content using Tauri API
      const content = await readTextFile(path);

      // Check if this request is still valid (not superseded by a newer request)
      if (loadRequestRef.current !== requestId) {
        console.log('Load request cancelled (superseded by newer request)');
        return;
      }

      // Parse DXF using dxf-parser
      const parser = new DxfParser();
      const dxf = parser.parseSync(content);

      if (!dxf) {
        throw new Error('Failed to parse DXF file');
      }

      // Check again before setting state
      if (loadRequestRef.current !== requestId) {
        console.log('Parse request cancelled (superseded by newer request)');
        return;
      }

      setDxfData(dxf);
      setLoading(false);

      // Calculate metadata (cutLength, pierceCount, etc.)
      if (fileId && dxf.entities) {
        const metadata = calculateMetadata(dxf.entities);
        const isClosed = validateClosedContours(dxf.entities);

        updateFile(fileId, {
          metadata,
          status: isClosed ? 'ok' : 'error'
        });
      }

      // Render to canvas (will be handled by the dxfData useEffect)
    } catch (err: any) {
      // Only set error if this request is still valid
      if (loadRequestRef.current === requestId) {
        console.error('Failed to load DXF:', err);
        setError(err.message || 'Failed to load DXF file');
        setLoading(false);
      }
    }
  };

  const validateClosedContours = (entities: any[]): boolean => {
    // Simple validation: check if entities form closed contours
    let hasOpenContours = false;

    entities.forEach((entity: any) => {
      switch (entity.type) {
        case 'CIRCLE':
          // Circles are always closed
          break;

        case 'ARC':
          // Arcs are open unless they form a complete circle
          if (entity.startAngle !== undefined && entity.endAngle !== undefined) {
            const angleDiff = Math.abs(entity.endAngle - entity.startAngle);
            if (angleDiff < 359) {
              hasOpenContours = true;
            }
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          // Check if polyline is closed
          if (!entity.shape) {
            // Not closed - check if first and last vertices are the same
            if (entity.vertices && entity.vertices.length > 2) {
              const first = entity.vertices[0];
              const last = entity.vertices[entity.vertices.length - 1];
              const distance = Math.sqrt(
                Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
              );
              // If distance > 0.1mm, consider it open
              if (distance > 0.1) {
                hasOpenContours = true;
              }
            } else {
              hasOpenContours = true;
            }
          }
          break;

        case 'LINE':
          // Individual lines are considered open (unless they're part of a closed path)
          // For simplicity, we'll mark them as potentially open
          hasOpenContours = true;
          break;

        default:
          // Unknown entity types are considered OK
          break;
      }
    });

    // Return true if all contours are closed (no open contours found)
    return !hasOpenContours;
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

  const renderDxfToCanvas = (dxf: any, renderRequestId: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Check if this render is still valid (not superseded by newer render request)
    if (renderRequestRef.current !== renderRequestId) {
      console.log('Render request cancelled (superseded by newer request)');
      return;
    }

    // Set canvas dimensions from container (prevents distortion)
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) return;

    // Set canvas actual size (NOT CSS size)
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CRITICAL: Reset transformation matrix to prevent corruption from previous renders
    // This ensures each render starts with a clean slate
    ctx.setTransform(1, 0, 0, 1, 0, 0);

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

    // Calculate drawing dimensions
    const drawingWidth = bounds.maxX - bounds.minX;
    const drawingHeight = bounds.maxY - bounds.minY;

    if (drawingWidth === 0 || drawingHeight === 0) {
      console.warn('Invalid drawing dimensions:', drawingWidth, drawingHeight);
      return;
    }

    // Setup viewport transform with aspect ratio preservation
    const padding = 50;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;

    // Calculate base scale to fit drawing while preserving aspect ratio
    const scaleX = availableWidth / drawingWidth;
    const scaleY = availableHeight / drawingHeight;
    const baseScale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave margin

    // Validate base scale to prevent NaN or Infinity corruption
    if (!isFinite(baseScale) || baseScale <= 0) {
      console.warn('Invalid scale calculated:', baseScale, 'bounds:', bounds);
      return;
    }

    // Apply user zoom
    const finalScale = baseScale * viewport.scale;

    // Center the drawing
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Validate center coordinates
    if (!isFinite(centerX) || !isFinite(centerY)) {
      console.warn('Invalid center coordinates:', centerX, centerY);
      return;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(viewport.offsetX, viewport.offsetY); // Apply pan offset
    ctx.scale(finalScale, -finalScale); // Flip Y axis (DXF uses bottom-up), apply zoom
    ctx.translate(-centerX, -centerY);

    // Draw entities
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 / finalScale;

    dxf.entities.forEach((entity: any) => {
      drawEntity(ctx, entity, finalScale);
    });

    ctx.restore();
  };

  const calculateBounds = (entities: any[]): Bounds => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };

    entities.forEach((entity: any) => {
      try {
        switch (entity.type) {
          case 'LINE':
            if (entity.vertices && entity.vertices.length >= 2) {
              entity.vertices.forEach((v: any) => updateBounds(v.x, v.y));
            }
            break;

          case 'CIRCLE':
            if (entity.center && entity.radius) {
              updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
              updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
            }
            break;

          case 'ARC':
            if (entity.center && entity.radius) {
              // Calculate actual arc bounds
              const { center, radius, startAngle, endAngle } = entity;
              const start = (startAngle * Math.PI) / 180;
              const end = (endAngle * Math.PI) / 180;

              // Check if arc crosses quadrant boundaries
              updateBounds(center.x + radius * Math.cos(start), center.y + radius * Math.sin(start));
              updateBounds(center.x + radius * Math.cos(end), center.y + radius * Math.sin(end));

              // Check quadrant boundaries (0, 90, 180, 270 degrees)
              [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach(angle => {
                if ((start <= angle && angle <= end) || (start > end && (angle >= start || angle <= end))) {
                  updateBounds(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));
                }
              });
            }
            break;

          case 'LWPOLYLINE':
          case 'POLYLINE':
            if (entity.vertices) {
              entity.vertices.forEach((v: any) => updateBounds(v.x, v.y));
            }
            break;

          case 'SPLINE':
            if (entity.controlPoints) {
              entity.controlPoints.forEach((v: any) => updateBounds(v.x, v.y));
            }
            if (entity.fitPoints) {
              entity.fitPoints.forEach((v: any) => updateBounds(v.x, v.y));
            }
            break;

          case 'ELLIPSE':
            if (entity.center && entity.majorAxisEndPoint) {
              const { center, majorAxisEndPoint, axisRatio } = entity;
              const majorRadius = Math.sqrt(majorAxisEndPoint.x ** 2 + majorAxisEndPoint.y ** 2);
              const minorRadius = majorRadius * (axisRatio || 1);

              // Approximate ellipse bounds
              updateBounds(center.x - majorRadius, center.y - minorRadius);
              updateBounds(center.x + majorRadius, center.y + minorRadius);
            }
            break;

          case 'TEXT':
          case 'MTEXT':
            if (entity.startPoint) {
              updateBounds(entity.startPoint.x, entity.startPoint.y);
              // Approximate text bounds
              const height = entity.textHeight || 10;
              const width = (entity.text?.length || 1) * height * 0.6;
              updateBounds(entity.startPoint.x + width, entity.startPoint.y + height);
            }
            break;
        }
      } catch (err) {
        console.warn('Error calculating bounds for entity:', entity.type, err);
      }
    });

    // Fallback if no valid bounds found
    if (!isFinite(minX)) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    // Add small padding to bounds
    const padding = Math.max((maxX - minX), (maxY - minY)) * 0.01;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding
    };
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
      // Set color based on entity color (if available)
      const strokeColor = (entity.color !== undefined && entity.color !== null)
        ? getColorFromIndex(entity.color)
        : '#000000';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 0.5 / scale;

      // Set fill color for closed shapes
      ctx.fillStyle = '#CCCCCC';

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
            ctx.fill();
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
            const firstVertex = entity.vertices[0];
            ctx.moveTo(firstVertex.x, firstVertex.y);

            for (let i = 0; i < entity.vertices.length - 1; i++) {
              const v0 = entity.vertices[i];
              const v1 = entity.vertices[i + 1];

              // Check for bulge (arc segment in polyline)
              if (v0.bulge !== undefined && v0.bulge !== 0) {
                drawBulge(ctx, v0, v1, v0.bulge);
              } else {
                ctx.lineTo(v1.x, v1.y);
              }
            }

            // Close if needed
            const isClosed = entity.shape || entity.closed;
            if (isClosed) {
              // Handle closing segment with bulge
              const lastVertex = entity.vertices[entity.vertices.length - 1];
              if (lastVertex.bulge !== undefined && lastVertex.bulge !== 0) {
                drawBulge(ctx, lastVertex, firstVertex, lastVertex.bulge);
              }
              ctx.closePath();
              ctx.fill();
            }

            ctx.stroke();
          }
          break;

        case 'SPLINE':
          // Use fit points if available, otherwise use control points
          const points = entity.fitPoints || entity.controlPoints;
          if (points && points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            if (points.length === 2) {
              // Simple line
              ctx.lineTo(points[1].x, points[1].y);
            } else if (points.length > 2) {
              // Approximate spline with quadratic curves
              for (let i = 0; i < points.length - 2; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const p2 = points[i + 2];

                // Use p1 as control point
                const cpX = p1.x;
                const cpY = p1.y;
                const endX = (p1.x + p2.x) / 2;
                const endY = (p1.y + p2.y) / 2;

                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
              }

              // Draw final segment
              const last = points[points.length - 1];
              const secondLast = points[points.length - 2];
              ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
            }

            ctx.stroke();
          }
          break;

        case 'ELLIPSE':
          if (entity.center && entity.majorAxisEndPoint) {
            const { center, majorAxisEndPoint, axisRatio, startAngle, endAngle } = entity;

            // Calculate major and minor radii
            const majorRadius = Math.sqrt(majorAxisEndPoint.x ** 2 + majorAxisEndPoint.y ** 2);
            const minorRadius = majorRadius * (axisRatio || 1);

            // Calculate rotation angle
            const rotation = Math.atan2(majorAxisEndPoint.y, majorAxisEndPoint.x);

            ctx.beginPath();
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(rotation);

            // Draw full ellipse or arc
            const isFullEllipse = startAngle === undefined || endAngle === undefined;
            if (isFullEllipse) {
              ctx.ellipse(0, 0, majorRadius, minorRadius, 0, 0, Math.PI * 2);
            } else {
              ctx.ellipse(0, 0, majorRadius, minorRadius, 0, startAngle, endAngle);
            }

            ctx.restore();

            // Fill only if it's a full ellipse
            if (isFullEllipse) {
              ctx.fill();
            }
            ctx.stroke();
          }
          break;

        case 'TEXT':
        case 'MTEXT':
          if (entity.startPoint && entity.text) {
            ctx.save();

            // Set text properties
            const height = (entity.textHeight || 10) * Math.abs(scale);
            ctx.font = `${height}px Arial`;
            ctx.fillStyle = ctx.strokeStyle;

            // Handle rotation
            if (entity.rotation) {
              ctx.save();
              ctx.translate(entity.startPoint.x, entity.startPoint.y);
              ctx.rotate(-entity.rotation * Math.PI / 180); // Negative because Y is flipped
              ctx.scale(1, -1); // Flip text back
              ctx.fillText(entity.text, 0, 0);
              ctx.restore();
            } else {
              ctx.scale(1, -1); // Flip text
              ctx.fillText(entity.text, entity.startPoint.x, -entity.startPoint.y);
            }

            ctx.restore();
          }
          break;

        case 'POINT':
          if (entity.position) {
            const pointSize = 2 / scale;
            ctx.beginPath();
            ctx.arc(entity.position.x, entity.position.y, pointSize, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case 'INSERT':
          // Block insert - would need block definition to render properly
          // Skip for now
          break;

        default:
          // Log unsupported types for debugging
          if (entity.type) {
            console.debug('Unsupported entity type:', entity.type);
          }
          break;
      }
    } catch (err) {
      console.warn('Failed to render entity:', entity.type, err);
    }
  };

  // Helper function to draw arc segment defined by bulge
  const drawBulge = (ctx: CanvasRenderingContext2D, v0: any, v1: any, bulge: number) => {
    const angle = Math.atan(bulge) * 4;
    const radius = Math.sqrt((v1.x - v0.x) ** 2 + (v1.y - v0.y) ** 2) / (2 * Math.sin(angle / 2));
    const centerAngle = Math.atan2(v1.y - v0.y, v1.x - v0.x) + (Math.PI / 2 - angle / 2);

    const centerX = v0.x + radius * Math.cos(centerAngle);
    const centerY = v0.y + radius * Math.sin(centerAngle);

    const startAngle = Math.atan2(v0.y - centerY, v0.x - centerX);
    const endAngle = Math.atan2(v1.y - centerY, v1.x - centerX);

    ctx.arc(centerX, centerY, Math.abs(radius), startAngle, endAngle, bulge < 0);
  };

  // Helper function to get color from AutoCAD color index
  const getColorFromIndex = (colorIndex: number): string => {
    // AutoCAD standard colors (simplified)
    const colors: { [key: number]: string } = {
      0: '#000000', // ByBlock
      1: '#FF0000', // Red
      2: '#FFFF00', // Yellow
      3: '#00FF00', // Green
      4: '#00FFFF', // Cyan
      5: '#0000FF', // Blue
      6: '#FF00FF', // Magenta
      7: '#FFFFFF', // White/Black
      8: '#808080', // Gray
      9: '#C0C0C0', // Light Gray
    };

    return colors[colorIndex] || '#000000';
  };

  // Mouse wheel handler for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = viewport.scale * zoomFactor;

    // Limit zoom range
    if (newScale < 0.1 || newScale > 10) return;

    setViewport(prev => ({
      ...prev,
      scale: newScale
    }));
  };

  // Mouse down handler - start panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPanning.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  };

  // Mouse move handler - pan the view
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning.current) return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setViewport(prev => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY
    }));
  };

  // Mouse up handler - stop panning
  const handleMouseUp = () => {
    isPanning.current = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  // Mouse leave handler - stop panning if mouse leaves canvas
  const handleMouseLeave = () => {
    isPanning.current = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  // Reset view to default
  const handleResetView = () => {
    setViewport({ offsetX: 0, offsetY: 0, scale: 1 });
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
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        ref={containerRef}
        sx={{
          flexGrow: 1,
          position: 'relative',
          minHeight: 400,
          width: '100%'
        }}
      >
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: 'grab'
          }}
        />
      </Box>
      {dxfData && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
            <Typography variant="caption">
              Entities: {dxfData.entities?.length || 0}
            </Typography>
            <Typography variant="caption">
              Layers: {Object.keys(dxfData.tables?.layer?.layers || {}).length}
            </Typography>
            <Typography variant="caption">
              Zoom: {(viewport.scale * 100).toFixed(0)}%
            </Typography>
          </Box>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={handleResetView}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
