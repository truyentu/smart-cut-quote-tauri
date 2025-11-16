/**
 * Stepper component - Progress indicator for quote stages
 */

import React from 'react';
import {
  Box,
  Stepper as MuiStepper,
  Step,
  StepLabel,
  StepButton
} from '@mui/material';
import { useQuoteStore } from '../../stores/quoteStore';
import { useNavigate } from 'react-router-dom';

const steps = [
  { label: 'Dashboard', path: '/' },
  { label: 'Upload', path: '/upload' },
  { label: 'Preview', path: '/preview' },
  { label: 'Healing', path: '/healing' },
  { label: 'Config', path: '/config' },
  { label: 'Nesting', path: '/nesting' },
  { label: 'Summary', path: '/summary' },
  { label: 'Export', path: '/export' },
];

export default function Stepper() {
  const navigate = useNavigate();
  const currentStage = useQuoteStore((state) => state.currentStage);
  const setStage = useQuoteStore((state) => state.setStage);

  const handleStep = (step: number, path: string) => {
    setStage(step);
    navigate(path);
  };

  return (
    <Box sx={{ width: '100%', py: 2, px: 3, backgroundColor: '#f5f5f5' }}>
      <MuiStepper activeStep={currentStage} alternativeLabel>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepButton onClick={() => handleStep(index, step.path)}>
              <StepLabel>{step.label}</StepLabel>
            </StepButton>
          </Step>
        ))}
      </MuiStepper>
    </Box>
  );
}
