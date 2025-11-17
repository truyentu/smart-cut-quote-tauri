/**
 * Part Library Page
 * Source of truth for all part configurations
 * Replaces old PartConfig and Summary pages with a unified DataGrid interface
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import BuildIcon from '@mui/icons-material/Build';
import PaletteIcon from '@mui/icons-material/Palette';
import { useQuoteStore } from '../stores/quoteStore';
import {
  MOCK_MACHINES,
  getMaterialGroups,
  getMaterialGrades,
  getMaterialThicknesses,
  getMaterialSpec,
} from '../data/mockData';
import { DxfFile } from '../types/quote';
import DxfThumbnail from '../components/Viewer/DxfThumbnail';
import PreviewDialog from '../components/Dialogs/PreviewDialog';

export default function PartLibrary() {
  const files = useQuoteStore((state) => state.files);
  const updateFile = useQuoteStore((state) => state.updateFile);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<DxfFile | null>(null);

  /**
   * Calculate unit cost and total cost for a file
   */
  const calculateCosts = useCallback((file: DxfFile): { unitCost: number; totalCost: number } => {
    // Placeholder calculation - will be replaced with pricingService logic
    const baseCost = 10; // Base cost placeholder
    const materialMarkupMultiplier = 1 + (file.materialMarkup || 0) / 100;
    const priceMarkupMultiplier = 1 + (file.priceMarkup || 0) / 100;

    const unitCost = baseCost * materialMarkupMultiplier * priceMarkupMultiplier;
    const totalCost = unitCost * file.quantity;

    return { unitCost, totalCost };
  }, []);

  /**
   * Update file with new values and recalculate costs
   */
  const handleFileUpdate = useCallback(
    (fileId: string, updates: Partial<DxfFile>) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      const updatedFile = { ...file, ...updates };
      const costs = calculateCosts(updatedFile);

      updateFile(fileId, {
        ...updates,
        unitCost: costs.unitCost,
        totalCost: costs.totalCost,
      });
    },
    [files, updateFile, calculateCosts]
  );

  /**
   * Recalculate costs for all files when dependencies change
   */
  useEffect(() => {
    files.forEach((file) => {
      const costs = calculateCosts(file);
      if (file.unitCost !== costs.unitCost || file.totalCost !== costs.totalCost) {
        updateFile(file.id, {
          unitCost: costs.unitCost,
          totalCost: costs.totalCost,
        });
      }
    });
  }, [files, calculateCosts, updateFile]);

  /**
   * Render Preview Cell (thumbnail + dimensions)
   */
  const renderPreviewCell = (params: GridRenderCellParams<DxfFile>) => {
    const file = params.row;
    const dimensions = file.metadata?.dimensions;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', py: 1 }}>
        {/* DxfThumbnail */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setPreviewFile(file);
          }}
          sx={{
            width: 80,
            height: 80,
            border: '1px solid #eee',
            borderRadius: 1,
            overflow: 'hidden',
            flexShrink: 0,
            cursor: 'pointer',
            '&:hover': {
              borderColor: '#1976d2',
              boxShadow: 1,
            },
          }}
        >
          <DxfThumbnail filePath={file.path} size={80} />
        </Box>

        {/* Dimensions text only (below thumbnail) */}
        <Typography variant="caption" color="text.secondary">
          {dimensions
            ? `${dimensions.width.toFixed(2)} × ${dimensions.height.toFixed(2)}`
            : 'Calculating...'}
        </Typography>
      </Box>
    );
  };

  /**
   * Render Machine Select Cell
   */
  const renderMachineCell = (params: GridRenderCellParams<DxfFile>) => {
    const file = params.row;

    return (
      <FormControl fullWidth size="small">
        <Select
          value={file.machine || ''}
          onChange={(e: SelectChangeEvent) => {
            handleFileUpdate(file.id, { machine: e.target.value });
          }}
          displayEmpty
        >
          <MenuItem value="">
            <em>Select Machine</em>
          </MenuItem>
          {MOCK_MACHINES.map((machine) => (
            <MenuItem key={machine.id} value={machine.id}>
              {machine.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  /**
   * Render Material 3-Level Select Cell
   */
  const renderMaterialCell = (params: GridRenderCellParams<DxfFile>) => {
    const file = params.row;
    const groups = getMaterialGroups();
    const grades = file.materialGroup ? getMaterialGrades(file.materialGroup) : [];
    const thicknesses =
      file.materialGroup && file.materialGrade
        ? getMaterialThicknesses(file.materialGroup, file.materialGrade)
        : [];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%', py: 1 }}>
        {/* Group Select */}
        <FormControl fullWidth size="small">
          <InputLabel>Group</InputLabel>
          <Select
            value={file.materialGroup || ''}
            onChange={(e: SelectChangeEvent) => {
              handleFileUpdate(file.id, {
                materialGroup: e.target.value,
                materialGrade: undefined,
                materialThickness: undefined,
              });
            }}
            label="Group"
          >
            <MenuItem value="">
              <em>Select Group</em>
            </MenuItem>
            {groups.map((group) => (
              <MenuItem key={group} value={group}>
                {group}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Grade Select */}
        <FormControl fullWidth size="small" disabled={!file.materialGroup}>
          <InputLabel>Grade</InputLabel>
          <Select
            value={file.materialGrade || ''}
            onChange={(e: SelectChangeEvent) => {
              handleFileUpdate(file.id, {
                materialGrade: e.target.value,
                materialThickness: undefined,
              });
            }}
            label="Grade"
          >
            <MenuItem value="">
              <em>Select Grade</em>
            </MenuItem>
            {grades.map((grade) => (
              <MenuItem key={grade} value={grade}>
                {grade}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Thickness Select */}
        <FormControl fullWidth size="small" disabled={!file.materialGrade}>
          <InputLabel>Thickness</InputLabel>
          <Select
            value={file.materialThickness?.toString() || ''}
            onChange={(e: SelectChangeEvent) => {
              const thickness = Number(e.target.value);
              handleFileUpdate(file.id, { materialThickness: thickness });

              // Auto-populate material spec when all 3 levels selected
              if (file.materialGroup && file.materialGrade) {
                const spec = getMaterialSpec(file.materialGroup, file.materialGrade, thickness);
                if (spec) {
                  handleFileUpdate(file.id, {
                    materialThickness: thickness,
                    material: {
                      id: spec.id,
                      name: file.materialGroup,
                      grade: file.materialGrade,
                      thickness,
                      pricePerKg: spec.pricePerKg,
                      density: spec.density,
                      cuttingSpeed: spec.cuttingSpeed,
                      pierceCost: spec.pierceCost,
                    },
                  });
                }
              }
            }}
            label="Thickness"
          >
            <MenuItem value="">
              <em>Select Thickness</em>
            </MenuItem>
            {thicknesses.map((thickness) => (
              <MenuItem key={thickness} value={thickness.toString()}>
                {thickness} mm
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Material Markup */}
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Material Markup (%)"
          value={file.materialMarkup || 0}
          onChange={(e) => {
            handleFileUpdate(file.id, { materialMarkup: Number(e.target.value) });
          }}
          inputProps={{ min: 0, step: 1 }}
        />
      </Box>
    );
  };

  /**
   * Render Operations Cell (placeholder with icons)
   */
  const renderOperationsCell = (params: GridRenderCellParams<DxfFile>) => {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton size="small" color="primary" title="Add Operation">
          <BuildIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="secondary" title="Paint Operation">
          <PaletteIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  /**
   * Column definitions for DataGrid
   */
  const columns: GridColDef<DxfFile>[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      editable: false,
    },
    {
      field: 'preview',
      headerName: 'Preview',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: renderPreviewCell,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      editable: true,
      type: 'number',
    },
    {
      field: 'machine',
      headerName: 'Machine',
      width: 200,
      sortable: false,
      renderCell: renderMachineCell,
    },
    {
      field: 'material',
      headerName: 'Material',
      width: 300,
      sortable: false,
      renderCell: renderMaterialCell,
    },
    {
      field: 'operations',
      headerName: 'Operations',
      width: 120,
      sortable: false,
      renderCell: renderOperationsCell,
    },
    {
      field: 'priceMarkup',
      headerName: 'Price Markup (%)',
      width: 150,
      editable: true,
      type: 'number',
    },
    {
      field: 'unitCost',
      headerName: 'Unit Cost ($)',
      width: 120,
      editable: false,
      type: 'number',
      valueFormatter: (params) => {
        return params.value ? `$${params.value.toFixed(2)}` : '$0.00';
      },
    },
    {
      field: 'totalCost',
      headerName: 'Total Cost ($)',
      width: 120,
      editable: false,
      type: 'number',
      valueFormatter: (params) => {
        return params.value ? `$${params.value.toFixed(2)}` : '$0.00';
      },
    },
  ];

  /**
   * Handle cell edit commit
   */
  const handleCellEditCommit = useCallback(
    (params: any) => {
      const { id, field, value } = params;
      handleFileUpdate(id as string, { [field]: value });
    },
    [handleFileUpdate]
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Part Library - Configuration & Costing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure materials, machines, and operations for each part. Costs are calculated in
          real-time.
        </Typography>
      </Paper>

      {/* DataGrid */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={files}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          rowHeight={120}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection as string[]);
          }}
          rowSelectionModel={selectedRows}
          processRowUpdate={(newRow) => {
            handleFileUpdate(newRow.id, newRow);
            return newRow;
          }}
          onProcessRowUpdateError={(error) => {
            console.error('Row update error:', error);
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              padding: 1,
            },
          }}
        />
      </Paper>

      {/* Summary */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">
            <strong>Total Parts:</strong> {files.length}
          </Typography>
          <Typography variant="body1">
            <strong>Total Quantity:</strong> {files.reduce((sum, f) => sum + f.quantity, 0)}
          </Typography>
          <Typography variant="h6" color="primary">
            <strong>Grand Total:</strong> $
            {files.reduce((sum, f) => sum + (f.totalCost || 0), 0).toFixed(2)}
          </Typography>
        </Box>
      </Paper>

      {/* Preview Dialog */}
      <PreviewDialog
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </Box>
  );
}
