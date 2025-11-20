/**
 * Operations Library Tab
 * CRUD interface for managing operations
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
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

import {
  getAllOperations,
  createOperation,
  updateOperation,
  deleteOperation,
  Operation,
  OperationInput,
  OperationCostType,
} from '../../services/database';

const costTypes: { value: OperationCostType; label: string }[] = [
  { value: 'per_unit', label: 'Per Unit (flat fee)' },
  { value: 'per_area', label: 'Per Area ($/m2)' },
  { value: 'per_length', label: 'Per Length ($/m)' },
  { value: 'per_count', label: 'Per Count ($/piece)' },
  { value: 'time_based', label: 'Time Based (min × hourly rate)' },
];

interface OperationFormData {
  name: string;
  cost_type: OperationCostType;
  cost: string;
  time_minutes: string;
  description: string;
}

const initialFormData: OperationFormData = {
  name: '',
  cost_type: 'per_unit',
  cost: '',
  time_minutes: '',
  description: '',
};

export default function OperationsTab() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OperationFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllOperations();
      setOperations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const handleOpenDialog = (operation?: Operation) => {
    if (operation) {
      setEditingId(operation.id);
      setFormData({
        name: operation.name,
        cost_type: operation.cost_type,
        cost: operation.cost.toString(),
        time_minutes: operation.time_minutes?.toString() || '',
        description: operation.description || '',
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

  const handleSave = async () => {
    try {
      const input: OperationInput = {
        name: formData.name,
        cost_type: formData.cost_type,
        cost: parseFloat(formData.cost),
        time_minutes: formData.time_minutes ? parseFloat(formData.time_minutes) : undefined,
        description: formData.description || undefined,
      };

      if (editingId) {
        await updateOperation(editingId, input);
        setSuccess('Operation updated successfully');
      } else {
        await createOperation(input);
        setSuccess('Operation created successfully');
      }

      handleCloseDialog();
      loadOperations();
    } catch (err: any) {
      setError(err.message || 'Failed to save operation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this operation?')) return;

    try {
      await deleteOperation(id);
      setSuccess('Operation deleted successfully');
      loadOperations();
    } catch (err: any) {
      setError(err.message || 'Failed to delete operation');
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Operation', width: 150 },
    {
      field: 'cost_type',
      headerName: 'Cost Type',
      width: 180,
      valueFormatter: (value: string) => costTypes.find(t => t.value === value)?.label || value,
    },
    {
      field: 'cost',
      headerName: 'Cost ($)',
      width: 100,
      type: 'number',
      valueFormatter: (value: number) => `$${value.toFixed(2)}`,
    },
    { field: 'time_minutes', headerName: 'Time (min)', width: 100, type: 'number' },
    { field: 'description', headerName: 'Description', width: 200 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(params.row.id)} />,
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Operations Library</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadOperations}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Operation
          </Button>
        </Box>
      </Box>

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={operations}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Operation' : 'Add New Operation'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField
              label="Operation Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              select
              label="Cost Type"
              value={formData.cost_type}
              onChange={(e) => setFormData(prev => ({ ...prev, cost_type: e.target.value as OperationCostType }))}
              required
            >
              {costTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Cost ($)"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              type="number"
              required
            />
            {formData.cost_type === 'time_based' && (
              <TextField
                label="Time (minutes)"
                value={formData.time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, time_minutes: e.target.value }))}
                type="number"
              />
            )}
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editingId ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
