/**
 * DXF Sidebar Component
 * Layer list, entity list, and property panel
 */

import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  Divider,
  Chip,
} from '@mui/material';
import { useDxfHealingStore } from '../../stores/dxfHealingStore';

export default function DxfSidebar() {
  const entities = useDxfHealingStore(state => state.entities);
  const selectedEntityIds = useDxfHealingStore(state => state.selectedEntityIds);
  const visibleLayers = useDxfHealingStore(state => state.visibleLayers);
  const toggleLayerVisibility = useDxfHealingStore(state => state.toggleLayerVisibility);
  const selectEntity = useDxfHealingStore(state => state.selectEntity);
  const validationIssues = useDxfHealingStore(state => state.validationIssues);

  // Get unique layers
  const layers = [...new Set(entities.map(e => e.layer))];

  // Get problematic entity IDs
  const problematicIds = new Set(
    validationIssues.flatMap(issue => issue.entityIds)
  );

  // Filter entities by visible layers
  const visibleEntities = entities.filter(e => visibleLayers.has(e.layer));

  const handleLayerToggle = (layer: string) => {
    toggleLayerVisibility(layer);
  };

  const handleEntityClick = (entityId: string) => {
    selectEntity(entityId, false);
  };

  const selectedEntity = entities.find(e => selectedEntityIds.includes(e.id));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {/* Layers Panel */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Layers
        </Typography>
        <List dense>
          {layers.map(layer => (
            <ListItem key={layer} disablePadding>
              <ListItemButton onClick={() => handleLayerToggle(layer)}>
                <Checkbox
                  edge="start"
                  checked={visibleLayers.has(layer)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemText primary={layer} />
                <Chip
                  label={entities.filter(e => e.layer === layer).length}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Entity List Panel */}
      <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography variant="subtitle2" gutterBottom>
          Entities ({visibleEntities.length} / {entities.length})
        </Typography>
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <List dense>
            {visibleEntities.map(entity => {
              const isSelected = selectedEntityIds.includes(entity.id);
              const hasIssue = problematicIds.has(entity.id);

              return (
                <ListItem
                  key={entity.id}
                  disablePadding
                  sx={{
                    borderLeft: hasIssue ? '3px solid #f44336' : 'none',
                  }}
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleEntityClick(entity.id)}
                  >
                    <ListItemText
                      primary={`${entity.type} - ${entity.layer}`}
                      secondary={
                        entity.metadata.closed
                          ? `Closed • ${entity.metadata.length.toFixed(1)}mm`
                          : `Open • ${entity.metadata.length.toFixed(1)}mm`
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Paper>

      {/* Property Panel */}
      {selectedEntity && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Properties
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 13 }}>
            <Box>
              <strong>Type:</strong> {selectedEntity.type}
            </Box>
            <Box>
              <strong>Layer:</strong> {selectedEntity.layer}
            </Box>
            <Box>
              <strong>Vertices:</strong> {selectedEntity.vertices.length}
            </Box>
            <Box>
              <strong>Length:</strong> {selectedEntity.metadata.length.toFixed(3)} mm
            </Box>
            {selectedEntity.metadata.area !== undefined && (
              <Box>
                <strong>Area:</strong> {selectedEntity.metadata.area.toFixed(2)} mm²
              </Box>
            )}
            <Box>
              <strong>Closed:</strong> {selectedEntity.metadata.closed ? 'Yes' : 'No'}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
