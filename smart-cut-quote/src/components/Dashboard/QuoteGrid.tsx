/**
 * QuoteGrid Component
 * Displays a table of quotes with status indicators
 */

import React from 'react';
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
} from '@mui/material';
import { DashboardQuote } from '../../data/mockData';

interface QuoteGridProps {
  title: string;
  data: DashboardQuote[];
}

export default function QuoteGrid({ title, data }: QuoteGridProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Quote No</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((quote) => (
                <TableRow
                  key={quote.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{quote.quoteNo}</TableCell>
                  <TableCell>{quote.clientName}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
