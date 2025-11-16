/**
 * Client Selection page - Stage 1
 * Select or create a client for the quote
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function ClientSelection() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Client Selection
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Client selection interface will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
}
