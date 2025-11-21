/**
 * Dashboard page - Stage 0
 * Project overview with draft quotes, active quotes, and customer analytics
 */

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import QuoteGrid from '../components/Dashboard/QuoteGrid';
import CustomerAnalytics from '../components/Dashboard/CustomerAnalytics';
import NewQuoteDialog from '../components/Dialogs/NewQuoteDialog';
import { useQuoteStore } from '../stores/quoteStore';
import { DashboardQuote } from '../data/mockData';
import type { QuoteStatus, ProductionStatus } from '../types/quote';

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
    status: (q.status || 'draft') as QuoteStatus,
    productionStatus: (q.productionStatus || null) as ProductionStatus,
    date: q.createdAt.toLocaleDateString('en-AU'),
    createdBy: 'ADMIN',
  }));

  // Split quotes into three sections per the documentation

  // Section 1: Draft Quotes (limit 50)
  const draftQuotes = dashboardQuotes
    .filter((q) => q.status === 'draft')
    .slice(0, 50);

  // Section 2: Active Quotes with priority sorting (limit 100)
  // Priority order as specified in documentation
  const activeQuotes = dashboardQuotes
    .filter((q) => q.status !== 'draft')
    .sort((a, b) => {
      const getPriority = (quote: DashboardQuote): number => {
        // Priority 1: Accepted waiting for production
        if (quote.status === 'accepted' && !quote.productionStatus) return 1;
        // Priority 2: In production
        if (quote.productionStatus === 'in_production') return 2;
        // Priority 3: Sent (waiting client response)
        if (quote.status === 'sent') return 3;
        // Priority 4: Rejected
        if (quote.status === 'rejected') return 4;
        // Priority 5: Completed
        if (quote.productionStatus === 'completed') return 5;
        return 6;
      };

      return getPriority(a) - getPriority(b);
    })
    .slice(0, 100);

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

      {/* Section 1: Draft Quotes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Draft Quotes ({draftQuotes.length})
        </Typography>
        <QuoteGrid title="Recent Drafts" data={draftQuotes} />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Section 2: Active Quotes (Priority Sorted) */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Active Quotes ({activeQuotes.length})
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Priority: Accepted → In Production → Sent → Rejected → Completed
        </Typography>
        <QuoteGrid title="All Active Quotes" data={activeQuotes} />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Section 3: Customer Analytics */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Customer Analytics
        </Typography>
        <CustomerAnalytics />
      </Box>

      <NewQuoteDialog open={newQuoteOpen} onClose={() => setNewQuoteOpen(false)} onNext={handleNext} />
    </Box>
  );
}
