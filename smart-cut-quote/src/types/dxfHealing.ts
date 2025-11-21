/**
 * DXF Healing System Type Definitions
 * For manual DXF file editing and validation
 */

export type DxfEntityType = 'LINE' | 'ARC' | 'CIRCLE' | 'POLYLINE' | 'LWPOLYLINE' | 'SPLINE';

export type DxfLayer = 'CUTTING' | 'BEND' | 'IGNORE' | string;

export type DxfTool = 'SELECT' | 'DELETE' | 'MERGE' | 'PAN';

export interface DxfVertex {
  x: number;
  y: number;
  z?: number;
}

export interface DxfEntityMetadata {
  closed: boolean;      // Is this a closed contour?
  length: number;       // Total length in mm
  area?: number;        // For closed contours (mm²)
}

export interface DxfEntity {
  id: string;
  type: DxfEntityType;
  layer: string;
  vertices: DxfVertex[];
  color: number;         // RGB color as hex number
  selected: boolean;
  metadata: DxfEntityMetadata;
}

export type ValidationIssueType =
  | 'OPEN_CONTOUR'
  | 'DUPLICATE_LINE'
  | 'ZERO_LENGTH'
  | 'SELF_INTERSECTING';

export type ValidationSeverity = 'ERROR' | 'WARNING';

export interface ValidationIssue {
  type: ValidationIssueType;
  entityIds: string[];
  severity: ValidationSeverity;
  message: string;
  autoFixable: boolean;
}

export interface ParsedDxf {
  entities: DxfEntity[];
  layers: string[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface DxfHealingSettings {
  snapTolerance: number;      // 0.1mm default
  maxHistorySize: number;     // 10 undo levels
  autoSaveOnExit: boolean;    // true
}
