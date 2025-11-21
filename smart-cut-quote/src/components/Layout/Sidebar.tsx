/**
 * Sidebar component - Navigation menu
 */

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import GridOnIcon from '@mui/icons-material/GridOn';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuoteStore } from '../../stores/quoteStore';

const menuItems = [
  { id: 0, label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { id: 1, label: 'File Upload', icon: <UploadFileIcon />, path: '/upload' },
  { id: 2, label: 'Part Library', icon: <LibraryBooksIcon />, path: '/library' },
  { id: 3, label: 'Nesting', icon: <GridOnIcon />, path: '/nesting' },
  { id: 4, label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentStage = useQuoteStore((state) => state.currentStage);

  const handleNavigation = (path: string, stage: number) => {
    navigate(path);
  };

  return (
    <Box sx={{ overflow: 'auto' }}>
      {/* Logo Box - Top Left Corner */}
      <Box
        sx={{
          bgcolor: '#c62828',
          color: 'white',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
          SmartCut
        </Typography>
        <Typography variant="caption" sx={{ fontStyle: 'italic', textAlign: 'center', mt: 0.5 }}>
          A product of T2N Group
        </Typography>
      </Box>

      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path, item.id)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
