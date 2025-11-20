/**
 * TypeScript type definitions for DXF Converter
 */

// ============================================================================
// Basic Geometry Types
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
  z?: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type PointTuple = [number, number];

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// ============================================================================
// DXF Entity Types
// ============================================================================

export type DxfEntityType =
  | 'LINE'
  | 'CIRCLE'
  | 'ARC'
  | 'LWPOLYLINE'
  | 'POLYLINE'
  | 'ELLIPSE'
  | 'SPLINE';

export interface DxfEntityBase {
  type: DxfEntityType;
  handle?: string;
  layer?: string;
}

export interface DxfLineEntity extends DxfEntityBase {
  type: 'LINE';
  vertices: [Point2D, Point2D];
}

export interface DxfCircleEntity extends DxfEntityBase {
  type: 'CIRCLE';
  center: Point2D;
  radius: number;
}

export interface DxfArcEntity extends DxfEntityBase {
  type: 'ARC';
  center: Point2D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface DxfPolylineVertex extends Point2D {
  bulge?: number;
}

export interface DxfPolylineEntity extends DxfEntityBase {
  type: 'LWPOLYLINE' | 'POLYLINE';
  vertices: DxfPolylineVertex[];
  shape?: boolean;
  closed?: boolean;
}

export interface DxfEllipseEntity extends DxfEntityBase {
  type: 'ELLIPSE';
  center: Point2D;
  majorAxisEndPoint?: Point2D;
}

export interface DxfSplineEntity extends DxfEntityBase {
  type: 'SPLINE';
  degree?: number;
  controlPoints?: Point2D[];
  fitPoints?: Point2D[];
}

export type DxfEntity =
  | DxfLineEntity
  | DxfCircleEntity
  | DxfArcEntity
  | DxfPolylineEntity
  | DxfEllipseEntity
  | DxfSplineEntity;

// ============================================================================
// DXF Document Types
// ============================================================================

export interface DxfHeader {
  $ACADVER?: string;
  $INSUNITS?: number;
  $LIMMIN?: Point2D;
  $LIMMAX?: Point2D;
}

export interface DxfDocument {
  header?: DxfHeader;
  entities?: DxfEntity[];
  tables?: unknown;
  blocks?: unknown;
}

export interface DxfParseResult {
  success: boolean;
  data: DxfDocument | null;
  error: string | null;
}

export interface DxfHeaderInfo {
  version: string;
  units: number;
  drawingLimitsMin: Point2D;
  drawingLimitsMax: Point2D;
}

export interface DxfValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DxfEntityStats {
  total: number;
  byType: Record<string, number>;
  byLayer: Record<string, number>;
  closedShapes: number;
  openShapes: number;
}

// ============================================================================
// Contour Types
// ============================================================================

export interface Contour {
  entities: DxfEntity[];
  closed: boolean;
  single: boolean;
  boundingBox: BoundingBox;
  warning?: string | null;
}

export interface ContourValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ShapeWithHoles {
  exterior: Contour;
  holes: Contour[];
}

// ============================================================================
// Converter Options & Configuration
// ============================================================================

export interface DxfConverterOptions {
  /** Strip height in mm (default: 6000) */
  stripHeight?: number;
  /** Part spacing in mm (default: 5) */
  spacing?: number;
  /** Number of segments for arc/circle discretization (default: 32) */
  arcSegments?: number;
  /** Number of segments for spline discretization (default: 100) */
  splineSegments?: number;
  /** Point matching tolerance in mm (default: 0.1) */
  tolerance?: number;
  /** Automatically close open contours (default: true) */
  autoClose?: boolean;
  /** Allow rotations [0, 90, 180, 270] (default: true) */
  allowRotations?: boolean;
  /** Problem name for output (default: 'dxf_conversion') */
  problemName?: string;
}

export interface ConversionSettings {
  bin: {
    width: number | null;
    height: number;
  };
  spacing: number;
  arcSegments: number;
  splineSegments: number;
  allowRotations: boolean;
  rotationSteps: number;
  tolerance: number;
  autoClose: boolean;
  problemName?: string;
  stripHeight?: number;
}

// ============================================================================
// Output Types (sparroWASM Format)
// ============================================================================

export interface SparrowShape {
  type: 'simple_polygon';
  data: PointTuple[];
}

export interface SparrowItem {
  id: number;
  demand: number;
  dxf: string;
  allowed_orientations: number[];
  shape: SparrowShape;
}

export interface SparrowJson {
  name: string;
  items: SparrowItem[];
  strip_height: number;
}

export interface NestingInputShape {
  exterior: PointTuple[];
  interiors: PointTuple[][];
}

export interface NestingInputItem {
  id: number;
  quantity: number;
  shape: NestingInputShape;
  allowed_rotations: number[];
  metadata: {
    filename: string;
    originalEntityCount: number;
    contourCount: number;
    boundingBox: BoundingBox;
  };
}

// ============================================================================
// Conversion Result Types
// ============================================================================

export interface ConversionError {
  file: string;
  stage: string;
  message: string;
}

export interface ConversionWarning {
  file: string;
  message: string;
}

export interface ConversionStats {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalItems: number;
}

export interface ConversionResult {
  success: boolean;
  json: SparrowJson | null;
  errors: ConversionError[];
  warnings: ConversionWarning[];
  stats?: ConversionStats;
  message?: string;
}

export interface PolygonValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Input File Types
// ============================================================================

export interface DxfFileInput {
  name: string;
  content: string;
  quantity?: number;
}

export interface DxfFileWithQuantity {
  file: DxfFileInput;
  quantity: number;
}

// ============================================================================
// JSON Formatter Types
// ============================================================================

export interface JsonSizeInfo {
  bytes: number;
  kilobytes: number;
  formatted: string;
}

export interface JsonStats {
  itemCount: number;
  totalPoints: number;
  totalDemand: number;
  stripHeight: number;
  problemName?: string;
  fileSize?: JsonSizeInfo;
}
