/**
 * Main App component
 * Sets up routing and application layout
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppLayout from './components/Layout/AppLayout';

// Import pages
import Dashboard from './pages/Dashboard';
import ClientSelection from './pages/ClientSelection';
import FileUpload from './pages/FileUpload';
import PartLibrary from './pages/PartLibrary';
import Nesting from './pages/Nesting';
import Summary from './pages/Summary';
import Settings from './pages/Settings';

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
            <Route path="/library" element={<PartLibrary />} />
            <Route path="/nesting" element={<Nesting />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
