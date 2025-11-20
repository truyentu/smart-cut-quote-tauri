/**
 * Settings Page
 * Configuration for materials, machines, operations, pricing, and company info
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import InventoryIcon from '@mui/icons-material/Inventory';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';

import MaterialStockTab from '../components/Settings/MaterialStockTab';
import MachineTab from '../components/Settings/MachineTab';
import OperationsTab from '../components/Settings/OperationsTab';
import PricingTab from '../components/Settings/PricingTab';
import CompanyTab from '../components/Settings/CompanyTab';

import { getDatabase } from '../services/database';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function Settings() {
  const [tabValue, setTabValue] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize database connection
    const initDb = async () => {
      try {
        await getDatabase();
        setDbReady(true);
      } catch (err: any) {
        console.error('Failed to connect to database:', err);
        setError(err.message || 'Failed to connect to database');
      }
    };

    initDb();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Database Error</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  if (!dbReady) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 400,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Connecting to database...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Settings & Configuration
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<InventoryIcon />}
            label="Materials"
            {...a11yProps(0)}
            iconPosition="start"
          />
          <Tab
            icon={<PrecisionManufacturingIcon />}
            label="Machines"
            {...a11yProps(1)}
            iconPosition="start"
          />
          <Tab
            icon={<BuildIcon />}
            label="Operations"
            {...a11yProps(2)}
            iconPosition="start"
          />
          <Tab
            icon={<AttachMoneyIcon />}
            label="Pricing"
            {...a11yProps(3)}
            iconPosition="start"
          />
          <Tab
            icon={<BusinessIcon />}
            label="Company"
            {...a11yProps(4)}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          <MaterialStockTab />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <MachineTab />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <OperationsTab />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <PricingTab />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <CompanyTab />
        </TabPanel>
      </Box>
    </Box>
  );
}
