/**
 * Client Selection page - Stage 1
 * Select or create a client for the quote
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Autocomplete,
  TextField,
  Card,
  CardContent,
  Divider,
  Alert,
  Grid,
  Button,
  CircularProgress,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import PercentIcon from '@mui/icons-material/Percent';

import { getAllClients, createClient, Client as DbClient, ClientInput } from '../services/database';
import { Client } from '../types/quote';
import { useQuoteStore } from '../stores/quoteStore';
import AddClientDialog from '../components/Dialogs/AddClientDialog';

// Convert database client to quote client type
function dbClientToQuoteClient(dbClient: DbClient): Client {
  return {
    id: dbClient.id,
    name: dbClient.company_name,
    company: dbClient.company_name,
    email: dbClient.email || '',
    phone: dbClient.phone || '',
  };
}

export default function ClientSelection() {
  const [clients, setClients] = useState<DbClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<DbClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const setClient = useQuoteStore((state) => state.setClient);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllClients();
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleClientChange = (_event: any, value: DbClient | null) => {
    setSelectedClient(value);
    if (value) {
      setClient(dbClientToQuoteClient(value));
    }
  };

  const handleAddClient = async (input: ClientInput) => {
    try {
      await createClient(input);
      setDialogOpen(false);
      loadClients();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create client');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading clients...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Client Selection
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Select a Client
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search and select a client from the list below to start creating a quote.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Client
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Autocomplete
            options={clients}
            getOptionLabel={(option) => option.company_name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Client"
                placeholder="Type to search by company name"
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body1">{option.company_name}</Typography>
                  {option.email && (
                    <Typography variant="body2" color="text.secondary">
                      {option.email}
                    </Typography>
                  )}
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Company
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedClient.company_name}
                        </Typography>
                      </Box>
                    </Box>

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

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Quote Prefix
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedClient.quote_prefix || 'Q'}
                        </Typography>
                      </Box>
                    </Box>

                    {(selectedClient.additional_price_markup > 0 || selectedClient.additional_material_markup > 0) && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PercentIcon sx={{ mr: 2, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Additional Price Markup
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedClient.additional_price_markup}%
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PercentIcon sx={{ mr: 2, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Additional Material Markup
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedClient.additional_material_markup}%
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    )}
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

      {/* Add Client Dialog */}
      <AddClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAddClient}
      />
    </Box>
  );
}
