/**
 * Summary page - Stage 7
 * Review quote summary and cost breakdown
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuoteStore } from '../stores/quoteStore';
import { calculateTotalCost } from '../services/pricingService';
import { MOCK_MATERIALS, MOCK_MACHINES } from '../data/mockData';

export default function Summary() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);
  const nestingResult = useQuoteStore((state) => state.nestingResult);

  // Calculate costs
  const summary = useMemo(() => {
    if (!nestingResult) return null;
    return calculateTotalCost(files, nestingResult, MOCK_MATERIALS, MOCK_MACHINES);
  }, [files, nestingResult]);

  const handleNext = () => {
    navigate('/export');
  };

  const handleBack = () => {
    navigate('/nesting');
  };

  // Check if nesting has been completed
  if (!nestingResult) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Quote Summary
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

  // Check if all files have metadata
  const filesWithoutMetadata = files.filter((f) => !f.metadata);
  if (filesWithoutMetadata.length > 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Quote Summary
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Some files are missing metadata. Please go back to the Preview page to generate metadata for all files.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/preview')}>
            Back to Preview
          </Button>
        </Box>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Quote Summary
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Unable to calculate costs. Please ensure all parts have materials and machines assigned.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Quote Summary
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left: Parts List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Parts List
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Part</strong></TableCell>
                      <TableCell align="center"><strong>Qty</strong></TableCell>
                      <TableCell><strong>Material</strong></TableCell>
                      <TableCell><strong>Machine</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>{file.name}</TableCell>
                        <TableCell align="center">{file.quantity}</TableCell>
                        <TableCell>
                          {file.material ? (
                            <Typography variant="caption">
                              {file.material.name} ({file.material.thickness}mm)
                            </Typography>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{file.machine || 'N/A'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Nesting Info */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nesting Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Strip Width:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {nestingResult.stripWidth.toFixed(2)} mm
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Strip Height:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {nestingResult.stripHeight.toFixed(2)} mm
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Utilization:</Typography>
                  <Chip
                    label={`${nestingResult.utilization.toFixed(1)}%`}
                    color={nestingResult.utilization > 80 ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Items Placed:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {nestingResult.itemsPlaced}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Cost Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cost Breakdown
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Material Cost:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${summary.materialCost.toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Cutting Cost:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${summary.cuttingCost.toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Operations Cost:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${summary.operationsCost.toFixed(2)}
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Subtotal:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${summary.subtotal.toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Tax (5%):</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${summary.tax.toFixed(2)}
                  </Typography>
                </Box>

                <Divider sx={{ borderWidth: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h5" fontWeight="bold" color="primary.dark">
                    TOTAL:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.dark">
                    ${summary.total.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Alert severity="info" sx={{ mt: 2 }}>
            This quote is based on the nesting result and configured materials/machines. You can export this quote to PDF in the next step.
          </Alert>
        </Grid>
      </Grid>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Nesting
        </Button>
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext}>
          Next: Export PDF
        </Button>
      </Box>
    </Box>
  );
}
