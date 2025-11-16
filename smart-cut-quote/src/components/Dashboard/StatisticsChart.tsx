/**
 * StatisticsChart Component
 * Displays monthly quotes and revenue statistics using bar chart
 */

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MOCK_CHART_DATA } from '../../data/mockData';

export default function StatisticsChart() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Monthly Statistics
        </Typography>

        <Box sx={{ mt: 2, height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MOCK_CHART_DATA}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Volume (USD)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="quotes" fill="#1976d2" name="Sales Volume" />
              <Bar dataKey="revenue" fill="#dc004e" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
