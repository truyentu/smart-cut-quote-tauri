/**
 * PDF Export page - Stage 8
 * Export quote to PDF
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuoteStore } from '../stores/quoteStore';
import { calculateTotalCost } from '../services/pricingService';
import { generateAndSavePdf } from '../services/pdfService';
import { MOCK_MATERIALS, MOCK_MACHINES } from '../data/mockData';

export default function PdfExport() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const nestingResult = useQuoteStore((state) => state.nestingResult);
  const client = useQuoteStore((state) => state.client);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate summary
  const summary = useMemo(() => {
    if (!nestingResult) return null;
    return calculateTotalCost(files, nestingResult, MOCK_MATERIALS, MOCK_MACHINES);
  }, [files, nestingResult]);

  const handleGeneratePdf = async () => {
    if (!summary || !nestingResult) {
      setError('Missing required data for PDF generation');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const result = await generateAndSavePdf({
        files,
        summary,
        nestingSvgPath: nestingResult.svgPath,
        clientName: client?.name,
      });

      setLoading(false);

      if (result) {
        setSuccess(true);
      } else {
        // User cancelled the save dialog
        setError('PDF export was cancelled');
      }
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setLoading(false);
      setError(err.message || 'Failed to generate PDF');
    }
  };

  const handleBack = () => {
    navigate('/summary');
  };

  // Validation: Check if summary and nesting result exist
  if (!nestingResult) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          PDF Export
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Nesting optimization has not been completed yet. Please go back to the Nesting page and run the optimization first.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/nesting')}>
            Back to Nesting
          </Button>
        </Box>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          PDF Export
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Unable to calculate costs. Please ensure all parts have materials and machines assigned.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/part-config')}>
            Back to Part Config
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        PDF Export
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left: Preview Summary */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quote Summary Preview
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Client: {client?.name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Date: {new Date().toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Parts: {files.length}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Material Cost:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${summary.materialCost.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Cutting Cost:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${summary.cuttingCost.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Operations Cost:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${summary.operationsCost.toFixed(2)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight="bold">
                    Total:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    ${summary.total.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Export Actions */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export to PDF
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Click the button below to generate and save your quote as a PDF document. The PDF will include:
              </Typography>

              <Box component="ul" sx={{ mt: 2, pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Complete parts list with quantities
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Detailed cost breakdown
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Nesting layout visualization
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
                  onClick={handleGeneratePdf}
                  disabled={loading}
                >
                  {loading ? 'Generating PDF...' : 'Generate and Save PDF'}
                </Button>
              </Box>

              {success && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                  PDF exported successfully!
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Alert severity="info" sx={{ mt: 2 }}>
            The PDF will be saved to your chosen location. You can generate the PDF multiple times if needed.
          </Alert>
        </Grid>
      </Grid>

      {/* Navigation button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Summary
        </Button>
      </Box>
    </Box>
  );
}
