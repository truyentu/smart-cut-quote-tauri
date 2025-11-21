/**
 * Material Stock Management Tab
 * CRUD interface for managing materials
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

import {
  getAllMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  MaterialStock,
  MaterialStockInput,
} from '../../services/database';

interface MaterialFormData {
  name: string;
  grade: string;
  thickness: string;
  sheet_width: string;
  sheet_max_length: string;
  price_per_kg: string;
  density: string;
  quantity_in_stock: string;
  min_quantity: string;
  cutting_speed: string;
  pierce_time: string;
  pierce_cost: string;
  cut_price_per_meter: string;
}

const initialFormData: MaterialFormData = {
  name: '',
  grade: '',
  thickness: '',
  sheet_width: '1500',
  sheet_max_length: '6000',
  price_per_kg: '',
  density: '7850',
  quantity_in_stock: '0',
  min_quantity: '0',
  cutting_speed: '3000',
  pierce_time: '0.5',
  pierce_cost: '0.15',
  cut_price_per_meter: '1.50',
};

export default function MaterialStockTab() {
  const [materials, setMaterials] = useState<MaterialStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllMaterials();
      setMaterials(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleOpenDialog = (material?: MaterialStock) => {
    if (material) {
      setEditingId(material.id);
      setFormData({
        name: material.name,
        grade: material.grade,
        thickness: material.thickness.toString(),
        sheet_width: material.sheet_width.toString(),
        sheet_max_length: material.sheet_max_length.toString(),
        price_per_kg: material.price_per_kg.toString(),
        density: material.density.toString(),
        quantity_in_stock: material.quantity_in_stock.toString(),
        min_quantity: material.min_quantity.toString(),
        cutting_speed: material.cutting_speed.toString(),
        pierce_time: material.pierce_time.toString(),
        pierce_cost: material.pierce_cost.toString(),
        cut_price_per_meter: material.cut_price_per_meter.toString(),
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (field: keyof MaterialFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      const input: MaterialStockInput = {
        name: formData.name,
        grade: formData.grade,
        thickness: parseFloat(formData.thickness),
        sheet_width: parseFloat(formData.sheet_width),
        sheet_max_length: parseFloat(formData.sheet_max_length),
        price_per_kg: parseFloat(formData.price_per_kg),
        density: parseFloat(formData.density),
        quantity_in_stock: parseInt(formData.quantity_in_stock),
        min_quantity: parseInt(formData.min_quantity),
        cutting_speed: parseFloat(formData.cutting_speed),
        pierce_time: parseFloat(formData.pierce_time),
        pierce_cost: parseFloat(formData.pierce_cost),
        cut_price_per_meter: parseFloat(formData.cut_price_per_meter),
      };

      if (editingId) {
        await updateMaterial(editingId, input);
        setSuccess('Material updated successfully');
      } else {
        await createMaterial(input);
        setSuccess('Material created successfully');
      }

      handleCloseDialog();
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to save material');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      await deleteMaterial(id);
      setSuccess('Material deleted successfully');
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Material',
      width: 150,
    },
    {
      field: 'grade',
      headerName: 'Grade',
      width: 100,
    },
    {
      field: 'thickness',
      headerName: 'Thickness (mm)',
      width: 120,
      type: 'number',
    },
    {
      field: 'sheet_width',
      headerName: 'Width (mm)',
      width: 100,
      type: 'number',
    },
    {
      field: 'sheet_max_length',
      headerName: 'Length (mm)',
      width: 100,
      type: 'number',
    },
    {
      field: 'price_per_kg',
      headerName: 'Price/kg ($)',
      width: 100,
      type: 'number',
      valueFormatter: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      field: 'density',
      headerName: 'Density (kg/m3)',
      width: 120,
      type: 'number',
    },
    {
      field: 'cutting_speed',
      headerName: 'Cut Speed (mm/min)',
      width: 140,
      type: 'number',
    },
    {
      field: 'pierce_cost',
      headerName: 'Pierce Cost ($)',
      width: 110,
      type: 'number',
      valueFormatter: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      field: 'cut_price_per_meter',
      headerName: 'Cut Price ($/m)',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => value != null ? `$${value.toFixed(2)}/m` : '$0.00/m',
    },
    {
      field: 'quantity_in_stock',
      headerName: 'Stock',
      width: 80,
      type: 'number',
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Material Stock</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadMaterials}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Material
          </Button>
        </Box>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={materials}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField
              label="Material Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              required
              placeholder="e.g., Stainless Steel"
            />
            <TextField
              label="Grade"
              value={formData.grade}
              onChange={handleInputChange('grade')}
              required
              placeholder="e.g., 304"
            />
            <TextField
              label="Thickness (mm)"
              value={formData.thickness}
              onChange={handleInputChange('thickness')}
              type="number"
              required
            />
            <TextField
              label="Density (kg/m3)"
              value={formData.density}
              onChange={handleInputChange('density')}
              type="number"
              required
            />
            <TextField
              label="Sheet Width (mm)"
              value={formData.sheet_width}
              onChange={handleInputChange('sheet_width')}
              type="number"
              required
            />
            <TextField
              label="Sheet Max Length (mm)"
              value={formData.sheet_max_length}
              onChange={handleInputChange('sheet_max_length')}
              type="number"
              required
            />
            <TextField
              label="Price per kg ($)"
              value={formData.price_per_kg}
              onChange={handleInputChange('price_per_kg')}
              type="number"
              required
            />
            <TextField
              label="Cut Price ($/m)"
              value={formData.cut_price_per_meter}
              onChange={handleInputChange('cut_price_per_meter')}
              type="number"
              required
              helperText="Price per meter for length-based cutting cost"
            />
            <TextField
              label="Cutting Speed (mm/min)"
              value={formData.cutting_speed}
              onChange={handleInputChange('cutting_speed')}
              type="number"
            />
            <TextField
              label="Pierce Time (s)"
              value={formData.pierce_time}
              onChange={handleInputChange('pierce_time')}
              type="number"
            />
            <TextField
              label="Pierce Cost ($)"
              value={formData.pierce_cost}
              onChange={handleInputChange('pierce_cost')}
              type="number"
            />
            <TextField
              label="Quantity in Stock"
              value={formData.quantity_in_stock}
              onChange={handleInputChange('quantity_in_stock')}
              type="number"
            />
            <TextField
              label="Minimum Quantity"
              value={formData.min_quantity}
              onChange={handleInputChange('min_quantity')}
              type="number"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
