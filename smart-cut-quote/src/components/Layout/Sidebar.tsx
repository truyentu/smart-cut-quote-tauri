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
  Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import HealingIcon from '@mui/icons-material/Healing';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuoteStore } from '../../stores/quoteStore';

const menuItems = [
  { id: 0, label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { id: 1, label: 'File Upload', icon: <UploadFileIcon />, path: '/upload' },
  { id: 2, label: 'File Healing', icon: <HealingIcon />, path: '/healing' },
  { id: 3, label: 'Part Library', icon: <LibraryBooksIcon />, path: '/library' },
  { id: 4, label: 'Nesting', icon: <GridOnIcon />, path: '/nesting' },
  { id: 5, label: 'PDF Export', icon: <PictureAsPdfIcon />, path: '/export' },
  { id: 6, label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
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
      <Toolbar /> {/* Spacer for AppBar */}
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
