/**
 * Main App component
 * Sets up routing and application layout
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppLayout from './components/Layout/AppLayout';

// Import pages
import Dashboard from './pages/Dashboard';
import ClientSelection from './pages/ClientSelection';
import FileUpload from './pages/FileUpload';
import FilePreview from './pages/FilePreview';
import FileHealing from './pages/FileHealing';
import PartConfig from './pages/PartConfig';
import Nesting from './pages/Nesting';
import Summary from './pages/Summary';
import PdfExport from './pages/PdfExport';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/client" element={<ClientSelection />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/preview" element={<FilePreview />} />
            <Route path="/healing" element={<FileHealing />} />
            <Route path="/config" element={<PartConfig />} />
            <Route path="/nesting" element={<Nesting />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/export" element={<PdfExport />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
