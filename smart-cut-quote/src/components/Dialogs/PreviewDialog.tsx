/**
 * Preview Dialog Component
 * Shows detailed preview of a DXF part with tabs for different information
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DxfFile } from '../../types/quote';
import DxfViewer from '../Viewer/DxfViewer';

interface PreviewDialogProps {
  file: DxfFile | null;
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preview-tabpanel-${index}`}
      aria-labelledby={`preview-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PreviewDialog({ file, open, onClose }: PreviewDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [notes, setNotes] = useState('');
  const [addToReport, setAddToReport] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!file) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: '800px',
        },
      }}
    >
      {/* Dialog Title */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{file.name}</Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="preview tabs">
          <Tab label="Part Detail" id="preview-tab-0" />
          <Tab label="Cost Detail" id="preview-tab-1" />
          <Tab label="Tech Details" id="preview-tab-2" />
        </Tabs>
      </Box>

      {/* Dialog Content */}
      <DialogContent sx={{ p: 3, overflow: 'auto' }}>
        {/* Tab 1: Part Detail */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Large DXF Viewer */}
            <Box
              sx={{
                width: '100%',
                height: 400,
                border: '1px solid #ddd',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
              }}
            >
              <DxfViewer filePath={file.path} fileId={file.id} />
            </Box>

            {/* Part Information */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  File Name
                </Typography>
                <Typography variant="body1">{file.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Dimensions
                </Typography>
                <Typography variant="body1">
                  {file.metadata?.dimensions
                    ? `${file.metadata.dimensions.width.toFixed(2)} × ${file.metadata.dimensions.height.toFixed(2)} mm`
                    : 'Calculating...'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Area
                </Typography>
                <Typography variant="body1">
                  {file.metadata?.area ? `${file.metadata.area.toFixed(2)} mm²` : 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="body1">{file.quantity}</Typography>
              </Box>
            </Box>

            {/* Notes TextField */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              placeholder="Add notes for this part..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              variant="outlined"
            />

            {/* Add to Report Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={addToReport}
                  onChange={(e) => setAddToReport(e.target.checked)}
                />
              }
              label="Add to report"
            />
          </Box>
        </TabPanel>

        {/* Tab 2: Cost Detail (Placeholder) */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Cost Breakdown
            </Typography>
            <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Cost detail calculations will be displayed here
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Material Cost:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    $0.00
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Cutting Cost:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    $0.00
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Operations Cost:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    $0.00
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mt: 1,
                    pt: 1,
                    borderTop: '1px solid #ddd',
                  }}
                >
                  <Typography variant="body1" fontWeight="bold">
                    Unit Cost:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    ${file.unitCost?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight="bold">
                    Total Cost (x{file.quantity}):
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    ${file.totalCost?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Tab 3: Tech Details (Placeholder) */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Technical Specifications
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Material
                </Typography>
                <Typography variant="body1">
                  {file.material
                    ? `${file.material.name} - ${file.material.grade} - ${file.material.thickness}mm`
                    : 'Not configured'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Machine
                </Typography>
                <Typography variant="body1">{file.machine || 'Not configured'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Cut Length
                </Typography>
                <Typography variant="body1">
                  {file.metadata?.cutLength
                    ? `${file.metadata.cutLength.toFixed(2)} mm`
                    : 'Calculating...'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pierce Count
                </Typography>
                <Typography variant="body1">
                  {file.metadata?.pierceCount ?? 'Calculating...'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Material Markup
                </Typography>
                <Typography variant="body1">{file.materialMarkup || 0}%</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Price Markup
                </Typography>
                <Typography variant="body1">{file.priceMarkup || 0}%</Typography>
              </Box>
            </Box>

            {/* Technical notes placeholder */}
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Additional technical details and processing instructions will be displayed here
              </Typography>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}
