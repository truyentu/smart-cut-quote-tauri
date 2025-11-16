/**
 * Summary page - Stage 7
 * Review quote summary and cost breakdown
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function Summary() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Quote Summary
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Cost breakdown and quote summary will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
}
