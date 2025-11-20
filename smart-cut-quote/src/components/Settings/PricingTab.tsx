/**
 * Pricing Configuration Tab
 * Configure default markup, tax, and pricing strategy
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
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import { getAppSettings, updateAppSettings, AppSettings } from '../../services/database';

export default function PricingTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getAppSettings();
        setSettings(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await updateAppSettings(settings);
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AppSettings) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!settings) return;

    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setSettings({ ...settings, [field]: value });
  };

  if (loading || !settings) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pricing Configuration
      </Typography>

      <Box sx={{ display: 'grid', gap: 3, maxWidth: 600 }}>
        {/* Markup Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Default Markup
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Price Markup (%)"
              type="number"
              value={settings.default_price_markup}
              onChange={handleChange('default_price_markup')}
              helperText="Applied to final subtotal"
            />
            <TextField
              label="Material Markup (%)"
              type="number"
              value={settings.default_material_markup}
              onChange={handleChange('default_material_markup')}
              helperText="Applied to material cost"
            />
          </Box>
        </Paper>

        {/* Tax Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Tax Configuration
          </Typography>
          <TextField
            label="Tax Rate (%)"
            type="number"
            value={settings.default_tax_rate}
            onChange={handleChange('default_tax_rate')}
            helperText="Applied after discounts"
            fullWidth
          />
        </Paper>

        {/* Order Settings */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Order Settings
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Minimum Order Amount ($)"
              type="number"
              value={settings.minimum_order_amount}
              onChange={handleChange('minimum_order_amount')}
            />
            <TextField
              label="Default Validity (days)"
              type="number"
              value={settings.default_validity_days}
              onChange={handleChange('default_validity_days')}
            />
          </Box>
        </Paper>

        {/* Pricing Strategy */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Pricing Strategy
          </Typography>
          <FormControl>
            <RadioGroup
              value={settings.pricing_strategy}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pricing_strategy: e.target.value as AppSettings['pricing_strategy'],
                })
              }
            >
              <FormControlLabel
                value="hybrid"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Hybrid (Recommended)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uses full sheet if utilization {'>'} threshold, otherwise uses area
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="sheet_based"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Sheet-based</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Always charge for full sheet
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="utilization_based"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Utilization-based</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Only charge for used area
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {settings.pricing_strategy === 'hybrid' && (
            <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Min Utilization Threshold (%)"
                type="number"
                value={settings.min_utilization_threshold}
                onChange={handleChange('min_utilization_threshold')}
              />
              <TextField
                label="Scrap Value (%)"
                type="number"
                value={settings.scrap_value_percent}
                onChange={handleChange('scrap_value_percent')}
              />
            </Box>
          )}
        </Paper>

        {/* Currency Settings */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Currency
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Currency Symbol"
              value={settings.currency_symbol}
              onChange={handleChange('currency_symbol')}
            />
            <TextField
              label="Currency Code"
              value={settings.currency_code}
              onChange={handleChange('currency_code')}
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
          {saving ? 'Saving...' : 'Save Settings'}
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
