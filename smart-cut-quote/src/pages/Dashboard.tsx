/**
 * Dashboard page - Stage 0
 * Project overview and recent quotes
 */

import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" paragraph>
          Welcome to Smart Cut Quote! Start a new quote by selecting a client.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/client')}
        >
          Start New Quote
        </Button>
      </Paper>
    </Box>
  );
}
