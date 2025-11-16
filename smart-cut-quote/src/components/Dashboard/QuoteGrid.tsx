/**
 * QuoteGrid Component
 * Displays a table of quotes with status indicators
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  TextField,
  IconButton,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DashboardQuote } from '../../data/mockData';

interface QuoteGridProps {
  title: string;
  data: DashboardQuote[];
}

export default function QuoteGrid({ title, data }: QuoteGridProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleRefresh = () => {
    setSearchTerm('');
  };

  const filteredData = data.filter((quote) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.quoteNo.toLowerCase().includes(searchLower) ||
      quote.company.toLowerCase().includes(searchLower) ||
      quote.createdBy.toLowerCase().includes(searchLower) ||
      quote.status.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 200 }}
            />
            <IconButton size="small" onClick={handleRefresh} title="Refresh">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Quote No.</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell>Created By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((quote) => (
                <TableRow
                  key={quote.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{quote.date}</TableCell>
                  <TableCell>{quote.quoteNo}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {quote.company}
                    </Box>
                  </TableCell>
                  <TableCell align="right">${quote.amount.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={quote.status}
                      color={quote.status === 'Accepted' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{quote.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
