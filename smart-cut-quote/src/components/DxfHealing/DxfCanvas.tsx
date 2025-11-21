/**
 * DXF Canvas Component
 * Three.js canvas for rendering and editing DXF entities
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { Box } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useDxfHealingStore } from '../../stores/dxfHealingStore';
import {
  updateSceneWithEntities,
  fitCameraToEntities,
  findEntityAtPoint,
  screenToWorld,
  clearSnapIndicators,
  createSnapIndicator,
  findNearestEndpoint,
  highlightEndpoint,
  clearEndpointHighlights,
  findEntitiesInBox,
} from '../../services/threeRenderService';

export default function DxfCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // State for merge mode
  const [firstEndpoint, setFirstEndpoint] = useState<{
    entityId: string;
    vertexIndex: number;
  } | null>(null);

  // State for drag-to-select
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  // Get entities and selection from store
  const entities = useDxfHealingStore(state => state.entities);
  const selectedEntityIds = useDxfHealingStore(state => state.selectedEntityIds);
  const selectEntity = useDxfHealingStore(state => state.selectEntity);
  const selectMultiple = useDxfHealingStore(state => state.selectMultiple);
  const mergeEndpoints = useDxfHealingStore(state => state.mergeEndpoints);
  const activeTool = useDxfHealingStore(state => state.activeTool);
  const settings = useDxfHealingStore(state => state.settings);

  // Get visible layers as a STABLE string key (prevents infinite re-renders)
  const visibleLayersKey = useDxfHealingStore(
    state => [...state.visibleLayers].sort().join(',')
  );

  // Reconstruct Set from key when needed
  const visibleLayersSet = useMemo(
    () => new Set(visibleLayersKey.split(',').filter(Boolean)),
    [visibleLayersKey]
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5); // Light gray background
    sceneRef.current = scene;

    // Create orthographic camera (2D view)
    // CRITICAL: For OrthographicCamera, near/far are RELATIVE to camera position!
    // Camera at Z=500, entities at Z=0.15
    // Near/far must include Z=0.15 when camera is at Z=500:
    //   - Near = 0.1 (camera can see from Z=500-0.1=499.9 downwards)
    //   - Far = 1000 (camera can see up to Z=500-1000=-500, includes Z=0.15)
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    const frustumSize = 1000; // 1000mm visible area initially

    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2, // left
      (frustumSize * aspect) / 2,  // right
      frustumSize / 2,              // top
      -frustumSize / 2,             // bottom
      0.1,                          // near - small positive value
      1000                          // far - large enough to see Z=0.15 from Z=500
    );
    camera.position.z = 500; // Camera at Z=500 looking down at Z=0.15
    camera.lookAt(0, 0, 0);  // Ensure camera looks at origin
    camera.updateProjectionMatrix(); // Apply changes
    cameraRef.current = camera;

    console.log('📷 Camera setup:');
    console.log(`   Position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
    console.log(`   Near: ${camera.near}, Far: ${camera.far}`);
    console.log(`   Frustum: left=${camera.left}, right=${camera.right}, top=${camera.top}, bottom=${camera.bottom}`);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls (pan/zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // 2D view only

    // TEST: Enable all mouse buttons for debugging
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.screenSpacePanning = true;
    controls.enabled = true; // Explicitly enable controls
    controls.enablePan = true; // Explicitly enable pan
    controls.enableZoom = true; // Explicitly enable zoom
    controls.target.set(0, 0, 0); // Look at origin where entities are
    controls.update(); // Apply target
    controlsRef.current = controls;

    console.log('🎮 OrbitControls configured:');
    console.log(`   enabled=${controls.enabled}, enablePan=${controls.enablePan}, enableZoom=${controls.enableZoom}`);

    console.log('🎮 OrbitControls setup:');
    console.log(`   Target: (${controls.target.x}, ${controls.target.y}, ${controls.target.z})`);

    // TEST: Add mouse event listeners to canvas to verify events are firing
    const testMouseDown = (e: MouseEvent) => {
      console.log('🖱️ MOUSE DOWN detected on canvas:', e.button);
    };
    const testMouseMove = (e: MouseEvent) => {
      console.log('🖱️ MOUSE MOVE detected on canvas');
    };
    const testWheel = (e: WheelEvent) => {
      console.log('🖱️ WHEEL detected on canvas:', e.deltaY);
    };

    renderer.domElement.addEventListener('mousedown', testMouseDown);
    renderer.domElement.addEventListener('mousemove', testMouseMove);
    renderer.domElement.addEventListener('wheel', testWheel);

    console.log('✅ Test mouse listeners added to canvas');

    // Add grid helper
    const gridSize = 2000;
    const gridDivisions = 40;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xcccccc, 0xeeeeee);
    gridHelper.rotation.x = Math.PI / 2; // Flat on XY plane
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    // TEST: Add a LARGE YELLOW SQUARE MESH at expected DXF location
    console.log('🟨 Adding LARGE TEST SQUARE MESH at DXF location');
    const testSquareGeometry = new THREE.PlaneGeometry(200, 200); // 200x200mm square
    const testSquareMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00, // YELLOW (different from red boxes)
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.7
    });
    const testSquare = new THREE.Mesh(testSquareGeometry, testSquareMaterial);
    // Place at center of expected entities (around origin based on bbox)
    testSquare.position.set(0, 0, 5); // Z=5 to match boxes
    testSquare.renderOrder = 2000;
    scene.add(testSquare);
    console.log(`   Test square added at (0, 0, 5): 200x200mm, color=YELLOW, opacity=0.7, Z=5 (same as boxes)`);

    // TEST: Add a LARGE RED BOX at (191.5, 74.4, 5) - same as first entity endpoint
    console.log('🟥 Adding TEST RED BOX at first entity endpoint');
    const testBoxGeometry = new THREE.BoxGeometry(50, 50, 50);
    const testBoxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // RED
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });
    const testBox = new THREE.Mesh(testBoxGeometry, testBoxMaterial);
    testBox.position.set(191.5, 74.4, 5); // First entity endpoint from logs
    testBox.renderOrder = 2001;
    scene.add(testBox);
    console.log(`   Test RED box added at (191.5, 74.4, 5): 50x50x50mm, should be VERY visible`);

    // TEST: Add a MAGENTA LINE directly to scene (not in Group)
    console.log('💜 Adding TEST MAGENTA LINE directly to scene');
    const testLinePoints = [
      new THREE.Vector3(-200, 0, 5),
      new THREE.Vector3(200, 0, 5),
    ];
    const testLineGeometry = new THREE.BufferGeometry().setFromPoints(testLinePoints);
    const testLineMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff, // MAGENTA
      linewidth: 1,
      depthTest: false,
      depthWrite: false
    });
    const testLine = new THREE.Line(testLineGeometry, testLineMaterial);
    testLine.renderOrder = 2002;
    scene.add(testLine);
    console.log(`   Test MAGENTA line added: from (-200, 0, 5) to (200, 0, 5)`);

    // Animation loop
    let frameCount = 0;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // Debug: Log scene contents every 60 frames (1 second at 60fps)
      if (frameCount === 0) {
        console.log(`🎬 Frame ${frameCount}: Scene children = ${scene.children.length}`);
        scene.children.forEach((child, i) => {
          console.log(`   [${i}] ${child.type} - visible=${child.visible}, renderOrder=${child.renderOrder}, pos=(${child.position.x.toFixed(1)}, ${child.position.y.toFixed(1)}, ${child.position.z.toFixed(1)})`);

          // Log Group children (entities)
          if (child.type === 'Group' && 'children' in child) {
            child.children.forEach((grandchild: any, j: number) => {
              console.log(`      [${i}.${j}] ${grandchild.type} - visible=${grandchild.visible}, renderOrder=${grandchild.renderOrder}, pos=(${grandchild.position.x.toFixed(1)}, ${grandchild.position.y.toFixed(1)}, ${grandchild.position.z.toFixed(1)})`);
            });
          }
        });

        console.log(`📷 Camera state:`);
        console.log(`   Position: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);
        console.log(`   Frustum: left=${camera.left.toFixed(1)}, right=${camera.right.toFixed(1)}, top=${camera.top.toFixed(1)}, bottom=${camera.bottom.toFixed(1)}`);
      }
      frameCount = (frameCount + 1) % 60;
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current || !camera || !renderer || !scene) return;

      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      const aspect = width / height;

      const frustum = Math.max(
        camera.right - camera.left,
        camera.top - camera.bottom
      );

      camera.left = (-frustum * aspect) / 2;
      camera.right = (frustum * aspect) / 2;
      camera.top = frustum / 2;
      camera.bottom = -frustum / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      controls.dispose();
      renderer.dispose();

      if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update entities in scene when they change
  useEffect(() => {
    if (!sceneRef.current || !canvasRef.current) return;

    updateSceneWithEntities(sceneRef.current, entities, visibleLayersSet);

    // Fit camera to VISIBLE entities only
    if (entities.length > 0 && cameraRef.current) {
      // Filter entities by visible layers
      const visibleEntities = entities.filter(entity => visibleLayersSet.has(entity.layer));

      if (visibleEntities.length > 0 && controlsRef.current) {
        const aspect = canvasRef.current!.clientWidth / canvasRef.current!.clientHeight;
        fitCameraToEntities(visibleEntities, cameraRef.current, aspect);

        // CRITICAL: Update OrbitControls target to center of entities!
        // Calculate center from fitted frustum
        const centerX = (cameraRef.current.left + cameraRef.current.right) / 2;
        const centerY = (cameraRef.current.top + cameraRef.current.bottom) / 2;
        controlsRef.current.target.set(centerX, centerY, 0);
        controlsRef.current.update();

        console.log(`🎯 Updated OrbitControls target to entity center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
      }
    }
  }, [entities, visibleLayersKey]); // Use visibleLayersKey to avoid infinite loop

  // Clear first endpoint when switching tools
  useEffect(() => {
    if (activeTool !== 'MERGE') {
      setFirstEndpoint(null);
      if (sceneRef.current) {
        clearEndpointHighlights(sceneRef.current);
      }
    }
  }, [activeTool]);

  // Handle mouse events for selection, drag-to-select, and merge
  // TEMPORARILY DISABLED TO TEST ORBITCONTROLS AND RENDERING
  useEffect(() => {
    return; // EARLY RETURN - DISABLE ALL MOUSE HANDLERS

    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;

    const handleMouseDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Handle SELECT mode - start drag
      if (activeTool === 'SELECT') {
        setIsDragging(true);
        setDragStart({ x, y });
        setDragEnd({ x, y });
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Handle SELECT mode - update drag
      if (activeTool === 'SELECT' && isDragging && dragStart) {
        setDragEnd({ x, y });
      }

      // Handle MERGE mode - show snap indicators
      if (activeTool === 'MERGE') {
        // Convert to world coordinates
        const worldPos = screenToWorld(x, y, rect.width, rect.height, camera);

        // Clear old snap indicators
        clearSnapIndicators(scene);

        // Find nearest endpoint
        const nearest = findNearestEndpoint(
          worldPos,
          entities,
          settings.snapTolerance
        );

        if (nearest) {
          // Show snap indicator
          const entity = entities.find(e => e.id === nearest.entityId);
          if (entity) {
            const vertex = entity.vertices[nearest.vertexIndex];
            const indicator = createSnapIndicator(vertex.x, vertex.y);
            scene.add(indicator);
          }
        }
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Normalize mouse coordinates (-1 to 1)
      const mouse = {
        x: (x / rect.width) * 2 - 1,
        y: -(y / rect.height) * 2 + 1,
      };

      // Handle SELECT mode
      if (activeTool === 'SELECT') {
        if (isDragging && dragStart) {
          const dragDistance = Math.sqrt(
            Math.pow(x - dragStart.x, 2) + Math.pow(y - dragStart.y, 2)
          );

          // If drag distance < 5px, treat as click
          if (dragDistance < 5) {
            const entityId = findEntityAtPoint(mouse, camera, scene);
            if (entityId) {
              // Check for Ctrl key (multi-select)
              const multiSelect = event.ctrlKey || event.metaKey;
              selectEntity(entityId, multiSelect);
            }
          } else {
            // Drag-to-select box
            const start = screenToWorld(
              dragStart.x,
              dragStart.y,
              rect.width,
              rect.height,
              camera
            );
            const end = screenToWorld(x, y, rect.width, rect.height, camera);

            const box = {
              minX: Math.min(start.x, end.x),
              minY: Math.min(start.y, end.y),
              maxX: Math.max(start.x, end.x),
              maxY: Math.max(start.y, end.y),
            };

            const selectedIds = findEntitiesInBox(box, entities);
            selectMultiple(selectedIds);
          }
        }

        // Reset drag state
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }

      // Handle MERGE mode
      else if (activeTool === 'MERGE') {
        // Convert to world coordinates
        const worldPos = screenToWorld(x, y, rect.width, rect.height, camera);

        // Find nearest endpoint
        const nearest = findNearestEndpoint(
          worldPos,
          entities,
          settings.snapTolerance
        );

        if (!nearest) {
          // No endpoint nearby - clear first endpoint selection
          setFirstEndpoint(null);
          clearEndpointHighlights(scene);
          return;
        }

        if (!firstEndpoint) {
          // First click - select first endpoint
          setFirstEndpoint(nearest);

          // Highlight the selected endpoint
          clearEndpointHighlights(scene);
          const entity = entities.find(e => e.id === nearest.entityId);
          if (entity) {
            const vertex = entity.vertices[nearest.vertexIndex];
            highlightEndpoint(scene, vertex.x, vertex.y);
          }
        } else {
          // Second click - attempt merge
          const success = mergeEndpoints(
            firstEndpoint.entityId,
            firstEndpoint.vertexIndex,
            nearest.entityId,
            nearest.vertexIndex
          );

          if (success) {
            // Clear first endpoint selection after successful merge
            setFirstEndpoint(null);
            clearEndpointHighlights(scene);
          } else {
            // Merge failed - select new first endpoint
            setFirstEndpoint(nearest);
            clearEndpointHighlights(scene);
            const entity = entities.find(e => e.id === nearest.entityId);
            if (entity) {
              const vertex = entity.vertices[nearest.vertexIndex];
              highlightEndpoint(scene, vertex.x, vertex.y);
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    activeTool,
    entities,
    selectEntity,
    selectMultiple,
    mergeEndpoints,
    settings.snapTolerance,
    isDragging,
    dragStart,
    firstEndpoint,
  ]);

  return (
    <Box
      ref={canvasRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '& canvas': {
          display: 'block',
        },
      }}
    >
      {/* Selection box overlay */}
      {isDragging && dragStart && dragEnd && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.min(dragStart.x, dragEnd.x),
            top: Math.min(dragStart.y, dragEnd.y),
            width: Math.abs(dragEnd.x - dragStart.x),
            height: Math.abs(dragEnd.y - dragStart.y),
            border: '2px dashed #2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}
    </Box>
  );
}
