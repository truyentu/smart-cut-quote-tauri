/**
 * File Preview page - Stage 3
 * Preview uploaded DXF files
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function FilePreview() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Preview
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          DXF file preview will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
}
