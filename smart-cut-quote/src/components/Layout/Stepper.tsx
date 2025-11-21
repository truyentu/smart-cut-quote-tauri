/**
 * Stepper component - Progress indicator for quote stages
 * 4 icons: Upload → Library → Nesting → Summary
 * Dashboard is not included in stepper
 */

import { Box, styled } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import GridViewIcon from '@mui/icons-material/GridView';
import DescriptionIcon from '@mui/icons-material/Description';

const steps = [
  { label: 'Upload', path: '/upload', icon: UploadFileIcon },
  { label: 'Library', path: '/library', icon: SettingsIcon },
  { label: 'Nesting', path: '/nesting', icon: GridViewIcon },
  { label: 'Summary', path: '/summary', icon: DescriptionIcon },
];

const StepperContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-evenly',
  alignItems: 'center',
  padding: theme.spacing(3, 6),
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #e0e0e0',
}));

const StepItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed',
})<{ active?: boolean; completed?: boolean }>(
  ({ active, completed }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    opacity: active ? 1 : completed ? 0.8 : 0.4,
    '&:hover': {
      opacity: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  })
);

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  width: 72,
  height: 72,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: active ? '#1976d2' : '#e0e0e0',
  color: active ? '#fff' : '#666',
  marginBottom: 8,
  transition: 'all 0.2s ease',
  '& svg': {
    fontSize: 36,
  },
}));

const StepLabel = styled('span', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  color: active ? '#1976d2' : '#666',
}));

const Connector = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'completed',
})<{ completed?: boolean }>(({ completed }) => ({
  width: 120,
  height: 3,
  backgroundColor: completed ? '#1976d2' : '#e0e0e0',
  margin: '0 16px',
  marginBottom: 32,
}));

export default function Stepper() {
  const navigate = useNavigate();
  const location = useLocation();

  // Find current step index based on path
  const currentStepIndex = steps.findIndex((step) => step.path === location.pathname);

  // Don't show stepper on settings page only
  if (location.pathname === '/settings') {
    return null;
  }

  const handleStep = (path: string) => {
    navigate(path);
  };

  return (
    <StepperContainer>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <Box key={step.label} sx={{ display: 'flex', alignItems: 'center' }}>
            <StepItem
              active={isActive}
              completed={isCompleted}
              onClick={() => handleStep(step.path)}
            >
              <IconWrapper active={isActive || isCompleted}>
                <Icon />
              </IconWrapper>
              <StepLabel active={isActive}>{step.label}</StepLabel>
            </StepItem>
            {index < steps.length - 1 && <Connector completed={isCompleted} />}
          </Box>
        );
      })}
    </StepperContainer>
  );
}
