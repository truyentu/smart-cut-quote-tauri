/**
 * StatisticsChart Component
 * Displays monthly quotes and revenue statistics using bar chart
 */

import { useState, useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        // Only update if dimensions are valid (> 0)
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ width: offsetWidth, height: offsetHeight });
        }
      }
    };

    // Initial measurement with small delay to ensure layout is complete
    const timer = setTimeout(updateDimensions, 50);

    // Set up ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
          Monthly Statistics
        </Typography>

        <Box
          ref={containerRef}
          sx={{ flexGrow: 1, width: '100%', minHeight: 300, position: 'relative' }}
        >
          {dimensions.width > 0 && dimensions.height > 0 && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
