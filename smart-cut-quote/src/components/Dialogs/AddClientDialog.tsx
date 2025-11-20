/**
 * AddClientDialog Component
 * Dialog for creating a new client with full details
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Grid,
  Typography,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import { ClientInput } from '../../services/database';

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (client: ClientInput) => Promise<void>;
}

const initialFormData = {
  company_name: '',
  phone: '',
  email: '',
  business_no: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_state: '',
  billing_zip: '',
  billing_country: '',
  additional_price_markup: '0',
  additional_material_markup: '0',
  quote_prefix: 'Q',
};

export default function AddClientDialog({ open, onClose, onSave }: AddClientDialogProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.company_name) {
      setError('Please enter company name');
      return;
    }

    try {
      setSaving(true);

      const input: ClientInput = {
        company_name: formData.company_name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        business_no: formData.business_no || undefined,
        billing_address_line1: formData.billing_address_line1 || undefined,
        billing_address_line2: formData.billing_address_line2 || undefined,
        billing_city: formData.billing_city || undefined,
        billing_state: formData.billing_state || undefined,
        billing_zip: formData.billing_zip || undefined,
        billing_country: formData.billing_country || undefined,
        additional_price_markup: parseFloat(formData.additional_price_markup) || 0,
        additional_material_markup: parseFloat(formData.additional_material_markup) || 0,
        quote_prefix: formData.quote_prefix || 'Q',
      };

      await onSave(input);

      // Reset form
      setFormData(initialFormData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Add New Client</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Company Information */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Company Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Company Name"
                fullWidth
                required
                value={formData.company_name}
                onChange={handleChange('company_name')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={handleChange('phone')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Business Number (ABN/Tax ID)"
                fullWidth
                value={formData.business_no}
                onChange={handleChange('business_no')}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Billing Address */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Billing Address
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address Line 1"
                fullWidth
                value={formData.billing_address_line1}
                onChange={handleChange('billing_address_line1')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address Line 2"
                fullWidth
                value={formData.billing_address_line2}
                onChange={handleChange('billing_address_line2')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="City"
                fullWidth
                value={formData.billing_city}
                onChange={handleChange('billing_city')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="State"
                fullWidth
                value={formData.billing_state}
                onChange={handleChange('billing_state')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="ZIP/Postal Code"
                fullWidth
                value={formData.billing_zip}
                onChange={handleChange('billing_zip')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Country"
                fullWidth
                value={formData.billing_country}
                onChange={handleChange('billing_country')}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Markup Settings */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Pricing Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Additional markup specific to this client
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Quote Prefix"
                fullWidth
                value={formData.quote_prefix}
                onChange={handleChange('quote_prefix')}
                helperText="e.g., Q, NCT"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Additional Price Markup (%)"
                fullWidth
                type="number"
                value={formData.additional_price_markup}
                onChange={handleChange('additional_price_markup')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Additional Material Markup (%)"
                fullWidth
                type="number"
                value={formData.additional_material_markup}
                onChange={handleChange('additional_material_markup')}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Add Client'}
        </Button>
      </DialogActions>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Dialog>
  );
}
