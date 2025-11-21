/**
 * CustomerAnalytics Component
 * Search clients by phone and display comprehensive analytics
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Paper,
  Autocomplete,
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  searchClientsByPhone,
  getCustomerAnalytics,
} from '../../services/database/analyticsRepository';
import type {
  ClientSearchResult,
  CustomerAnalytics as CustomerAnalyticsType,
  AnalyticsPeriod,
} from '../../types/analytics';
import { formatCurrency } from '../../lib/formatCurrency';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string; days?: number }[] = [
  { value: '30_days', label: '30 Days', days: 30 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
  { value: 'all_time', label: 'All Time' },
];

export default function CustomerAnalytics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('3_months');
  const [analytics, setAnalytics] = useState<CustomerAnalyticsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search clients by phone
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchClientsByPhone(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search clients:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load analytics when client is selected
  const handleClientSelect = async (client: ClientSearchResult | null) => {
    setSelectedClient(client);

    if (!client) {
      setAnalytics(null);
      return;
    }

    setLoading(true);
    try {
      const periodDays = PERIOD_OPTIONS.find((p) => p.value === period)?.days;
      const data = await getCustomerAnalytics(client.id, periodDays);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load customer analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload analytics when period changes
  const handlePeriodChange = async (_event: React.MouseEvent<HTMLElement>, newPeriod: AnalyticsPeriod | null) => {
    if (!newPeriod || !selectedClient) return;

    setPeriod(newPeriod);
    setLoading(true);
    try {
      const periodDays = PERIOD_OPTIONS.find((p) => p.value === newPeriod)?.days;
      const data = await getCustomerAnalytics(selectedClient.id, periodDays);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load customer analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ height: '100%', width: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Customer Analytics
        </Typography>

        {/* Phone Search */}
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            freeSolo
            options={searchResults}
            getOptionLabel={(option) =>
              typeof option === 'string'
                ? option
                : `${option.phone} - ${option.name} (${option.company || 'No company'})`
            }
            loading={searchLoading}
            value={selectedClient}
            onChange={(_event, newValue) => {
              if (typeof newValue === 'string') {
                handleSearchChange(newValue);
              } else {
                handleClientSelect(newValue);
              }
            }}
            onInputChange={(_event, newInputValue) => {
              handleSearchChange(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by phone number..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {option.phone} - {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.company || 'No company'} • {option.totalQuotes} quotes
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Box>

        {/* Period Filter */}
        {selectedClient && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={handlePeriodChange}
              size="small"
              disabled={loading}
            >
              {PERIOD_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No Client Selected */}
        {!selectedClient && !loading && (
          <Alert severity="info">
            Search for a customer by phone number to view their analytics
          </Alert>
        )}

        {/* Analytics Data */}
        {selectedClient && !loading && analytics && (
          <>
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Total Quotes */}
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <AssignmentIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h5" fontWeight={600}>
                    {analytics.quotes.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Quotes
                  </Typography>
                </Paper>
              </Grid>

              {/* Accepted Quotes */}
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <CheckCircleIcon sx={{ fontSize: 32, mb: 1, color: '#4caf50' }} />
                  <Typography variant="h5" fontWeight={600} color="#4caf50">
                    {analytics.quotes.accepted}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Accepted ({analytics.financial.conversionRate.toFixed(1)}%)
                  </Typography>
                </Paper>
              </Grid>

              {/* Rejected Quotes */}
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                  <Typography variant="h5" fontWeight={600} color="#f44336">
                    {analytics.quotes.rejected}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rejected
                  </Typography>
                </Paper>
              </Grid>

              {/* Completed Orders */}
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                  <Typography variant="h5" fontWeight={600} color="#2196f3">
                    {analytics.quotes.completed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Financial Metrics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Completed Revenue */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AttachMoneyIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Completed Revenue
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(analytics.financial.completedRevenue)}
                  </Typography>
                </Paper>
              </Grid>

              {/* In Production Value */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      In Production
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {formatCurrency(analytics.financial.inProductionValue)}
                  </Typography>
                </Paper>
              </Grid>

              {/* Average Order Value */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Avg Order Value
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={600} color="primary.main">
                    {formatCurrency(analytics.financial.averageOrderValue)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Timeline Chart Placeholder */}
            {analytics.timeline.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Monthly Trend
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {analytics.timeline.length} months of data available
                </Typography>
                {/* TODO: Add chart visualization (recharts, chart.js, etc.) */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" align="center" display="block">
                    Chart visualization coming soon
                  </Typography>
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* No Data */}
        {selectedClient && !loading && !analytics && (
          <Alert severity="warning">
            No analytics data found for this customer
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
