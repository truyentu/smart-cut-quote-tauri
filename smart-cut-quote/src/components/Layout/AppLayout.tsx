/**
 * AppLayout component - Main application layout
 * Combines Sidebar, Header, and Stepper as per IMPLEMENTATION_PLAN.md section 6.1
 */

import React from 'react';
import { Box, Drawer } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';
import Stepper from './Stepper';

interface AppLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 240;

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box'
          }
        }}
      >
        <Sidebar />
      </Drawer>

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Stepper />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 3,
            backgroundColor: '#fafafa'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
