/**
 * Thumbnail Service
 * Generate base64 thumbnails from DXF files for PDF export
 */

import { readTextFile } from '@tauri-apps/plugin-fs';
import DxfParser from 'dxf-parser';

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Generate a base64 PNG thumbnail from a DXF file
 * @param filePath - Path to the DXF file
 * @param size - Size of the thumbnail (square)
 * @returns Base64 data URL (data:image/png;base64,...)
 */
export async function generateDxfThumbnail(filePath: string, size: number = 80): Promise<string | null> {
  try {
    // Read DXF file
    const content = await readTextFile(filePath);

    // Parse DXF
    const parser = new DxfParser();
    const dxf = parser.parseSync(content);

    if (!dxf || !dxf.entities || dxf.entities.length === 0) {
      return null;
    }

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Calculate bounds
    const bounds = calculateBounds(dxf.entities);

    // Calculate scale to fit in canvas while maintaining aspect ratio
    const drawWidth = bounds.maxX - bounds.minX;
    const drawHeight = bounds.maxY - bounds.minY;

    if (drawWidth === 0 || drawHeight === 0) {
      return null;
    }

    // Add padding (10% on each side)
    const padding = size * 0.1;
    const availableSize = size - 2 * padding;

    // Calculate scale to fit
    const scaleX = availableSize / drawWidth;
    const scaleY = availableSize / drawHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate centering offsets
    const scaledWidth = drawWidth * scale;
    const scaledHeight = drawHeight * scale;
    const offsetX = padding + (availableSize - scaledWidth) / 2 - bounds.minX * scale;
    const offsetY = size - padding - (availableSize - scaledHeight) / 2 + bounds.minY * scale;

    // Set transform for proper coordinate system (Y-axis flip)
    ctx.setTransform(scale, 0, 0, -scale, offsetX, offsetY);

    // Set drawing style
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 / scale; // Scale line width to maintain visibility

    // Draw entities
    dxf.entities.forEach((entity: any) => {
      drawEntity(ctx, entity);
    });

    // Convert canvas to base64
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating thumbnail:', err);
    return null;
  }
}

function calculateBounds(entities: any[]): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  entities.forEach((entity) => {
    switch (entity.type) {
      case 'LINE':
        if (entity.vertices && entity.vertices.length >= 2) {
          const v1 = entity.vertices[0];
          const v2 = entity.vertices[1];
          minX = Math.min(minX, v1.x, v2.x);
          maxX = Math.max(maxX, v1.x, v2.x);
          minY = Math.min(minY, v1.y, v2.y);
          maxY = Math.max(maxY, v1.y, v2.y);
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

  // Fallback if no valid bounds
  if (!isFinite(minX)) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  }

  return { minX, maxX, minY, maxY };
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: any) {
  try {
    switch (entity.type) {
      case 'LINE':
        if (entity.vertices && entity.vertices.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(entity.vertices[0].x, entity.vertices[0].y);
          ctx.lineTo(entity.vertices[1].x, entity.vertices[1].y);
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
        if (entity.center && entity.radius) {
          const startAngle = (entity.startAngle * Math.PI) / 180;
          const endAngle = (entity.endAngle * Math.PI) / 180;
          ctx.beginPath();
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
          if (entity.shape) {
            ctx.closePath();
          }
          ctx.stroke();
        }
        break;
    }
  } catch (err) {
    // Silently ignore entity drawing errors
    console.warn('Error drawing entity:', entity.type, err);
  }
}

export default {
  generateDxfThumbnail,
};
