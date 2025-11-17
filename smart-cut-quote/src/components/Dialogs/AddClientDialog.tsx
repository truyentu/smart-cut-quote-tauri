/**
 * AddClientDialog Component
 * Dialog for creating a new client
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
} from '@mui/material';
import { Client } from '../../types/quote';

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onAddClient: (client: Client) => void;
}

export default function AddClientDialog({ open, onClose, onAddClient }: AddClientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.company) {
      alert('Please fill in Name and Company fields');
      return;
    }

    // Create new client object
    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: formData.name,
      company: formData.company,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
    };

    onAddClient(newClient);

    // Reset form
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
    });

    onClose();
  };

  const handleCancel = () => {
    // Reset form on cancel
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Client</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid xs={12}>
              <TextField
                label="Name"
                fullWidth
                required
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Enter client name"
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Company"
                fullWidth
                required
                value={formData.company}
                onChange={handleChange('company')}
                placeholder="Enter company name"
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="Enter email address"
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="Enter phone number"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Add Client
        </Button>
      </DialogActions>
    </Dialog>
  );
}
