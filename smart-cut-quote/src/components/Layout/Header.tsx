/**
 * Header component - Top AppBar with title and actions
 */

import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';

export default function Header() {
  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Smart Cut Quote
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton color="inherit" title="Save Quote">
            <SaveIcon />
          </IconButton>
          <IconButton color="inherit" title="Settings">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
