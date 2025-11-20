/**
 * Machine Configuration Tab
 * CRUD interface for managing machines
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
  getAllMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  Machine,
  MachineInput,
} from '../../services/database';

interface MachineFormData {
  name: string;
  hourly_rate: string;
  max_sheet_width: string;
  max_sheet_length: string;
  power_kw: string;
}

const initialFormData: MachineFormData = {
  name: '',
  hourly_rate: '',
  max_sheet_width: '1500',
  max_sheet_length: '6000',
  power_kw: '',
};

export default function MachineTab() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MachineFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMachines = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllMachines();
      setMachines(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const handleOpenDialog = (machine?: Machine) => {
    if (machine) {
      setEditingId(machine.id);
      setFormData({
        name: machine.name,
        hourly_rate: machine.hourly_rate.toString(),
        max_sheet_width: machine.max_sheet_width?.toString() || '',
        max_sheet_length: machine.max_sheet_length?.toString() || '',
        power_kw: machine.power_kw?.toString() || '',
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

  const handleInputChange = (field: keyof MachineFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      const input: MachineInput = {
        name: formData.name,
        hourly_rate: parseFloat(formData.hourly_rate),
        max_sheet_width: formData.max_sheet_width ? parseFloat(formData.max_sheet_width) : undefined,
        max_sheet_length: formData.max_sheet_length ? parseFloat(formData.max_sheet_length) : undefined,
        power_kw: formData.power_kw ? parseFloat(formData.power_kw) : undefined,
      };

      if (editingId) {
        await updateMachine(editingId, input);
        setSuccess('Machine updated successfully');
      } else {
        await createMachine(input);
        setSuccess('Machine created successfully');
      }

      handleCloseDialog();
      loadMachines();
    } catch (err: any) {
      setError(err.message || 'Failed to save machine');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;

    try {
      await deleteMachine(id);
      setSuccess('Machine deleted successfully');
      loadMachines();
    } catch (err: any) {
      setError(err.message || 'Failed to delete machine');
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Machine Name', width: 200 },
    {
      field: 'hourly_rate',
      headerName: 'Hourly Rate ($)',
      width: 130,
      type: 'number',
      valueFormatter: (value: number) => `$${value.toFixed(2)}/hr`,
    },
    { field: 'max_sheet_width', headerName: 'Max Width (mm)', width: 130, type: 'number' },
    { field: 'max_sheet_length', headerName: 'Max Length (mm)', width: 130, type: 'number' },
    { field: 'power_kw', headerName: 'Power (kW)', width: 100, type: 'number' },
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
        <Typography variant="h6">Machines</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadMachines}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Machine
          </Button>
        </Box>
      </Box>

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={machines}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Machine' : 'Add New Machine'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField label="Machine Name" value={formData.name} onChange={handleInputChange('name')} required />
            <TextField label="Hourly Rate ($)" value={formData.hourly_rate} onChange={handleInputChange('hourly_rate')} type="number" required />
            <TextField label="Max Sheet Width (mm)" value={formData.max_sheet_width} onChange={handleInputChange('max_sheet_width')} type="number" />
            <TextField label="Max Sheet Length (mm)" value={formData.max_sheet_length} onChange={handleInputChange('max_sheet_length')} type="number" />
            <TextField label="Power (kW)" value={formData.power_kw} onChange={handleInputChange('power_kw')} type="number" />
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
