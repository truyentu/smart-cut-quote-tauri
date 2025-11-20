/**
 * Summary Page - Final step in workflow
 * Left: Quote Details (client info, cost breakdown)
 * Right: Parts table with thumbnails
 * Save button exports PDF directly
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuoteStore } from '../stores/quoteStore';
import { generateAndSavePdf } from '../services/pdfService';
import { getAppSettings } from '../services/database';
import { QuoteSummary } from '../types/quote';
import DxfThumbnail from '../components/Viewer/DxfThumbnail';

export default function Summary() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const client = useQuoteStore((state) => state.client);
  const currentQuoteNumber = useQuoteStore((state) => state.currentQuoteNumber);
  const saveCurrentQuote = useQuoteStore((state) => state.saveCurrentQuote);
  const setSummary = useQuoteStore((state) => state.setSummary);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings from database
  const [taxRate, setTaxRate] = useState(10);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load tax rate from database settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAppSettings();
        setTaxRate(settings.default_tax_rate);
        setSettingsLoaded(true);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Calculate summary from individual file costs
  const summary: QuoteSummary | null = useMemo(() => {
    if (files.length === 0 || !settingsLoaded) return null;

    // Sum up all costs from individual parts
    let materialCost = 0;
    let cuttingCost = 0;
    let operationsCost = 0;

    files.forEach((file) => {
      if (file.totalCost) {
        // Estimate breakdown based on typical ratios
        // In production, store actual breakdown in file
        materialCost += file.totalCost * 0.4;
        cuttingCost += file.totalCost * 0.35;
        operationsCost += file.totalCost * 0.25;
      }
    });

    const subtotal = materialCost + cuttingCost + operationsCost + shipping;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    return {
      materialCost: Math.round(materialCost * 100) / 100,
      cuttingCost: Math.round(cuttingCost * 100) / 100,
      operationsCost: Math.round(operationsCost * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [files, taxRate, shipping, settingsLoaded]);

  // Update summary in store when calculated
  useEffect(() => {
    if (summary) {
      setSummary(summary);
    }
  }, [summary, setSummary]);

  // Save quote and generate PDF
  const handleSave = async () => {
    if (!summary) {
      setError('Missing required data for export');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Save quote to database first
      if (client) {
        const savedQuote = await saveCurrentQuote();
        console.log('Quote saved:', savedQuote.quoteNumber);
        setSaveSuccess(true);
      }

      // Generate and export PDF
      const result = await generateAndSavePdf({
        files,
        summary,
        quoteNumber: currentQuoteNumber || undefined,
        client: client || undefined,
        notes,
      });

      if (result) {
        setSuccess(true);
      } else {
        // User cancelled the save dialog
        setError('PDF export was cancelled');
      }
    } catch (err: any) {
      console.error('Failed to save and export:', err);
      setError(err.message || 'Failed to save and export PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/nesting');
  };

  // Show loading state while settings are being loaded
  if (!settingsLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading settings...</Typography>
      </Box>
    );
  }

  // Validation: Check if we have files
  if (files.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Quote Summary
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          No parts in the quote. Please add parts from the Upload page.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/upload')}>
            Back to Upload
          </Button>
        </Box>
      </Box>
    );
  }

  // Validation: Check if summary exists
  if (!summary) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Quote Summary
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Unable to calculate costs. Please ensure all parts have materials and machines assigned.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/library')}>
            Back to Part Library
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>
        Quote Summary
      </Typography>

      <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        {/* Left: Quote Details */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quote Details
              </Typography>

              {/* Quote Info */}
              <Box sx={{ mt: 2 }}>
                {currentQuoteNumber && (
                  <Typography variant="body2" gutterBottom>
                    Quote #: <strong>{currentQuoteNumber}</strong>
                  </Typography>
                )}
                <Typography variant="body2" gutterBottom>
                  Date: {new Date().toLocaleDateString()}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Client: <strong>{client?.name || 'CASH SALES'}</strong>
                </Typography>
                {client?.phone && (
                  <Typography variant="body2" gutterBottom>
                    Phone: {client.phone}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Cost Breakdown */}
              <Typography variant="subtitle2" gutterBottom>
                Cost Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Material:</Typography>
                  <Typography variant="body2">${summary.materialCost.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Cutting:</Typography>
                  <Typography variant="body2">${summary.cuttingCost.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Operations:</Typography>
                  <Typography variant="body2">${summary.operationsCost.toFixed(2)}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Shipping */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Shipping"
                  type="number"
                  value={shipping}
                  onChange={(e) => setShipping(Number(e.target.value))}
                  InputProps={{ startAdornment: '$' }}
                />
              </Box>

              {/* Subtotal, Tax, Total */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">${summary.subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tax ({taxRate}%):</Typography>
                  <Typography variant="body2">${summary.tax.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    ${summary.total.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Notes */}
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the quote..."
              />

              <Divider sx={{ my: 2 }} />

              {/* Save Button */}
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={loading}
                color="primary"
              >
                {loading ? 'Saving...' : 'Save & Export PDF'}
              </Button>

              {success && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                  Quote saved and PDF exported!
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Parts Table */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Parts ({files.length})
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={80}>Preview</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Unit</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id} hover>
                        <TableCell>
                          <Box
                            sx={{
                              width: 60,
                              height: 60,
                              border: '1px solid #eee',
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <DxfThumbnail filePath={file.path} size={60} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {file.name}
                          </Typography>
                          {file.metadata?.dimensions && (
                            <Typography variant="caption" color="text.secondary">
                              {file.metadata.dimensions.width.toFixed(1)} x{' '}
                              {file.metadata.dimensions.height.toFixed(1)} mm
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">{file.quantity}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {file.materialGroup || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {file.materialThickness ? `${file.materialThickness}mm` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          ${(file.unitCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="medium">
                            ${(file.totalCost || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Summary row */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <Typography variant="body1">
                  Total Quantity: <strong>{files.reduce((sum, f) => sum + f.quantity, 0)}</strong>
                </Typography>
                <Typography variant="body1" color="primary">
                  Grand Total: <strong>${files.reduce((sum, f) => sum + (f.totalCost || 0), 0).toFixed(2)}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3, pb: 2 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Nesting
        </Button>
      </Box>

      {/* Save success snackbar */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        message={`Quote saved: ${currentQuoteNumber}`}
      />
    </Box>
  );
}
