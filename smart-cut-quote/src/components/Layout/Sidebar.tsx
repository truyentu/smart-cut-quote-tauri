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
import PreviewIcon from '@mui/icons-material/Preview';
import HealingIcon from '@mui/icons-material/Healing';
import SettingsIcon from '@mui/icons-material/Settings';
import GridOnIcon from '@mui/icons-material/GridOn';
import SummarizeIcon from '@mui/icons-material/Summarize';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuoteStore } from '../../stores/quoteStore';

const menuItems = [
  { id: 0, label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { id: 1, label: 'File Upload', icon: <UploadFileIcon />, path: '/upload' },
  { id: 2, label: 'File Preview', icon: <PreviewIcon />, path: '/preview' },
  { id: 3, label: 'File Healing', icon: <HealingIcon />, path: '/healing' },
  { id: 4, label: 'Part Config', icon: <SettingsIcon />, path: '/config' },
  { id: 5, label: 'Nesting', icon: <GridOnIcon />, path: '/nesting' },
  { id: 6, label: 'Summary', icon: <SummarizeIcon />, path: '/summary' },
  { id: 7, label: 'PDF Export', icon: <PictureAsPdfIcon />, path: '/export' },
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
