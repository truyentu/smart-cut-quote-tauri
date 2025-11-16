/**
 * File Upload page - Stage 2
 * Upload DXF files for the quote
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function FileUpload() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Upload
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          File upload interface will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
}
