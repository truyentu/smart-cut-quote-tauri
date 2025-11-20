/**
 * Dashboard page - Stage 0
 * Project overview and recent quotes
 */

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import QuoteGrid from '../components/Dashboard/QuoteGrid';
import StatisticsChart from '../components/Dashboard/StatisticsChart';
import TasksList from '../components/Dashboard/TasksList';
import NewQuoteDialog from '../components/Dialogs/NewQuoteDialog';
import { useQuoteStore } from '../stores/quoteStore';
import { DashboardQuote } from '../data/mockData';

export default function Dashboard() {
  const navigate = useNavigate();
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const savedQuotes = useQuoteStore((state) => state.savedQuotes);
  const loadAllSavedQuotes = useQuoteStore((state) => state.loadAllSavedQuotes);

  // Load saved quotes on mount
  useEffect(() => {
    loadAllSavedQuotes();
  }, [loadAllSavedQuotes]);

  // Convert saved quotes to dashboard format
  const dashboardQuotes: DashboardQuote[] = savedQuotes.map((q) => ({
    id: q.id,
    quoteNo: q.quoteNumber,
    clientName: q.clientName,
    company: q.company,
    amount: q.summary?.total || 0,
    status: q.status === 'accepted' ? 'Accepted' : 'Pending',
    date: q.createdAt.toLocaleDateString('en-AU'),
    createdBy: 'ADMIN',
  }));

  // Split quotes into two groups
  const manageQuotes = dashboardQuotes.filter((q) => q.status === 'Pending').slice(0, 5);
  const continueQuotes = dashboardQuotes.filter((q) => q.status === 'Accepted').slice(0, 5);

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
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <QuoteGrid title="Manage Quotes" data={manageQuotes} />
        </Grid>

        {/* Top Right: Continue Quotes (Accepted) */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <QuoteGrid title="Recent Accepted Quotes" data={continueQuotes} />
        </Grid>

        {/* Bottom Left: Statistics Chart */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <StatisticsChart />
        </Grid>

        {/* Bottom Right: Tasks List */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <TasksList />
        </Grid>
      </Grid>

      <NewQuoteDialog open={newQuoteOpen} onClose={() => setNewQuoteOpen(false)} onNext={handleNext} />
    </Box>
  );
}
