# JSketcher Technical Feasibility Report
**Phase 0 Day 1-2: Research & Analysis**
**Date**: 2025-11-21
**Project**: SmartCut Quote - DXF Healing System

---

## Executive Summary

JSketcher is a browser-based parametric 2D/3D CAD modeler written in JavaScript/TypeScript with React. After thorough analysis, **JSketcher is technically feasible but NOT recommended** as the foundation for the DXF healing system due to:

1. **License Restrictions**: Dual license requiring commercial license for closed-source integration
2. **Bundle Size**: ~43 MB total size (5.02 MB + 36.3 MB WASM engine)
3. **Overkill Features**: Full parametric CAD with 3D modeling, constraints solver - far beyond our needs
4. **Integration Complexity**: Heavy WASM dependencies, complex build process

**RECOMMENDATION**: Use **lightweight DXF-focused libraries** instead:
- **dxf-parser** (MIT, 100KB) for reading DXF
- **dxf-writer** (MIT, 50KB) for writing DXF
- **Three.js** (MIT, ~600KB) for canvas rendering
- **Custom editor** for select/delete/merge/layer operations

This approach gives us full control, minimal bundle size (~1 MB total), and avoids licensing issues.

---

## JSketcher Analysis

### License Analysis

**License Type**: Dual License (Non-SPDX)
- **OpenSource License**: Requires derivative works to be open-sourced
- **Commercial License**: Available from xibyte.io for proprietary/closed systems

**Text from Repository**:
> "This software is distributed under dual license model:
> - OpenSource license: Changes must be shared back
> - Commercial license: For non-open systems, contact via website"

**Impact on SmartCut Quote**:
- ❌ **BLOCKER**: SmartCut Quote is a proprietary Tauri desktop app (not open source)
- ❌ **COST**: Requires purchasing commercial license from xibyte.io
- ❌ **RISK**: License terms may include revenue sharing or per-seat fees

**Verdict**: **NOT SUITABLE** without purchasing commercial license

---

### Bundle Size Impact

**Core Bundles**:
- `index.bundle.js`: 5.02 MiB
- `sketcher.bundle.js`: 1.57 MiB
- Total JavaScript: **~6.6 MB**

**WASM Engine**:
- `jsketcher-occ-engine`: **36.3 MB** (OpenCascade geometry kernel)

**Total Impact**: **~43 MB** added to application

**Current SmartCut Quote Size**: ~10 MB (estimated)
- After JSketcher: **~53 MB** (430% increase)

**Mitigations**:
- Code splitting (load editor only when needed)
- Lazy loading via dynamic import()
- WASM streaming compilation
- Compression (Brotli)

**Verdict**: **Acceptable IF needed**, but significant bloat for simple DXF editing

---

### DXF Support

**Import Capability**:
- ✅ DXF import exists (mentioned in Issue #67)
- ✅ Supports DXF dimensions and blocks
- ⚠️ **Unclear**: No official documentation on DXF import API

**Export Capability**:
- ✅ DWG export (similar format to DXF)
- ✅ STL, SVG export
- ⚠️ **Unclear**: Direct DXF export not explicitly mentioned

**Geometry Support**:
- Lines, arcs, circles, polylines
- Splines and ellipses
- Layers and blocks
- Dimensions and text

**Verdict**: **Likely sufficient** but requires testing to verify exact DXF entity support

---

### Technical Architecture

**Technology Stack**:
- **Language**: 64.2% JavaScript, 32.8% TypeScript
- **Framework**: React (internal use)
- **Rendering**: Canvas 2D + Three.js (WebGL)
- **Geometry Engine**: OpenCascade WASM (36.3 MB)
- **Build**: Webpack bundler

**Integration with Tauri + React**:
- ✅ Pure browser-based (no server needed)
- ✅ React compatibility (JSketcher uses React internally)
- ✅ WASM support in Tauri WebView
- ⚠️ **Challenge**: Managing large WASM files in Tauri asset pipeline

**Embedding Approach**:
```typescript
// Lazy load JSketcher when needed
const JSketcher = lazy(() => import('jsketcher'));

// Full-screen dialog
<Dialog fullScreen open={healingMode}>
  <Suspense fallback={<CircularProgress />}>
    <JSketcher
      dxfPath={selectedFile.path}
      onSave={(modifiedDxf) => saveDxf(modifiedDxf)}
      onClose={() => setHealingMode(false)}
    />
  </Suspense>
</Dialog>
```

**Verdict**: **Technically feasible** but complex integration

---

### Feature Completeness

**What JSketcher Provides**:
- ✅ Parametric constraint solver (coincident, parallel, tangent, distance, angle)
- ✅ 2D sketching tools (line, arc, circle, rectangle)
- ✅ 3D solid modeling (extrude, revolve, loft)
- ✅ Assembly constraints
- ✅ Dimensions and annotations
- ✅ Undo/Redo system
- ✅ Layer management

**What We Actually Need**:
- ✅ View DXF entities (lines, arcs, polylines)
- ✅ Select entities (click, drag-select)
- ✅ Delete entities (Delete key)
- ✅ Merge endpoints (snap tolerance 0.1mm)
- ✅ Change layer (mark as BEND, IGNORE, CUTTING)
- ✅ Pan/Zoom (Space+Drag, mouse wheel)
- ✅ Undo/Redo (10 levels)
- ✅ Save modified DXF

**Analysis**: JSketcher is **overkill** - we only need 10% of its features

---

### Maintenance & Community

**Activity Metrics**:
- **Commits**: 1,784 total
- **Contributors**: 5 active
- **Open Issues**: 37
- **Open PRs**: 7
- **Last Update**: Active (recent commits in 2024)

**Community**:
- Small but active community
- Responsive maintainer (xibyte)
- Limited documentation (mostly code examples)

**Risk Assessment**:
- ✅ Actively maintained (not abandoned)
- ⚠️ Small team (bus factor risk)
- ⚠️ Limited documentation (steep learning curve)

**Verdict**: **Moderate risk** - active but small community

---

## Alternative Approach: Lightweight Custom Editor

### Recommended Stack

**DXF Libraries**:
1. **dxf-parser** (MIT License, ~100 KB)
   - Parse DXF files to JSON entities
   - Supports lines, arcs, polylines, circles, splines
   - Handles layers, blocks, dimensions

2. **dxf-writer** (MIT License, ~50 KB)
   - Write DXF files from JSON entities
   - Maintains DXF structure and formatting

**Rendering**:
3. **Three.js** (MIT License, ~600 KB minified)
   - WebGL-based 2D/3D rendering
   - High performance for large files
   - Built-in camera controls (pan, zoom, rotate)

**UI Framework**:
4. **React + Material-UI** (Already in project, 0 KB additional)
   - Toolbar for tools (Select, Delete, Merge, Layer)
   - Sidebar for entity properties
   - Status bar for snap feedback

**State Management**:
5. **Zustand** (Already in project, 0 KB additional)
   - Undo/Redo stack (10 levels)
   - Selection state
   - Modified entities tracking

### Architecture Design

```
┌─────────────────────────────────────────────┐
│  DXF Healing Dialog (Full Screen)          │
├─────────────────────────────────────────────┤
│ Toolbar: [Select] [Delete] [Merge] [Layer] │
├──────────────────┬──────────────────────────┤
│   Entity List    │   Canvas (Three.js)      │
│   (Sidebar)      │   - Render DXF entities  │
│   - Layers       │   - Selection highlight  │
│   - Entities     │   - Snap indicators      │
│   - Properties   │   - Pan/Zoom controls    │
├──────────────────┴──────────────────────────┤
│ Status: "Select 2 endpoints to merge"       │
└─────────────────────────────────────────────┘
```

### Implementation Workflow

**Load DXF**:
```typescript
import DxfParser from 'dxf-parser';

const parser = new DxfParser();
const dxfContent = await readFile(filePath);
const parsed = parser.parseSync(dxfContent);

// Extract entities
const entities = parsed.entities.map(entity => ({
  id: generateId(),
  type: entity.type, // LINE, ARC, POLYLINE, CIRCLE
  layer: entity.layer,
  vertices: extractVertices(entity),
  color: entity.color,
  selected: false,
}));
```

**Render with Three.js**:
```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(...);
const renderer = new THREE.WebGLRenderer();

entities.forEach(entity => {
  const geometry = createGeometry(entity); // Convert DXF entity to Three.js
  const material = new THREE.LineBasicMaterial({
    color: entity.selected ? 0xff0000 : entity.color
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
});
```

**Merge Endpoints**:
```typescript
function mergeEndpoints(entity1, entity2, tolerance = 0.1) {
  const ep1 = entity1.vertices[entity1.vertices.length - 1];
  const ep2 = entity2.vertices[0];

  const distance = Math.sqrt(
    Math.pow(ep1.x - ep2.x, 2) +
    Math.pow(ep1.y - ep2.y, 2)
  );

  if (distance <= tolerance) {
    // Merge: snap ep1 to ep2
    entity1.vertices[entity1.vertices.length - 1] = ep2;
    return true;
  }
  return false;
}
```

**Save DXF**:
```typescript
import DxfWriter from 'dxf-writer';

const dxf = new DxfWriter();

entities.forEach(entity => {
  dxf.setLayer(entity.layer);

  if (entity.type === 'LINE') {
    dxf.drawLine(entity.vertices[0], entity.vertices[1]);
  } else if (entity.type === 'POLYLINE') {
    dxf.drawPolyline(entity.vertices);
  }
  // ... other entity types
});

const dxfString = dxf.toDxfString();
await writeFile(filePath, dxfString);
```

### Bundle Size Comparison

| Component | JSketcher | Custom Editor |
|-----------|-----------|---------------|
| DXF Parser | Included | 100 KB |
| DXF Writer | Included | 50 KB |
| Rendering | 36.3 MB WASM | 600 KB (Three.js) |
| CAD Logic | 6.6 MB | ~50 KB (custom) |
| **TOTAL** | **~43 MB** | **~1 MB** |

**Verdict**: Custom editor is **43x smaller**

---

## Risk Assessment

### JSketcher Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| **License cost** | 🔴 HIGH | Commercial license required | Purchase license or use alternative |
| **Bundle size** | 🟡 MEDIUM | 43 MB added to app | Code splitting, lazy loading |
| **Integration complexity** | 🟡 MEDIUM | WASM build, React integration | Thorough testing, POC |
| **Overkill features** | 🟢 LOW | Unused code increases size | Accept overhead or use alternative |
| **Documentation** | 🟡 MEDIUM | Limited docs, steep learning curve | Read source code, trial & error |
| **Maintenance** | 🟢 LOW | Small team but active | Monitor project health |

### Custom Editor Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| **Development time** | 🟡 MEDIUM | 6-8 weeks vs 2-3 weeks | Follow implementation plan |
| **DXF coverage** | 🟡 MEDIUM | May miss edge cases | Test with real client files |
| **Rendering performance** | 🟢 LOW | Three.js handles large files well | Optimize geometry batching |
| **Maintenance burden** | 🟢 LOW | Custom code requires upkeep | Clean architecture, tests |

---

## Final Recommendation

### ❌ DO NOT USE JSketcher

**Reasons**:
1. **License blocker**: Requires commercial license purchase
2. **Overkill**: 43 MB for features we don't need (parametric constraints, 3D modeling)
3. **Integration risk**: Complex WASM build, limited documentation

### ✅ BUILD CUSTOM EDITOR

**Reasons**:
1. **License freedom**: MIT-licensed dependencies (dxf-parser, dxf-writer, Three.js)
2. **Minimal footprint**: ~1 MB vs 43 MB (43x smaller)
3. **Full control**: Tailored exactly to DXF healing needs
4. **Maintainability**: Simple architecture, no WASM complexity

**Libraries**:
- `dxf-parser` (MIT, 100 KB) - Read DXF
- `dxf-writer` (MIT, 50 KB) - Write DXF
- `three` (MIT, 600 KB) - Render canvas
- `zustand` (MIT, already in project) - State management

**Estimated Timeline**: 6-8 weeks (per Phase 0-4 plan)

---

## Next Steps (Phase 0 Day 3-5)

### Day 3-4: Architecture Design
- [ ] Design component hierarchy (DxfHealingDialog, Canvas, Toolbar, Sidebar)
- [ ] Define state management schema (entities, selection, undo stack)
- [ ] Create data flow diagrams (load → parse → render → modify → save)
- [ ] Design API interfaces for DXF operations

### Day 5: Dev Environment Setup
- [ ] Install dependencies: `npm install dxf-parser dxf-writer three @types/three`
- [ ] Create `src/components/DxfHealing/` folder structure
- [ ] Set up Three.js canvas boilerplate
- [ ] Create sample DXF test files (open contours, bend lines)

---

**Report Completed**: 2025-11-21
**Approved By**: Pending user review
**Next Phase**: Phase 0 Day 3-5 (Architecture Design)
