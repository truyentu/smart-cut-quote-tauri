/**
 * Part Configuration page - Stage 5
 * Configure materials, quantities, and operations
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function PartConfig() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Part Configuration
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Part configuration interface (materials, quantities, operations) will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
}
