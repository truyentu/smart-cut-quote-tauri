/**
 * Company Information Tab
 * Configure company details for PDF output
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Paper,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import { query, execute, CompanyInfo } from '../../services/database';

export default function CompanyTab() {
  const [company, setCompany] = useState<CompanyInfo>({
    company_name: '',
    business_no: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    email: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        setLoading(true);
        const results = await query<CompanyInfo>('SELECT * FROM company_info LIMIT 1');
        if (results.length > 0) {
          setCompany(results[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load company info');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);

      if (company.id) {
        // Update existing
        await execute(
          `UPDATE company_info SET
            company_name = ?, business_no = ?, address_line1 = ?, address_line2 = ?,
            city = ?, state = ?, zip = ?, country = ?, phone = ?, email = ?, website = ?,
            updated_at = datetime('now')
          WHERE id = ?`,
          [
            company.company_name, company.business_no, company.address_line1, company.address_line2,
            company.city, company.state, company.zip, company.country,
            company.phone, company.email, company.website, company.id,
          ]
        );
      } else {
        // Insert new
        await execute(
          `INSERT INTO company_info (
            company_name, business_no, address_line1, address_line2,
            city, state, zip, country, phone, email, website
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            company.company_name, company.business_no, company.address_line1, company.address_line2,
            company.city, company.state, company.zip, company.country,
            company.phone, company.email, company.website,
          ]
        );
      }

      setSuccess('Company information saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save company info');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CompanyInfo) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCompany({ ...company, [field]: e.target.value });
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Company Information
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        This information will appear on PDF quotes
      </Typography>

      <Box sx={{ display: 'grid', gap: 3, maxWidth: 600, mt: 2 }}>
        {/* Basic Info */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Company Details
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Company Name"
              value={company.company_name || ''}
              onChange={handleChange('company_name')}
              required
              fullWidth
            />
            <TextField
              label="Business Number (ABN/Tax ID)"
              value={company.business_no || ''}
              onChange={handleChange('business_no')}
              fullWidth
            />
          </Box>
        </Paper>

        {/* Address */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Address
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Address Line 1"
              value={company.address_line1 || ''}
              onChange={handleChange('address_line1')}
              fullWidth
            />
            <TextField
              label="Address Line 2"
              value={company.address_line2 || ''}
              onChange={handleChange('address_line2')}
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="City"
                value={company.city || ''}
                onChange={handleChange('city')}
              />
              <TextField
                label="State"
                value={company.state || ''}
                onChange={handleChange('state')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="ZIP / Postal Code"
                value={company.zip || ''}
                onChange={handleChange('zip')}
              />
              <TextField
                label="Country"
                value={company.country || ''}
                onChange={handleChange('country')}
              />
            </Box>
          </Box>
        </Paper>

        {/* Contact */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Contact Information
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Phone"
              value={company.phone || ''}
              onChange={handleChange('phone')}
              fullWidth
            />
            <TextField
              label="Email"
              value={company.email || ''}
              onChange={handleChange('email')}
              type="email"
              fullWidth
            />
            <TextField
              label="Website"
              value={company.website || ''}
              onChange={handleChange('website')}
              fullWidth
            />
          </Box>
        </Paper>

        {/* Save Button */}
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Company Info'}
        </Button>
      </Box>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
