/**
 * Dashboard page - Stage 0
 * Project overview and recent quotes
 */

import React, { useState } from 'react';
import { Box, Typography, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import QuoteGrid from '../components/Dashboard/QuoteGrid';
import StatisticsChart from '../components/Dashboard/StatisticsChart';
import TasksList from '../components/Dashboard/TasksList';
import NewQuoteDialog from '../components/Dialogs/NewQuoteDialog';
import { MOCK_QUOTES } from '../data/mockData';

export default function Dashboard() {
  const navigate = useNavigate();
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);

  // Split quotes into two groups
  const manageQuotes = MOCK_QUOTES.filter((q) => q.status === 'Pending').slice(0, 5);
  const continueQuotes = MOCK_QUOTES.filter((q) => q.status === 'Accepted').slice(0, 5);

  const handleNewQuote = () => {
    setNewQuoteOpen(true);
  };

  const handleNext = () => {
    setNewQuoteOpen(false);
    // Navigate to File Upload page (Stage 3)
    navigate('/upload');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleNewQuote}>
          New Quote
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Top Left: Manage Quotes (Pending) */}
        <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
          <QuoteGrid title="Manage Quotes" data={manageQuotes} />
        </Grid>

        {/* Top Right: Continue Quotes (Accepted) */}
        <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
          <QuoteGrid title="Recent Accepted Quotes" data={continueQuotes} />
        </Grid>

        {/* Bottom Left: Statistics Chart */}
        <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
          <StatisticsChart />
        </Grid>

        {/* Bottom Right: Tasks List */}
        <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
          <TasksList />
        </Grid>
      </Grid>

      <NewQuoteDialog open={newQuoteOpen} onClose={() => setNewQuoteOpen(false)} onNext={handleNext} />
    </Box>
  );
}
