/**
 * Summary Page - Final step in workflow
 * Left: Quote Details (client info, cost breakdown)
 * Right: Parts table with thumbnails
 * Save button exports PDF directly
 */

import { useState, useEffect } from 'react';
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
import { formatCurrency } from '../lib/formatCurrency';

export default function Summary() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const client = useQuoteStore((state) => state.client);
  const currentQuoteId = useQuoteStore((state) => state.currentQuoteId);
  const currentQuoteNumber = useQuoteStore((state) => state.currentQuoteNumber);
  const saveCurrentQuote = useQuoteStore((state) => state.saveCurrentQuote);
  const updateCurrentQuote = useQuoteStore((state) => state.updateCurrentQuote);
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
  const [calculatingCosts, setCalculatingCosts] = useState(false);
  const [summary, setSummaryState] = useState<QuoteSummary | null>(null);

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

  // Calculate costs when component mounts or files change
  useEffect(() => {
    const calculateCosts = () => {
      if (files.length === 0 || !settingsLoaded) return;

      setCalculatingCosts(true);
      try {
        // Sum up pre-calculated costs from files (already calculated in PartLibrary)
        const filesTotal = files.reduce((sum, f) => sum + (f.totalCost || 0), 0);

        // Add shipping to the subtotal
        const subtotalWithShipping = filesTotal + shipping;
        const taxWithShipping = subtotalWithShipping * (taxRate / 100);
        const totalWithShipping = subtotalWithShipping + taxWithShipping;

        const summaryData: QuoteSummary = {
          materialCost: 0,  // Breakdown not available from pre-calculated costs
          cuttingCost: 0,
          operationsCost: 0,
          shipping: Math.round(shipping * 100) / 100,
          subtotal: Math.round(subtotalWithShipping * 100) / 100,
          tax: Math.round(taxWithShipping * 100) / 100,
          total: Math.round(totalWithShipping * 100) / 100,
        };

        setSummaryState(summaryData);
        setSummary(summaryData);

        console.log('✅ Costs aggregated from files:', summaryData);
      } catch (err) {
        console.error('Failed to calculate costs:', err);
        setError('Failed to calculate costs. Please ensure all parts have prices calculated.');
      } finally {
        setCalculatingCosts(false);
      }
    };

    calculateCosts();
  }, [files, settingsLoaded, shipping, taxRate, setSummary]);

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

      // Save or update quote to database first
      if (client) {
        if (currentQuoteId) {
          // Update existing quote
          await updateCurrentQuote({ notes });
          console.log('Quote updated:', currentQuoteNumber);
          setSaveSuccess(true);
        } else {
          // Create new quote
          const savedQuote = await saveCurrentQuote(notes);
          console.log('Quote saved:', savedQuote.quoteNumber);
          setSaveSuccess(true);
        }
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

  // Show loading state while settings are being loaded or costs are calculating
  if (!settingsLoaded || calculatingCosts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>
          {!settingsLoaded ? 'Loading settings...' : 'Calculating costs...'}
        </Typography>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4">
          Quote Summary
        </Typography>
        {currentQuoteId && (
          <Alert severity="info" sx={{ py: 0 }}>
            Editing Quote {currentQuoteNumber}
          </Alert>
        )}
      </Box>

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
                  <Typography variant="body2">{formatCurrency(summary.materialCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Cutting:</Typography>
                  <Typography variant="body2">{formatCurrency(summary.cuttingCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Operations:</Typography>
                  <Typography variant="body2">{formatCurrency(summary.operationsCost)}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Shipping */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Shipping (VNĐ)"
                  type="number"
                  value={shipping}
                  onChange={(e) => setShipping(Number(e.target.value))}
                  helperText="Enter shipping cost"
                />
              </Box>

              {/* Subtotal, Tax, Total */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">{formatCurrency(summary.subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tax ({taxRate}%):</Typography>
                  <Typography variant="body2">{formatCurrency(summary.tax)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(summary.total)}
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
                {loading
                  ? (currentQuoteId ? 'Updating...' : 'Saving...')
                  : (currentQuoteId ? 'Update & Export PDF' : 'Save & Export PDF')
                }
              </Button>

              {success && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                  {currentQuoteId ? 'Quote updated and PDF exported!' : 'Quote saved and PDF exported!'}
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
                          {formatCurrency(file.unitCost || 0)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="medium">
                            {formatCurrency(file.totalCost || 0)}
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
                  Grand Total: <strong>{formatCurrency(files.reduce((sum, f) => sum + (f.totalCost || 0), 0))}</strong>
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
