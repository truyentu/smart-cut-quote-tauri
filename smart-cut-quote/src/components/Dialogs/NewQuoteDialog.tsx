/**
 * NewQuoteDialog Component
 * Dialog for selecting or creating a client to start a new quote
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Client } from '../../types/quote';
import { useQuoteStore } from '../../stores/quoteStore';
import AddClientDialog from './AddClientDialog';
import { getAllClients, createClient, ClientInput } from '../../services/database';

interface NewQuoteDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: () => void;
}

export default function NewQuoteDialog({ open, onClose, onNext }: NewQuoteDialogProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const setClient = useQuoteStore((state) => state.setClient);
  const resetQuote = useQuoteStore((state) => state.resetQuote);

  // Load clients from database
  const loadClients = useCallback(async () => {
    try {
      const dbClients = await getAllClients();
      const mappedClients: Client[] = dbClients.map((c) => ({
        id: c.id,
        name: c.company_name,
        company: c.company_name,
        email: c.email,
        phone: c.phone,
      }));
      setClients(mappedClients);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open, loadClients]);

  const handleClientChange = (_event: any, value: Client | null) => {
    setSelectedClient(value);
  };

  const handleSaveClient = async (clientInput: ClientInput) => {
    const newClientId = await createClient(clientInput);
    const newClient: Client = {
      id: newClientId,
      name: clientInput.company_name,
      company: clientInput.company_name,
      email: clientInput.email,
      phone: clientInput.phone,
    };
    // Reload clients and select new one
    await loadClients();
    setSelectedClient(newClient);
    setAddClientOpen(false);
  };

  const handleNext = () => {
    if (!selectedClient) {
      alert('Please select a client to continue');
      return;
    }

    // Reset quote state and set new client
    resetQuote();
    setClient(selectedClient);

    // Close dialog and proceed
    onNext();
  };

  const handleClose = () => {
    // Reset selection on close
    setSelectedClient(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>New Quote Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select an existing client or create a new one to start a quote.
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => `${option.name} - ${option.company || 'N/A'}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Client"
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
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => setAddClientOpen(true)}
              >
                Create New Client
              </Button>
            </Box>

            {selectedClient && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Client:
                </Typography>
                <Typography variant="body2">
                  <strong>{selectedClient.name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedClient.company}
                </Typography>
                {selectedClient.email && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedClient.email}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleNext} variant="contained" color="primary" disabled={!selectedClient}>
            Next
          </Button>
        </DialogActions>
      </Dialog>

      <AddClientDialog open={addClientOpen} onClose={() => setAddClientOpen(false)} onSave={handleSaveClient} />
    </>
  );
}
