/**
 * Part Library Page
 * Source of truth for all part configurations
 * Replaces old PartConfig and Summary pages with a unified DataGrid interface
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
  Checkbox,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useQuoteStore } from '../stores/quoteStore';
import { DxfFile } from '../types/quote';
import DxfThumbnail from '../components/Viewer/DxfThumbnail';
import PreviewDialog from '../components/Dialogs/PreviewDialog';
import { runNestingWorkflowWithBatching } from '../services/nestingService';
import {
  getAllMaterials,
  getAllMachines,
  getAllOperations,
  getNestingSettings,
  MaterialStock,
  Machine as DbMachine,
  Operation,
} from '../services/database';
import {
  calculateMaterialCost,
  calculateCuttingCost,
  calculatePiercingCost,
  calculateOperationsCost,
  getSettings,
} from '../services/pricingServiceV2';
import { generateDxfThumbnail } from '../services/thumbnailService';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function PartLibrary() {
  const files = useQuoteStore((state) => state.files);
  const updateFile = useQuoteStore((state) => state.updateFile);
  const setNestingResult = useQuoteStore((state) => state.setNestingResult);
  const setBatchedNestingResults = useQuoteStore((state) => state.setBatchedNestingResults);
  const [previewFile, setPreviewFile] = useState<DxfFile | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [calculationSuccess, setCalculationSuccess] = useState(false);

  // Database data
  const [materials, setMaterials] = useState<MaterialStock[]>([]);
  const [machines, setMachines] = useState<DbMachine[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Load database data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        const [mats, machs, ops] = await Promise.all([
          getAllMaterials(),
          getAllMachines(),
          getAllOperations(),
        ]);
        setMaterials(mats);
        setMachines(machs);
        setOperations(ops);
      } catch (err) {
        console.error('Failed to load database data:', err);
        setCalculationError('Failed to load materials/machines from database');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper functions for material hierarchy from database
  const getMaterialGroups = useCallback((): string[] => {
    const groups = new Set(materials.map((m) => m.name));
    return Array.from(groups).sort();
  }, [materials]);

  const getMaterialGrades = useCallback(
    (group: string): string[] => {
      const grades = new Set(
        materials.filter((m) => m.name === group).map((m) => m.grade)
      );
      return Array.from(grades).sort();
    },
    [materials]
  );

  const getMaterialThicknesses = useCallback(
    (group: string, grade: string): number[] => {
      return materials
        .filter((m) => m.name === group && m.grade === grade)
        .map((m) => m.thickness)
        .sort((a, b) => a - b);
    },
    [materials]
  );

  const getMaterialSpec = useCallback(
    (group: string, grade: string, thickness: number): MaterialStock | null => {
      return (
        materials.find(
          (m) => m.name === group && m.grade === grade && m.thickness === thickness
        ) || null
      );
    },
    [materials]
  );

  /**
   * Update file with new values (costs are calculated via nesting workflow)
   */
  const handleFileUpdate = useCallback(
    (fileId: string, updates: Partial<DxfFile>) => {
      updateFile(fileId, updates);
    },
    [updateFile]
  );

  /**
   * Run Nesting Workflow with Batching and Calculate Real Costs
   */
  const handleRunNestingAndCalculateCost = useCallback(async () => {
    setIsCalculating(true);
    setCalculationError(null);
    setCalculationSuccess(false);

    try {
      // Filter only selected files
      const selectedFiles = files.filter((f) => f.selected !== false);

      if (selectedFiles.length === 0) {
        setCalculationError('No files selected. Please select files to nest and calculate costs.');
        setIsCalculating(false);
        return;
      }

      console.log(`Starting nesting workflow with ${selectedFiles.length} selected files...`);

      // Step 1: Load nesting settings from database
      const nestingSettings = await getNestingSettings();
      console.log('Using nesting settings:', nestingSettings);

      // Step 2: Run nesting workflow with automatic batching using saved settings
      const batchedResult = await runNestingWorkflowWithBatching(
        selectedFiles,
        nestingSettings.stripHeight,
        nestingSettings.partSpacing
      );

      if (!batchedResult.success) {
        throw new Error(batchedResult.error || 'Nesting workflow failed');
      }

      console.log(
        `Nesting completed: ${batchedResult.successfulBatches}/${batchedResult.totalBatches} batches successful`
      );

      // Step 3: Get settings for markup
      const settings = await getSettings();

      // Step 3: Calculate costs for each file using pricingServiceV2
      for (const batch of batchedResult.batches) {
        if (batch.nestingResult.success && batch.nestingResult.data) {
          for (const file of batch.files) {
            // Find material from database
            const material = materials.find(
              (m) =>
                m.id === file.material?.id ||
                (m.name === file.materialGroup &&
                  m.grade === file.materialGrade &&
                  m.thickness === file.materialThickness)
            );

            // Find machine from database
            const machine = machines.find((m) => m.id === file.machine || m.name === file.machine);

            if (material && machine && batch.nestingResult.data) {
              // Calculate material cost
              const materialCost = calculateMaterialCost(
                batch.nestingResult.data.stripWidth,
                batch.nestingResult.data.stripHeight,
                material,
                file.quantity
              );

              // Calculate cutting cost
              const cutLength = file.metadata?.cutLength || 0;
              // Calculate price per meter from cutting speed and hourly rate
              const cutPricePerMeter = (machine.hourly_rate / material.cutting_speed) / 60; // $/meter
              const cuttingCost = calculateCuttingCost(
                cutLength,
                cutPricePerMeter,
                file.quantity
              );

              // Calculate piercing cost
              const pierceCount = file.metadata?.pierceCount || 1;
              const piercingCost = calculatePiercingCost(
                pierceCount,
                material.pierce_cost,
                file.quantity
              );

              // Calculate operations cost
              const fileOperations = file.operations || [];
              const operationsCost = calculateOperationsCost(fileOperations, operations, {
                quantity: file.quantity,
                area: file.metadata?.area,
                length: cutLength / 1000,
                count: pierceCount,
                hourlyRate: machine.hourly_rate,
              });

              // Calculate subtotal
              const subtotal = materialCost + cuttingCost + piercingCost + operationsCost;

              // Apply markups
              const materialMarkupMultiplier = 1 + (file.materialMarkup || 0) / 100;
              const priceMarkupMultiplier = 1 + (file.priceMarkup || settings.default_price_markup) / 100;

              const totalWithMarkup = subtotal * materialMarkupMultiplier * priceMarkupMultiplier;
              const unitCost = totalWithMarkup / file.quantity;

              // Generate thumbnail for PDF export
              const preview = await generateDxfThumbnail(file.path, 80);

              updateFile(file.id, {
                unitCost: Math.round(unitCost * 100) / 100,
                totalCost: Math.round(totalWithMarkup * 100) / 100,
                preview: preview || undefined, // Store base64 thumbnail
              });
            }
          }
        }
      }

      // ✅ SAVE BATCHED NESTING RESULTS TO STORE
      console.log('💾 Saving batched nesting results to store...');
      setBatchedNestingResults(batchedResult.batches);

      // ✅ SELECT BEST BATCH TO DISPLAY IN NESTING PAGE
      // Find batch with highest utilization
      const bestBatch = batchedResult.batches.reduce((best, current) => {
        if (!current.nestingResult.data) return best;
        if (!best || !best.nestingResult.data) return current;
        return current.nestingResult.data.utilization > best.nestingResult.data.utilization
          ? current
          : best;
      }, batchedResult.batches[0]);

      // Save best batch result to main nesting store
      if (bestBatch && bestBatch.nestingResult.success && bestBatch.nestingResult.data) {
        console.log(
          `✅ Selected best batch: ${bestBatch.batchKey} (${(bestBatch.nestingResult.data.utilization * 100).toFixed(1)}% utilization)`
        );
        setNestingResult(bestBatch.nestingResult.data, bestBatch.nestingResult.svgUrl || null);
      }

      setCalculationSuccess(true);
      setTimeout(() => setCalculationSuccess(false), 5000);
    } catch (error: any) {
      console.error('Failed to run nesting and calculate cost:', error);
      setCalculationError(error.message || 'Failed to calculate costs');
    } finally {
      setIsCalculating(false);
    }
  }, [files, updateFile, materials, machines, operations, setNestingResult, setBatchedNestingResults]);

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
          {machines.map((machine) => (
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
                      pricePerKg: spec.price_per_kg,
                      density: spec.density,
                      cuttingSpeed: spec.cutting_speed,
                      pierceCost: spec.pierce_cost,
                      cutPricePerMeter: 0, // Not used, calculated from cutting_speed
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
   * Render Operations Cell with multi-select
   */
  const renderOperationsCell = (params: GridRenderCellParams<DxfFile>) => {
    const file = params.row;
    const selectedOps = file.operations || [];

    return (
      <Box sx={{ width: '100%', py: 1 }}>
        <Autocomplete
          multiple
          size="small"
          options={operations}
          getOptionLabel={(option) => option.name}
          value={operations.filter((op) => selectedOps.includes(op.name))}
          onChange={(_, newValue) => {
            handleFileUpdate(file.id, {
              operations: newValue.map((op) => op.name),
            });
          }}
          renderOption={(props, option, { selected }) => {
            const { key, ...restProps } = props;
            return (
              <li key={key} {...restProps}>
                <Checkbox
                  icon={icon}
                  checkedIcon={checkedIcon}
                  style={{ marginRight: 8 }}
                  checked={selected}
                />
                {option.name}
              </li>
            );
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...restProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={option.name}
                  size="small"
                  {...restProps}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField {...params} placeholder="Operations" variant="outlined" />
          )}
          disableCloseOnSelect
        />
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
      width: 200,
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
      renderCell: (params: GridRenderCellParams<DxfFile>) => {
        const value = params.row.unitCost;
        return (
          <Typography variant="body2">
            {value != null ? `$${value.toFixed(2)}` : '$0.00'}
          </Typography>
        );
      },
    },
    {
      field: 'totalCost',
      headerName: 'Total Cost ($)',
      width: 120,
      editable: false,
      renderCell: (params: GridRenderCellParams<DxfFile>) => {
        const value = params.row.totalCost;
        return (
          <Typography variant="body2">
            {value != null ? `$${value.toFixed(2)}` : '$0.00'}
          </Typography>
        );
      },
    },
  ];

  // Show loading state while fetching database data
  if (dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading materials and machines...</Typography>
      </Box>
    );
  }

  // Validate files array before rendering DataGrid
  const validFiles = Array.isArray(files) ? files.filter((f) => f && typeof f === 'object' && f.id) : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5">
            Part Library - Configuration & Costing
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={isCalculating ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
            onClick={handleRunNestingAndCalculateCost}
            disabled={isCalculating || validFiles.length === 0}
          >
            {isCalculating ? 'Calculating...' : 'Run Nesting & Calculate Cost'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configure materials, machines, and operations for each part. Click "Run Nesting & Calculate Cost" to process batches and calculate real costs.
        </Typography>

        {/* Success Message */}
        {calculationSuccess && (
          <Alert severity="success" sx={{ mt: 1 }}>
            ✓ Nesting completed and costs calculated successfully!
          </Alert>
        )}

        {/* Error Message */}
        {calculationError && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setCalculationError(null)}>
            Error: {calculationError}
          </Alert>
        )}
      </Paper>

      {/* DataGrid */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {validFiles.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 2 }}>
            <Typography color="text.secondary" variant="h6">
              No parts uploaded yet. Please upload DXF files first.
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={validFiles}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            rowHeight={120}
            processRowUpdate={(newRow) => {
              handleFileUpdate(newRow.id, newRow);
              return newRow;
            }}
            onProcessRowUpdateError={(error) => {
              console.error('Row update error:', error);
            }}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            sx={{
              '& .MuiDataGrid-cell': {
                padding: 1,
              },
            }}
          />
        )}
      </Paper>

      {/* Summary */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">
            <strong>Total Parts:</strong> {validFiles.length}
          </Typography>
          <Typography variant="body1">
            <strong>Total Quantity:</strong> {validFiles.reduce((sum, f) => sum + (f.quantity || 0), 0)}
          </Typography>
          <Typography variant="h6" color="primary">
            <strong>Grand Total:</strong> $
            {validFiles.reduce((sum, f) => sum + (f.totalCost || 0), 0).toFixed(2)}
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
