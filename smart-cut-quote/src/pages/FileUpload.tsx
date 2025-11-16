/**
 * File Upload page - Stage 2
 * Upload DXF files for the quote
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FileUploadButton from '../components/FileList/FileUploadButton';
import FileListGrid from '../components/FileList/FileListGrid';
import { useQuoteStore } from '../stores/quoteStore';

export default function FileUpload() {
  const navigate = useNavigate();
  const files = useQuoteStore((state) => state.files);

  const handleNext = () => {
    if (files.length > 0) {
      navigate('/preview');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          File Upload
        </Typography>
        <FileUploadButton />
      </Box>

      <Box sx={{ mb: 3 }}>
        <FileListGrid />
      </Box>

      {files.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
          >
            Next: Preview Files
          </Button>
        </Box>
      )}
    </Box>
  );
}
