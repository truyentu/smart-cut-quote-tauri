/**
 * PDF Export page - Stage 8
 * Export quote to PDF
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function PdfExport() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        PDF Export
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          PDF generation and export will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
}
