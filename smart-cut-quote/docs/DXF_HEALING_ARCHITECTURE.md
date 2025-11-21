# DXF Healing Editor - Architecture Design
**Phase 0 Day 3-4: Component & State Architecture**
**Date**: 2025-11-21
**Project**: SmartCut Quote - Custom DXF Editor

---

## System Overview

```
┌────────────────────────────────────────────────────────────┐
│                    FileUpload.tsx                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FileListGrid                                         │  │
│  │  - Displays uploaded DXF files                        │  │
│  │  - Shows validation status (✓ Valid / ⚠️ Needs Fix)   │  │
│  │  - Click "Fix" button → Opens DxfHealingDialog        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                           ↓
                    Click "Fix File"
                           ↓
┌────────────────────────────────────────────────────────────┐
│          DxfHealingDialog (Full Screen)                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Toolbar: [Select] [Delete] [Merge] [Layer] [Undo/Redo]│ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌─────────────┬──────────────────────────────────────────┐ │
│ │  Sidebar    │      Canvas (Three.js Renderer)          │ │
│ │             │  ┌────────────────────────────────────┐  │ │
│ │ Layers:     │  │                                    │  │ │
│ │ ☑ CUTTING   │  │    [DXF Geometry Rendered]         │  │ │
│ │ ☑ BEND      │  │                                    │  │ │
│ │ ☐ IGNORE    │  │    - Red: Open contours            │  │ │
│ │             │  │    - Blue: Closed contours         │  │ │
│ │ Entities:   │  │    - Yellow: Selected              │  │ │
│ │ • Line 1    │  │    - Green snap circles: 0.1mm     │  │ │
│ │ • Line 2    │  │                                    │  │ │
│ │ • Arc 3     │  │    Pan: Space + Drag               │  │ │
│ │   ...       │  │    Zoom: Mouse Wheel               │  │ │
│ │             │  └────────────────────────────────────┘  │ │
│ │ Properties: │                                          │ │
│ │ Type: LINE  │                                          │ │
│ │ Layer: CUT  │                                          │ │
│ │ Start: x,y  │                                          │ │
│ │ End: x,y    │                                          │ │
│ └─────────────┴──────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Status: "2 open contours found • Select endpoints..."  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│           [Cancel]  [Save & Close]                         │
└────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
DxfHealingDialog (Container)
├── DxfToolbar (Tools & Actions)
│   ├── ToolButton (Select)
│   ├── ToolButton (Delete)
│   ├── ToolButton (Merge Endpoints)
│   ├── LayerMenu (Change Layer)
│   ├── UndoButton
│   └── RedoButton
├── DxfSidebar (Entity Inspector)
│   ├── LayerList (Toggle visibility)
│   ├── EntityList (All DXF entities)
│   └── PropertyPanel (Selected entity details)
├── DxfCanvas (Three.js Renderer)
│   ├── ThreeScene (WebGL scene)
│   ├── SelectionBox (Drag-to-select)
│   ├── SnapIndicator (Green circles for merge points)
│   └── ValidationOverlay (Red highlights for errors)
└── DxfStatusBar (Instructions & Messages)
```

---

## State Management (Zustand Store)

### `dxfHealingStore.ts`

```typescript
interface DxfEntity {
  id: string;
  type: 'LINE' | 'ARC' | 'CIRCLE' | 'POLYLINE' | 'SPLINE';
  layer: string; // 'CUTTING', 'BEND', 'IGNORE', or original layer name
  vertices: { x: number; y: number; z?: number }[];
  color: number; // RGB color
  selected: boolean;
  metadata: {
    closed: boolean; // Is this a closed contour?
    length: number;  // Total length in mm
    area?: number;   // For closed contours
  };
}

interface ValidationIssue {
  type: 'OPEN_CONTOUR' | 'DUPLICATE_LINE' | 'ZERO_LENGTH';
  entityIds: string[];
  severity: 'ERROR' | 'WARNING';
  message: string;
  autoFixable: boolean;
}

interface DxfHealingState {
  // File data
  filePath: string;
  fileName: string;
  originalDxfContent: string;

  // Entities
  entities: DxfEntity[];
  selectedEntityIds: string[];

  // Validation
  validationIssues: ValidationIssue[];

  // View state
  visibleLayers: Set<string>;
  snapTolerance: number; // 0.1mm default

  // Tool state
  activeTool: 'SELECT' | 'DELETE' | 'MERGE' | 'PAN';

  // Undo/Redo
  history: DxfEntity[][];
  historyIndex: number;
  maxHistorySize: number; // 10 default

  // Actions
  loadDxf: (filePath: string) => Promise<void>;
  validateEntities: () => void;
  selectEntity: (id: string, multiSelect?: boolean) => void;
  deleteSelected: () => void;
  mergeEndpoints: (id1: string, id2: string) => void;
  changeLayer: (entityIds: string[], layer: string) => void;
  toggleLayerVisibility: (layer: string) => void;
  undo: () => void;
  redo: () => void;
  saveDxf: () => Promise<void>;
  reset: () => void;
}
```

---

## Data Flow Diagrams

### 1. Load DXF File

```
User clicks "Fix File" in FileListGrid
           ↓
DxfHealingDialog opens (fullScreen)
           ↓
loadDxf(filePath) action triggered
           ↓
┌─────────────────────────────────────────┐
│ 1. Read file from disk (Tauri command) │
│    await invoke('read_dxf_file', {path})│
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 2. Parse DXF to entities                │
│    import DxfParser from 'dxf-parser'   │
│    const parser = new DxfParser()       │
│    const dxf = parser.parseSync(content)│
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 3. Convert to internal format           │
│    entities = dxf.entities.map(e => ({  │
│      id: uuid(),                        │
│      type: e.type,                      │
│      layer: e.layer || 'CUTTING',       │
│      vertices: extractVertices(e),      │
│      color: e.color || 0xffffff,        │
│      selected: false,                   │
│      metadata: calculateMetadata(e)     │
│    }))                                  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 4. Validate entities                    │
│    validateEntities()                   │
│    - Detect open contours               │
│    - Find duplicate lines               │
│    - Check zero-length entities         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 5. Render to Three.js canvas            │
│    createThreeObjects(entities)         │
│    - Red lines: Open contours           │
│    - Blue lines: Closed contours        │
│    - Snap points: Green circles         │
└─────────────────────────────────────────┘
           ↓
Ready for user editing
```

### 2. Merge Endpoints Workflow

```
User selects Tool: "Merge Endpoints"
           ↓
activeTool = 'MERGE'
           ↓
User clicks first endpoint (Line A endpoint)
           ↓
┌─────────────────────────────────────────┐
│ Find nearest endpoint within 0.1mm      │
│ - Highlight in yellow (hover feedback)  │
│ - Show snap circle (green)              │
└─────────────────────────────────────────┘
           ↓
User clicks second endpoint (Line B endpoint)
           ↓
┌─────────────────────────────────────────┐
│ Calculate distance between endpoints    │
│ distance = sqrt((x2-x1)² + (y2-y1)²)    │
└─────────────────────────────────────────┘
           ↓
        distance <= 0.1mm?
           ↓
      YES ↓       ↓ NO
           ↓       └─→ Show error: "Endpoints too far apart"
┌─────────────────────────────────────────┐
│ Merge endpoints                         │
│ 1. Save to undo stack                   │
│ 2. Snap endpoint A to endpoint B        │
│    vertices[idx] = { x: B.x, y: B.y }   │
│ 3. Recalculate metadata (closed? area?) │
│ 4. Re-render canvas                     │
│ 5. Re-validate (issue fixed?)           │
└─────────────────────────────────────────┘
           ↓
Show status: "Endpoints merged ✓"
```

### 3. Save DXF File

```
User clicks "Save & Close"
           ↓
saveDxf() action triggered
           ↓
┌─────────────────────────────────────────┐
│ 1. Convert entities to DXF format       │
│    import DxfWriter from 'dxf-writer'   │
│    const dxf = new DxfWriter()          │
│                                         │
│    entities.forEach(e => {              │
│      dxf.setLayer(e.layer)              │
│      dxf.setColor(e.color)              │
│                                         │
│      if (e.type === 'LINE') {           │
│        dxf.drawLine(                    │
│          e.vertices[0],                 │
│          e.vertices[1]                  │
│        )                                │
│      } else if (e.type === 'POLYLINE') {│
│        dxf.drawPolyline(e.vertices)     │
│      }                                  │
│      // ... other types                 │
│    })                                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 2. Generate DXF string                  │
│    const dxfString = dxf.toDxfString()  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 3. Write to original file path          │
│    await invoke('write_dxf_file', {     │
│      path: filePath,                    │
│      content: dxfString                 │
│    })                                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 4. Update QuoteStore file status        │
│    updateFileStatus(fileId, 'valid')    │
└─────────────────────────────────────────┘
           ↓
Close dialog, return to FileUpload page
```

---

## API Interfaces

### Tauri Commands (Rust Backend)

```rust
// src-tauri/src/lib.rs

#[tauri::command]
async fn read_dxf_file(path: String) -> Result<String, String> {
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read DXF file: {}", e)),
    }
}

#[tauri::command]
async fn write_dxf_file(path: String, content: String) -> Result<(), String> {
    match std::fs::write(&path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write DXF file: {}", e)),
    }
}

#[tauri::command]
async fn validate_dxf_file(path: String) -> Result<ValidationReport, String> {
    // Quick validation without full parse
    // Returns: { valid: bool, issues: [{ type, message }] }
    // Used in FileUpload page to show red/green status
}
```

### DXF Parser Interface

```typescript
// src/services/dxfParserService.ts

import DxfParser from 'dxf-parser';

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

export async function parseDxfFile(filePath: string): Promise<ParsedDxf> {
  // 1. Read file via Tauri
  const content = await invoke<string>('read_dxf_file', { path: filePath });

  // 2. Parse with dxf-parser
  const parser = new DxfParser();
  const dxf = parser.parseSync(content);

  // 3. Extract entities
  const entities: DxfEntity[] = dxf.entities.map(entity => ({
    id: generateId(),
    type: entity.type,
    layer: entity.layer || 'CUTTING',
    vertices: extractVertices(entity),
    color: entity.color || 0xffffff,
    selected: false,
    metadata: {
      closed: isClosedContour(entity),
      length: calculateLength(entity),
      area: isClosedContour(entity) ? calculateArea(entity) : undefined,
    },
  }));

  // 4. Extract unique layers
  const layers = [...new Set(entities.map(e => e.layer))];

  // 5. Calculate bounds for camera setup
  const bounds = calculateBounds(entities);

  return { entities, layers, bounds };
}

function extractVertices(entity: any): { x: number; y: number }[] {
  switch (entity.type) {
    case 'LINE':
      return [
        { x: entity.vertices[0].x, y: entity.vertices[0].y },
        { x: entity.vertices[1].x, y: entity.vertices[1].y },
      ];

    case 'POLYLINE':
    case 'LWPOLYLINE':
      return entity.vertices.map(v => ({ x: v.x, y: v.y }));

    case 'ARC':
      // Convert arc to polyline vertices (sample points)
      return sampleArc(entity.center, entity.radius, entity.startAngle, entity.endAngle);

    case 'CIRCLE':
      // Convert circle to polyline vertices
      return sampleCircle(entity.center, entity.radius);

    case 'SPLINE':
      // Convert spline to polyline vertices (tessellate)
      return tessellateSpline(entity.controlPoints, entity.degree);

    default:
      console.warn(`Unsupported entity type: ${entity.type}`);
      return [];
  }
}

function isClosedContour(entity: any): boolean {
  if (entity.type === 'CIRCLE') return true;

  if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
    if (entity.shape) return true; // DXF closed flag

    // Check if first and last vertex are same
    const first = entity.vertices[0];
    const last = entity.vertices[entity.vertices.length - 1];
    const distance = Math.sqrt(
      Math.pow(last.x - first.x, 2) +
      Math.pow(last.y - first.y, 2)
    );
    return distance < 0.001; // 1 micron tolerance
  }

  return false;
}
```

### DXF Writer Interface

```typescript
// src/services/dxfWriterService.ts

import DxfWriter from 'dxf-writer';

export async function writeDxfFile(
  filePath: string,
  entities: DxfEntity[]
): Promise<void> {
  const dxf = new DxfWriter();

  // Group entities by layer
  const layerGroups = groupBy(entities, e => e.layer);

  // Write each layer
  for (const [layerName, layerEntities] of Object.entries(layerGroups)) {
    dxf.addLayer(layerName, DxfWriter.ACI.WHITE, 'CONTINUOUS');

    layerEntities.forEach(entity => {
      dxf.setActiveLayer(layerName);
      dxf.setColorByBlock();

      switch (entity.type) {
        case 'LINE':
          dxf.drawLine(entity.vertices[0].x, entity.vertices[0].y,
                       entity.vertices[1].x, entity.vertices[1].y);
          break;

        case 'POLYLINE':
          const points = entity.vertices.map(v => [v.x, v.y]);
          dxf.drawPolyline(points);
          break;

        case 'ARC':
          // Convert vertices back to arc parameters
          const arcParams = verticesToArc(entity.vertices);
          dxf.drawArc(arcParams.center.x, arcParams.center.y,
                      arcParams.radius, arcParams.startAngle, arcParams.endAngle);
          break;

        case 'CIRCLE':
          const center = entity.vertices[0]; // Assume first vertex is center
          const radius = entity.metadata.length / (2 * Math.PI);
          dxf.drawCircle(center.x, center.y, radius);
          break;

        default:
          console.warn(`Cannot write entity type: ${entity.type}`);
      }
    });
  }

  const dxfString = dxf.toDxfString();
  await invoke('write_dxf_file', { path: filePath, content: dxfString });
}
```

### Validation Service

```typescript
// src/services/dxfValidationService.ts

export interface ValidationIssue {
  type: 'OPEN_CONTOUR' | 'DUPLICATE_LINE' | 'ZERO_LENGTH' | 'SELF_INTERSECTING';
  entityIds: string[];
  severity: 'ERROR' | 'WARNING';
  message: string;
  autoFixable: boolean;
}

export function validateEntities(entities: DxfEntity[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Check for open contours
  entities.forEach(entity => {
    if (entity.type === 'POLYLINE' && !entity.metadata.closed) {
      const first = entity.vertices[0];
      const last = entity.vertices[entity.vertices.length - 1];
      const gap = Math.sqrt(
        Math.pow(last.x - first.x, 2) +
        Math.pow(last.y - first.y, 2)
      );

      if (gap > 0.001) { // More than 1 micron
        issues.push({
          type: 'OPEN_CONTOUR',
          entityIds: [entity.id],
          severity: 'ERROR',
          message: `Open contour with ${gap.toFixed(2)}mm gap`,
          autoFixable: gap <= 0.1, // Can auto-merge if within snap tolerance
        });
      }
    }
  });

  // 2. Check for duplicate lines (same start/end points)
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (areEntitiesDuplicate(entities[i], entities[j])) {
        issues.push({
          type: 'DUPLICATE_LINE',
          entityIds: [entities[i].id, entities[j].id],
          severity: 'WARNING',
          message: 'Duplicate geometry detected',
          autoFixable: true,
        });
      }
    }
  }

  // 3. Check for zero-length entities
  entities.forEach(entity => {
    if (entity.metadata.length < 0.001) {
      issues.push({
        type: 'ZERO_LENGTH',
        entityIds: [entity.id],
        severity: 'WARNING',
        message: 'Zero-length entity',
        autoFixable: true, // Can auto-delete
      });
    }
  });

  // 4. Check for self-intersecting polylines
  entities.forEach(entity => {
    if (entity.type === 'POLYLINE' && hasSelfIntersection(entity.vertices)) {
      issues.push({
        type: 'SELF_INTERSECTING',
        entityIds: [entity.id],
        severity: 'WARNING',
        message: 'Self-intersecting polyline',
        autoFixable: false, // Requires manual fix
      });
    }
  });

  return issues;
}

function areEntitiesDuplicate(a: DxfEntity, b: DxfEntity): boolean {
  if (a.type !== b.type) return false;
  if (a.type !== 'LINE') return false; // Only check lines for now

  const a1 = a.vertices[0];
  const a2 = a.vertices[1];
  const b1 = b.vertices[0];
  const b2 = b.vertices[1];

  const tolerance = 0.001;

  // Same direction
  const sameDir =
    Math.abs(a1.x - b1.x) < tolerance &&
    Math.abs(a1.y - b1.y) < tolerance &&
    Math.abs(a2.x - b2.x) < tolerance &&
    Math.abs(a2.y - b2.y) < tolerance;

  // Reversed direction
  const revDir =
    Math.abs(a1.x - b2.x) < tolerance &&
    Math.abs(a1.y - b2.y) < tolerance &&
    Math.abs(a2.x - b1.x) < tolerance &&
    Math.abs(a2.y - b1.y) < tolerance;

  return sameDir || revDir;
}
```

---

## Three.js Rendering Architecture

### Scene Setup

```typescript
// src/components/DxfHealing/DxfCanvas.tsx

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function DxfCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Create orthographic camera (2D view)
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    const frustumSize = 1000; // 1000mm visible area
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      10000
    );
    camera.position.z = 1000;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls (pan/zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // 2D view only
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controlsRef.current = controls;

    // Add grid helper
    const gridHelper = new THREE.GridHelper(2000, 40, 0xcccccc, 0xeeeeee);
    gridHelper.rotation.x = Math.PI / 2; // Flat on XY plane
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      canvasRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
```

### Entity Rendering

```typescript
// src/services/threeRenderService.ts

export function createEntityMesh(entity: DxfEntity): THREE.Object3D {
  const group = new THREE.Group();
  group.userData = { entityId: entity.id };

  // Determine color based on state
  let color: number;
  if (entity.selected) {
    color = 0xffff00; // Yellow: Selected
  } else if (!entity.metadata.closed && entity.type === 'POLYLINE') {
    color = 0xff0000; // Red: Open contour (error)
  } else {
    color = entity.color || 0x0000ff; // Blue: Normal
  }

  const material = new THREE.LineBasicMaterial({
    color,
    linewidth: entity.selected ? 3 : 1,
  });

  // Create geometry from vertices
  const points = entity.vertices.map(v => new THREE.Vector3(v.x, v.y, 0));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const line = new THREE.Line(geometry, material);
  group.add(line);

  // Add endpoint markers for open contours
  if (!entity.metadata.closed && entity.type === 'POLYLINE') {
    const markerGeometry = new THREE.CircleGeometry(2, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Start point marker
    const startMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    startMarker.position.set(points[0].x, points[0].y, 0.1);
    group.add(startMarker);

    // End point marker
    const endMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    endMarker.position.set(points[points.length - 1].x, points[points.length - 1].y, 0.1);
    group.add(endMarker);
  }

  return group;
}

export function updateSceneWithEntities(
  scene: THREE.Scene,
  entities: DxfEntity[]
) {
  // Remove old entity meshes
  const oldMeshes = scene.children.filter(child => child.userData.entityId);
  oldMeshes.forEach(mesh => scene.remove(mesh));

  // Add new entity meshes
  entities.forEach(entity => {
    const mesh = createEntityMesh(entity);
    scene.add(mesh);
  });
}
```

---

## Hotkey Scheme

```typescript
// src/components/DxfHealing/useHotkeys.ts

export function useHotkeys() {
  const { activeTool, setActiveTool, deleteSelected, undo, redo } = useDxfHealingStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool selection
      if (e.key === 's' || e.key === 'S') {
        setActiveTool('SELECT');
      } else if (e.key === 'd' || e.key === 'D') {
        setActiveTool('DELETE');
      } else if (e.key === 'm' || e.key === 'M') {
        setActiveTool('MERGE');
      }

      // Actions
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }

      // Undo/Redo
      else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Pan mode (Space key)
      else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        setActiveTool('PAN');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setActiveTool('SELECT'); // Return to select mode
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, setActiveTool, deleteSelected, undo, redo]);
}
```

**Hotkey Summary**:
- **S**: Select tool
- **D**: Delete tool
- **M**: Merge endpoints tool
- **Delete/Backspace**: Delete selected entities
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Space**: Pan mode (hold to drag canvas)
- **Mouse Wheel**: Zoom in/out

---

## Undo/Redo Implementation

```typescript
// src/stores/dxfHealingStore.ts (undo/redo section)

interface DxfHealingState {
  history: DxfEntity[][];  // Stack of entity states
  historyIndex: number;     // Current position in history
  maxHistorySize: number;   // 10 levels

  // ... other state

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const useDxfHealingStore = create<DxfHealingState>((set, get) => ({
  history: [],
  historyIndex: -1,
  maxHistorySize: 10,

  pushHistory: () => {
    const { entities, history, historyIndex, maxHistorySize } = get();

    // Deep clone entities
    const snapshot = JSON.parse(JSON.stringify(entities));

    // Remove any history after current index (for redo invalidation)
    const newHistory = history.slice(0, historyIndex + 1);

    // Add new snapshot
    newHistory.push(snapshot);

    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();

    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      set({
        entities: JSON.parse(JSON.stringify(previousState)),
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        entities: JSON.parse(JSON.stringify(nextState)),
        historyIndex: historyIndex + 1,
      });
    }
  },

  // Actions that modify entities should call pushHistory first
  deleteSelected: () => {
    const { entities, selectedEntityIds, pushHistory } = get();

    pushHistory(); // Save current state

    const filtered = entities.filter(e => !selectedEntityIds.includes(e.id));
    set({ entities: filtered, selectedEntityIds: [] });
  },

  mergeEndpoints: (id1: string, id2: string) => {
    const { entities, pushHistory, snapTolerance } = get();

    const entity1 = entities.find(e => e.id === id1);
    const entity2 = entities.find(e => e.id === id2);

    if (!entity1 || !entity2) return;

    // Get endpoints
    const ep1 = entity1.vertices[entity1.vertices.length - 1];
    const ep2 = entity2.vertices[0];

    const distance = Math.sqrt(
      Math.pow(ep2.x - ep1.x, 2) +
      Math.pow(ep2.y - ep1.y, 2)
    );

    if (distance > snapTolerance) {
      // Show error toast
      return;
    }

    pushHistory(); // Save current state

    // Snap ep1 to ep2
    entity1.vertices[entity1.vertices.length - 1] = { ...ep2 };

    set({ entities: [...entities] });
  },
}));
```

---

## File Structure

```
src/
├── components/
│   └── DxfHealing/
│       ├── DxfHealingDialog.tsx      # Main container (fullScreen)
│       ├── DxfToolbar.tsx            # Tool buttons
│       ├── DxfSidebar.tsx            # Layer & entity list
│       ├── DxfCanvas.tsx             # Three.js renderer
│       ├── DxfStatusBar.tsx          # Status messages
│       ├── LayerList.tsx             # Layer visibility toggles
│       ├── EntityList.tsx            # Entity inspector
│       ├── PropertyPanel.tsx         # Selected entity details
│       ├── SnapIndicator.tsx         # Green snap circles
│       └── useHotkeys.ts             # Keyboard shortcuts hook
│
├── stores/
│   └── dxfHealingStore.ts            # Zustand state management
│
├── services/
│   ├── dxfParserService.ts           # Parse DXF to entities
│   ├── dxfWriterService.ts           # Write entities to DXF
│   ├── dxfValidationService.ts       # Detect issues
│   └── threeRenderService.ts         # Three.js rendering utils
│
└── types/
    └── dxfHealing.ts                 # TypeScript interfaces
```

---

## Next Steps (Phase 0 Day 5)

### Dev Environment Setup

1. **Install Dependencies**:
   ```bash
   npm install dxf-parser dxf-writer three @types/three
   npm install three/examples/jsm/controls/OrbitControls
   ```

2. **Create Folder Structure**:
   ```bash
   mkdir -p src/components/DxfHealing
   mkdir -p src/services
   touch src/stores/dxfHealingStore.ts
   touch src/types/dxfHealing.ts
   ```

3. **Add Tauri Commands**:
   - Update `src-tauri/src/lib.rs` with `read_dxf_file` and `write_dxf_file`
   - Update `src-tauri/capabilities/default.json` permissions

4. **Create Sample Test Files**:
   - `test_open_contour.dxf` (polyline with 5mm gap)
   - `test_bend_lines.dxf` (dashed lines mixed with solid)
   - `test_valid.dxf` (all closed contours)

---

**Architecture Completed**: 2025-11-21
**Next Phase**: Phase 0 Day 5 (Dev Environment Setup)
