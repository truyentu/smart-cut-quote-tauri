/**
 * QuoteGrid Component
 * Displays a table of quotes with status indicators
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DoneIcon from '@mui/icons-material/Done';
import { DashboardQuote } from '../../data/mockData';
import { useQuoteStore } from '../../stores/quoteStore';
import { useNavigate } from 'react-router-dom';
import { startProduction, completeProduction } from '../../services/database/quoteRepository';
import type { QuoteStatus } from '../../types/quote';

interface QuoteGridProps {
  title: string;
  data: DashboardQuote[];
}

// Status color configuration
const STATUS_CONFIG: Record<QuoteStatus, { color: string; bgColor: string; label: string }> = {
  draft: { color: '#757575', bgColor: '#f5f5f5', label: 'Draft' },
  sent: { color: '#9e9e9e', bgColor: '#fafafa', label: 'Sent' },
  accepted: { color: '#4caf50', bgColor: '#e8f5e9', label: 'Accepted' },
  rejected: { color: '#f44336', bgColor: '#ffebee', label: 'Rejected' },
};

// Production status color configuration
const PRODUCTION_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  '': { color: '#757575', bgColor: '#f5f5f5', label: 'Pending' },
  in_production: { color: '#ff9800', bgColor: '#fff3e0', label: 'In Production' },
  completed: { color: '#2196f3', bgColor: '#e3f2fd', label: 'Completed' },
};

export default function QuoteGrid({ title, data }: QuoteGridProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const updateQuoteStatus = useQuoteStore((state) => state.updateQuoteStatus);
  const deleteQuoteById = useQuoteStore((state) => state.deleteQuoteById);
  const loadAllSavedQuotes = useQuoteStore((state) => state.loadAllSavedQuotes);
  const loadQuoteForEditing = useQuoteStore((state) => state.loadQuoteForEditing);

  const handleRefresh = () => {
    setSearchTerm('');
    loadAllSavedQuotes();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, quoteId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuoteId(quoteId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuoteId(null);
  };

  const handleAccept = async () => {
    if (selectedQuoteId) {
      await updateQuoteStatus(selectedQuoteId, 'accepted');
    }
    handleMenuClose();
  };

  const handleReject = async () => {
    if (selectedQuoteId) {
      await updateQuoteStatus(selectedQuoteId, 'rejected');
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedQuoteId && confirm('Are you sure you want to delete this quote?')) {
      await deleteQuoteById(selectedQuoteId);
    }
    handleMenuClose();
  };

  const handleEdit = async () => {
    if (selectedQuoteId) {
      try {
        // Wait for quote to be fully loaded before navigating
        await loadQuoteForEditing(selectedQuoteId);
        handleMenuClose();
        // Navigate to Client Selection to allow changing client
        navigate('/client');
      } catch (error) {
        console.error('Failed to load quote for editing:', error);
        alert('Failed to load quote. Please try again.');
        handleMenuClose();
      }
    }
  };

  const handleStartProduction = async (quoteId: string) => {
    try {
      await startProduction(quoteId);
      await loadAllSavedQuotes(); // Refresh the quotes list
    } catch (error) {
      console.error('Failed to start production:', error);
      alert('Failed to start production. Please try again.');
    }
  };

  const handleCompleteProduction = async (quoteId: string) => {
    try {
      await completeProduction(quoteId);
      await loadAllSavedQuotes(); // Refresh the quotes list
    } catch (error) {
      console.error('Failed to complete production:', error);
      alert('Failed to complete production. Please try again.');
    }
  };

  // Helper function to get status chip style
  const getStatusChipStyle = (status: string) => {
    const config = STATUS_CONFIG[status as QuoteStatus] || STATUS_CONFIG.draft;
    return {
      label: config.label,
      sx: {
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 500,
      },
    };
  };

  // Helper function to get production status chip style
  const getProductionChipStyle = (productionStatus: string | null) => {
    const config = PRODUCTION_CONFIG[productionStatus || ''] || PRODUCTION_CONFIG[''];
    return {
      label: config.label,
      sx: {
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 500,
      },
    };
  };

  const filteredData = data.filter((quote) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.quoteNo.toLowerCase().includes(searchLower) ||
      quote.company.toLowerCase().includes(searchLower) ||
      quote.createdBy.toLowerCase().includes(searchLower) ||
      quote.status.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 200 }}
            />
            <IconButton size="small" onClick={handleRefresh} title="Refresh">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Quote No.</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Production</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((quote) => {
                const statusChip = getStatusChipStyle(quote.status);
                const productionChip = getProductionChipStyle(quote.productionStatus || null);

                // Determine which action buttons to show
                const showAcceptReject = quote.status === 'sent';
                const showStartProduction = quote.status === 'accepted' && !quote.productionStatus;
                const showCompleteProduction = quote.productionStatus === 'in_production';

                return (
                  <TableRow
                    key={quote.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>{quote.date}</TableCell>
                    <TableCell>{quote.quoteNo}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {quote.company}
                      </Box>
                    </TableCell>
                    <TableCell align="right">${quote.amount.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={statusChip.label}
                        size="small"
                        sx={statusChip.sx}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {quote.productionStatus && (
                        <Chip
                          label={productionChip.label}
                          size="small"
                          sx={productionChip.sx}
                        />
                      )}
                    </TableCell>
                    <TableCell>{quote.createdBy}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                        {/* Accept/Reject buttons for sent quotes */}
                        {showAcceptReject && (
                          <>
                            <Tooltip title="Accept Quote">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={async () => {
                                  await updateQuoteStatus(quote.id, 'accepted');
                                  await loadAllSavedQuotes();
                                }}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Quote">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                  await updateQuoteStatus(quote.id, 'rejected');
                                  await loadAllSavedQuotes();
                                }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {/* Start Production button for accepted quotes */}
                        {showStartProduction && (
                          <Tooltip title="Start Production">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleStartProduction(quote.id)}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Complete Production button for in-production quotes */}
                        {showCompleteProduction && (
                          <Tooltip title="Mark Completed">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleCompleteProduction(quote.id)}
                            >
                              <DoneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* More menu for additional actions */}
                        <Tooltip title="More Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, quote.id)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Edit Quote</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAccept}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Accept Quote</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleReject}>
          <ListItemIcon>
            <CancelIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Reject Quote</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Quote</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}
