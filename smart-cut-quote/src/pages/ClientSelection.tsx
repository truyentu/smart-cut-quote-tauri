/**
 * Client Selection page - Stage 1
 * Select or create a client for the quote
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Autocomplete,
  TextField,
  Card,
  CardContent,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import { MOCK_CLIENTS } from '../data/mockData';
import { Client } from '../types/quote';
import { useQuoteStore } from '../stores/quoteStore';

export default function ClientSelection() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const setClient = useQuoteStore((state) => state.setClient);

  const handleClientChange = (_event: any, value: Client | null) => {
    setSelectedClient(value);
    if (value) {
      setClient(value);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Client Selection
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Select a Client
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Search and select a client from the list below to start creating a quote.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Autocomplete
            options={MOCK_CLIENTS}
            getOptionLabel={(option) => `${option.name} - ${option.company || 'N/A'}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Client"
                placeholder="Type to search by name or company"
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.company}
                  </Typography>
                </Box>
              </li>
            )}
            value={selectedClient}
            onChange={handleClientChange}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={{ width: '100%' }}
          />
        </Box>

        {selectedClient && (
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Client Details
            </Typography>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedClient.name}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Company
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedClient.company || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedClient.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedClient.phone || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mt: 3 }}>
                  Client selected successfully! You can now proceed to the next step.
                </Alert>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
