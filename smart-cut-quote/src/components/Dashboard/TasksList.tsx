/**
 * TasksList Component
 * Displays a list of pending tasks
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
} from '@mui/material';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const MOCK_TASKS: Task[] = [
  {
    id: 't-1',
    text: 'Follow up with ABC Manufacturing on Q-2025-001',
    completed: false,
  },
  {
    id: 't-2',
    text: 'Review nesting optimization for Precision Engineering',
    completed: false,
  },
  {
    id: 't-3',
    text: 'Update material pricing for next month',
    completed: false,
  },
  {
    id: 't-4',
    text: 'Send quote Q-2025-007 to TechParts Industries',
    completed: false,
  },
  {
    id: 't-5',
    text: 'Schedule machine maintenance for Laser Cutter 1',
    completed: false,
  },
  {
    id: 't-6',
    text: 'Prepare monthly report for management',
    completed: false,
  },
];

export default function TasksList() {
  return (
    <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Pending Tasks
        </Typography>

        <List sx={{ mt: 1, flexGrow: 1, overflow: 'auto' }}>
          {MOCK_TASKS.map((task, index) => (
            <React.Fragment key={task.id}>
              <ListItem dense>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={task.completed}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText
                  primary={task.text}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: task.completed ? 'text.secondary' : 'text.primary',
                    sx: {
                      textDecoration: task.completed ? 'line-through' : 'none',
                    },
                  }}
                />
              </ListItem>
              {index < MOCK_TASKS.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
