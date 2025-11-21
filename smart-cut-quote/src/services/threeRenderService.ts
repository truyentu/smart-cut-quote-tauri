/**
 * Three.js Rendering Service
 * Convert DXF entities to Three.js meshes for canvas display
 * Based on research from successful DXF viewers (three-dxf, dxf-viewer)
 */

import * as THREE from 'three';
import type { DxfEntity } from '../types/dxfHealing';

/**
 * Create Three.js mesh from DXF entity
 * @param entity - DXF entity to render
 * @returns Three.js Group containing line geometry and markers
 */
export function createEntityMesh(entity: DxfEntity): THREE.Group {
  const group = new THREE.Group();
  group.userData = { entityId: entity.id };
  group.renderOrder = 999; // CRITICAL: Set renderOrder to ensure entity renders above grid/axes

  // Determine color based on entity state
  const color = getEntityColor(entity);

  // Create line geometry (returns Group with line + boxes)
  const lineGroup = createLineGeometry(entity, color);

  // FLATTEN: Add line and boxes directly to outer group instead of nesting
  // NOTE: Use slice() to create a copy since add() removes from original parent
  const childrenToAdd = lineGroup.children.slice();
  console.log(`   lineGroup has ${lineGroup.children.length} children before flattening`);

  childrenToAdd.forEach((child, i) => {
    console.log(`   Adding child ${i}: ${child.type} at pos=(${child.position.x.toFixed(1)}, ${child.position.y.toFixed(1)}, ${child.position.z.toFixed(1)})`);
    group.add(child);
  });

  console.log(`   Flattened ${childrenToAdd.length} children. Outer group now has ${group.children.length} children`);

  // Add endpoint markers for open contours
  if (shouldShowEndpointMarkers(entity)) {
    const markers = createEndpointMarkers(entity);
    markers.forEach(marker => group.add(marker));
  }

  console.log(`📦 Group for entity ${entity.id.slice(0, 8)}: ${group.children.length} direct children (flattened)`);

  return group;
}

/**
 * Get color for entity based on its state
 */
function getEntityColor(entity: DxfEntity): number {
  // Selected: Yellow
  if (entity.selected) {
    console.log(`🎨 Entity ${entity.id.slice(0, 8)}: SELECTED → Yellow (0xffff00)`);
    return 0xffff00;
  }

  // Open contour (error): Red
  if (entity.type === 'POLYLINE' && !entity.metadata.closed) {
    console.log(`🎨 Entity ${entity.id.slice(0, 8)}: OPEN CONTOUR → Red (0xff0000)`);
    return 0xff0000;
  }

  // FORCE BLUE for visibility testing (entity.color is white 0xffffff)
  // Use bright blue (0x0000ff) instead of black for better visibility on gray background
  const finalColor = 0x0000ff; // Force blue for visibility
  console.log(`🎨 Entity ${entity.id.slice(0, 8)}: entity.color=0x${entity.color?.toString(16) || 'undefined'} → FORCED BLUE (0x0000ff)`);
  return finalColor;
}

/**
 * Create line geometry from entity vertices
 * Using THREE.Line with LineBasicMaterial (simple and effective for 2D CAD)
 * Based on research from three-dxf and dxf-viewer repositories
 * Returns a Group containing the line and debug points
 */
function createLineGeometry(entity: DxfEntity, color: number): THREE.Group {
  // Convert vertices to Vector3 array - USE Z=5 FOR TESTING (same as boxes)
  const points: THREE.Vector3[] = entity.vertices.map(v =>
    new THREE.Vector3(v.x, v.y, 5) // Z=5 to match boxes
  );

  console.log(`📐 Creating Line for entity ${entity.id.slice(0, 8)}:`);
  console.log(`   - ${points.length} vertices`);
  console.log(`   - First point: (${points[0]?.x.toFixed(1)}, ${points[0]?.y.toFixed(1)}, ${points[0]?.z})`);
  console.log(`   - Last point: (${points[points.length-1]?.x.toFixed(1)}, ${points[points.length-1]?.y.toFixed(1)}, ${points[points.length-1]?.z})`);
  console.log(`   - Color: 0x${color.toString(16)}`);

  // DEBUG: Log all vertices for circles (closed polylines)
  if (entity.type === 'POLYLINE' && entity.metadata.closed && points.length > 10) {
    console.log(`   🔍 CIRCLE DEBUG - All ${points.length} vertices:`);
    points.slice(0, 5).forEach((p, i) => {
      console.log(`      [${i}]: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z})`);
    });
    console.log(`      ... (${points.length - 10} more) ...`);
    points.slice(-5).forEach((p, i) => {
      console.log(`      [${points.length - 5 + i}]: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z})`);
    });
  }

  // Create BufferGeometry from points
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  // Create LineBasicMaterial
  // TEMP: Force MAGENTA color for visibility testing
  const material = new THREE.LineBasicMaterial({
    color: 0xff00ff, // MAGENTA - impossible to miss!
    linewidth: 1, // WebGL only supports linewidth: 1
    depthTest: false, // Render on top of everything
    depthWrite: false // Don't write to depth buffer
  });

  // Create Line
  const line = new THREE.Line(geometry, material);

  // Set render order to draw on top
  line.renderOrder = 999;

  console.log(`   - Line created: visible=${line.visible}, renderOrder=${line.renderOrder}`);

  // DEBUG: Add LARGE BOX meshes at first/last vertices (very visible!)
  const group = new THREE.Group();
  group.add(line);

  // Add LARGE RED/GREEN BOXES at first and last vertex
  if (points.length >= 2) {
    const boxSize = 50; // 50mm box - HUGE, IMPOSSIBLE TO MISS!

    // CRITICAL: Create SEPARATE geometry for each box!
    // Sharing geometry causes only the last mesh to render
    const boxGeometry1 = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxGeometry2 = new THREE.BoxGeometry(boxSize, boxSize, boxSize);

    const redMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // RED
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });
    const greenMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // GREEN
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });

    // First vertex box (RED) - uses boxGeometry1
    const box1 = new THREE.Mesh(boxGeometry1, redMaterial);
    box1.position.set(points[0].x, points[0].y, 5); // Z=5 (much higher than entities at Z=0.15)
    box1.renderOrder = 1001;
    group.add(box1);

    // Last vertex box (GREEN) - uses boxGeometry2
    const box2 = new THREE.Mesh(boxGeometry2, greenMaterial);
    box2.position.set(points[points.length - 1].x, points[points.length - 1].y, 5); // Z=5
    box2.renderOrder = 1001;
    group.add(box2);

    console.log(`   - DEBUG: Added RED box at (${points[0].x.toFixed(1)}, ${points[0].y.toFixed(1)})`);
    console.log(`   - DEBUG: Added GREEN box at (${points[points.length - 1].x.toFixed(1)}, ${points[points.length - 1].y.toFixed(1)})`);
  }

  // CRITICAL: Set renderOrder on GROUP, not just children!
  group.renderOrder = 999;

  console.log(`   - Group has ${group.children.length} children (1 line + ${group.children.length - 1} boxes), renderOrder=${group.renderOrder}`);

  return group;
}

/**
 * Check if entity should show endpoint markers
 */
function shouldShowEndpointMarkers(entity: DxfEntity): boolean {
  // Only show markers for open polylines
  return entity.type === 'POLYLINE' && !entity.metadata.closed;
}

/**
 * Create endpoint markers for open contours
 */
function createEndpointMarkers(entity: DxfEntity): THREE.Mesh[] {
  const markers: THREE.Mesh[] = [];

  if (entity.vertices.length === 0) {
    return markers;
  }

  const markerGeometry = new THREE.CircleGeometry(2, 16);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  // Start point marker
  const startVertex = entity.vertices[0];
  const startMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  startMarker.position.set(startVertex.x, startVertex.y, 0.1);
  markers.push(startMarker);

  // End point marker
  const endVertex = entity.vertices[entity.vertices.length - 1];
  const endMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  endMarker.position.set(endVertex.x, endVertex.y, 0.1);
  markers.push(endMarker);

  return markers;
}

/**
 * Update scene with all entities
 * Removes old meshes and adds new ones
 * @param scene - Three.js scene
 * @param entities - All entities
 * @param visibleLayers - Set of visible layer names (optional, if not provided all layers are visible)
 */
export function updateSceneWithEntities(
  scene: THREE.Scene,
  entities: DxfEntity[],
  visibleLayers?: Set<string>
): void {
  // Remove all existing entity meshes
  const oldMeshes = scene.children.filter(child => child.userData.entityId);
  oldMeshes.forEach(mesh => {
    scene.remove(mesh);
    // Dispose geometries and materials to free memory
    if (mesh instanceof THREE.Group) {
      mesh.children.forEach(child => {
        if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  });

  // Filter entities by visible layers
  const visibleEntities = visibleLayers
    ? entities.filter(entity => visibleLayers.has(entity.layer))
    : entities;

  // Add new entity meshes (only for visible layers)
  console.log(`🌟 Adding ${visibleEntities.length} visible entities to scene`);
  visibleEntities.forEach(entity => {
    const mesh = createEntityMesh(entity);

    // FIX: Convert child positions from local (relative to Group) to world coordinates
    // before adding to scene. This is critical because Group is at (0,0,0) but children
    // may have local positions that need to be converted to world space.
    console.log(`   Entity ${entity.id.slice(0, 8)}: Converting ${mesh.children.length} children from local to world coords`);

    mesh.children.forEach((child, i) => {
      // Get world position BEFORE removing from Group
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);

      // Copy world position to child's local position
      // (this will be its absolute position when added to scene)
      child.position.copy(worldPos);

      // Force matrix update after position change
      child.updateMatrix();

      // Store entity ID on each child for selection later
      child.userData = { entityId: entity.id, childIndex: i };

      // Add to scene with correct world position
      scene.add(child);

      console.log(`      [${i}] ${child.type} at world pos (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}, ${worldPos.z.toFixed(1)})`);
    });
  });

  // DEBUG: Log total scene children
  console.log(`📊 Scene now has ${scene.children.length} children total`);
  const entityGroups = scene.children.filter(child => child.userData.entityId);
  console.log(`   - ${entityGroups.length} entity groups`);
}


/**
 * Create snap indicator (green circle) at a point
 */
export function createSnapIndicator(
  x: number,
  y: number,
  radius: number = 3
): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, 0.2); // Slightly above entities
  mesh.userData = { isSnapIndicator: true };

  return mesh;
}

/**
 * Remove all snap indicators from scene
 */
export function clearSnapIndicators(scene: THREE.Scene): void {
  const indicators = scene.children.filter(child => child.userData.isSnapIndicator);
  indicators.forEach(indicator => {
    scene.remove(indicator);
    if (indicator instanceof THREE.Mesh) {
      indicator.geometry.dispose();
      if (Array.isArray(indicator.material)) {
        indicator.material.forEach(m => m.dispose());
      } else {
        indicator.material.dispose();
      }
    }
  });
}

/**
 * Find entity at screen coordinates
 * @param mouse - Normalized mouse coordinates (-1 to 1)
 * @param camera - Three.js camera
 * @param scene - Three.js scene
 * @returns Entity ID if found, null otherwise
 */
export function findEntityAtPoint(
  mouse: { x: number; y: number },
  camera: THREE.Camera,
  scene: THREE.Scene
): string | null {
  const raycaster = new THREE.Raycaster();
  const mouseVector = new THREE.Vector2(mouse.x, mouse.y);
  raycaster.setFromCamera(mouseVector, camera);

  // Find intersections with entity meshes
  const entityGroups = scene.children.filter(child => child.userData.entityId);
  const intersects = raycaster.intersectObjects(entityGroups, true);

  if (intersects.length > 0) {
    // Find parent group with entityId
    let object = intersects[0].object;
    while (object && !object.userData.entityId) {
      object = object.parent as THREE.Object3D;
    }

    if (object && object.userData.entityId) {
      return object.userData.entityId as string;
    }
  }

  return null;
}

/**
 * Find nearest endpoint within tolerance
 * @param point - Point to search from (in world coordinates)
 * @param entities - All entities to search
 * @param tolerance - Maximum distance in mm
 * @returns { entityId, vertexIndex, distance } if found
 */
export function findNearestEndpoint(
  point: { x: number; y: number },
  entities: DxfEntity[],
  tolerance: number
): { entityId: string; vertexIndex: number; distance: number } | null {
  let nearest: { entityId: string; vertexIndex: number; distance: number } | null = null;

  for (const entity of entities) {
    // Check first vertex
    const firstDist = Math.sqrt(
      Math.pow(entity.vertices[0].x - point.x, 2) +
      Math.pow(entity.vertices[0].y - point.y, 2)
    );

    if (firstDist <= tolerance) {
      if (!nearest || firstDist < nearest.distance) {
        nearest = {
          entityId: entity.id,
          vertexIndex: 0,
          distance: firstDist,
        };
      }
    }

    // Check last vertex
    const lastIdx = entity.vertices.length - 1;
    const lastDist = Math.sqrt(
      Math.pow(entity.vertices[lastIdx].x - point.x, 2) +
      Math.pow(entity.vertices[lastIdx].y - point.y, 2)
    );

    if (lastDist <= tolerance) {
      if (!nearest || lastDist < nearest.distance) {
        nearest = {
          entityId: entity.id,
          vertexIndex: lastIdx,
          distance: lastDist,
        };
      }
    }
  }

  return nearest;
}

/**
 * Convert screen coordinates to world coordinates
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param width - Canvas width
 * @param height - Canvas height
 * @param camera - Three.js orthographic camera
 * @returns World coordinates { x, y }
 */
export function screenToWorld(
  x: number,
  y: number,
  width: number,
  height: number,
  camera: THREE.OrthographicCamera
): { x: number; y: number } {
  // Normalize screen coordinates to -1 to 1
  const normalizedX = (x / width) * 2 - 1;
  const normalizedY = -(y / height) * 2 + 1;

  // Create vector at normalized screen position
  const vector = new THREE.Vector3(normalizedX, normalizedY, 0);

  // Unproject to world coordinates
  vector.unproject(camera);

  return { x: vector.x, y: vector.y };
}

/**
 * Fit camera to show all entities with padding
 * @param entities - All entities to fit
 * @param camera - Orthographic camera to adjust
 * @param aspect - Canvas aspect ratio (width/height)
 * @param padding - Padding factor (1.1 = 10% padding)
 */
export function fitCameraToEntities(
  entities: DxfEntity[],
  camera: THREE.OrthographicCamera,
  aspect: number,
  padding: number = 1.1
): void {
  if (entities.length === 0) {
    console.warn('⚠️ fitCameraToEntities: No entities to fit');
    return;
  }

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of entities) {
    for (const vertex of entity.vertices) {
      if (vertex.x < minX) minX = vertex.x;
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.x > maxX) maxX = vertex.x;
      if (vertex.y > maxY) maxY = vertex.y;
    }
  }

  // Calculate center and size
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const sizeX = (maxX - minX) * padding;
  const sizeY = (maxY - minY) * padding;

  console.log(`📷 Camera fitting:`);
  console.log(`   BBox: (${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`);
  console.log(`   Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
  console.log(`   Size: ${sizeX.toFixed(1)} x ${sizeY.toFixed(1)}mm`);

  // Adjust camera frustum
  const size = Math.max(sizeX, sizeY);
  camera.left = centerX - (size * aspect) / 2;
  camera.right = centerX + (size * aspect) / 2;
  camera.top = centerY + size / 2;
  camera.bottom = centerY - size / 2;

  console.log(`   Frustum: left=${camera.left.toFixed(1)}, right=${camera.right.toFixed(1)}, top=${camera.top.toFixed(1)}, bottom=${camera.bottom.toFixed(1)}`);

  camera.updateProjectionMatrix();
}

/**
 * Highlight an endpoint (yellow ring for first endpoint in merge mode)
 * @param scene - Three.js scene
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @param radius - Highlight radius
 */
export function highlightEndpoint(
  scene: THREE.Scene,
  x: number,
  y: number,
  radius: number = 4
): void {
  // Create yellow ring geometry
  const geometry = new THREE.RingGeometry(radius - 0.5, radius, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, 0.3); // Above snap indicators
  mesh.userData = { isEndpointHighlight: true };

  scene.add(mesh);
}

/**
 * Remove all endpoint highlights from scene
 */
export function clearEndpointHighlights(scene: THREE.Scene): void {
  const highlights = scene.children.filter(
    child => child.userData.isEndpointHighlight
  );

  highlights.forEach(highlight => {
    scene.remove(highlight);
    if (highlight instanceof THREE.Mesh) {
      highlight.geometry.dispose();
      if (Array.isArray(highlight.material)) {
        highlight.material.forEach(m => m.dispose());
      } else {
        highlight.material.dispose();
      }
    }
  });
}

/**
 * Find all entities within a bounding box (for drag-to-select)
 * @param box - Bounding box in world coordinates {minX, minY, maxX, maxY}
 * @param entities - All entities to search
 * @returns Array of entity IDs within the box
 */
export function findEntitiesInBox(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  entities: DxfEntity[]
): string[] {
  const selectedIds: string[] = [];

  for (const entity of entities) {
    // Check if any vertex of the entity is within the box
    const hasVertexInBox = entity.vertices.some(vertex => {
      return (
        vertex.x >= box.minX &&
        vertex.x <= box.maxX &&
        vertex.y >= box.minY &&
        vertex.y <= box.maxY
      );
    });

    if (hasVertexInBox) {
      selectedIds.push(entity.id);
    }
  }

  return selectedIds;
}
