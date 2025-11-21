/**
 * TasksList Component
 * Displays a list of pending tasks with real data integration
 */

import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { Task, TaskPriority, TaskCategory, CreateTaskInput, UpdateTaskInput } from '../../types/task';
import { getAllTasks, completeTask, createTask, updateTask } from '../../services/database/taskRepository';
import { useQuoteStore } from '../../stores/quoteStore';

// Priority color mapping
const PRIORITY_CONFIG = {
  urgent: { color: 'error' as const, icon: '🔴', label: 'Urgent' },
  high: { color: 'warning' as const, icon: '🟡', label: 'High' },
  normal: { color: 'success' as const, icon: '🟢', label: 'Normal' },
  low: { color: 'info' as const, icon: '🔵', label: 'Low' },
};

// Category labels
const CATEGORY_LABELS: Record<TaskCategory, string> = {
  follow_up: 'Follow Up',
  production: 'Production',
  client_relation: 'Client Relations',
  system_maintenance: 'System',
  general: 'General',
};

export default function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [newTask, setNewTask] = useState<CreateTaskInput>({
    title: '',
    description: '',
    priority: 'normal',
    category: 'general',
  });

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get current quote info for linking tasks
  const currentQuoteId = useQuoteStore((state) => state.currentQuoteId);
  const currentQuoteNumber = useQuoteStore((state) => state.currentQuoteNumber);
  const client = useQuoteStore((state) => state.client);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...tasks];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.quoteNumber?.toLowerCase().includes(query) ||
          task.clientName?.toLowerCase().includes(query)
      );
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((task) => task.priority === priorityFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter((task) => task.category === categoryFilter);
    }

    setFilteredTasks(result);
  }, [tasks, searchQuery, priorityFilter, categoryFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedTasks = await getAllTasks({ status: 'pending' });
      setTasks(loadedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if task is overdue
  const isOverdue = (task: Task): boolean => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  // Format due date display
  const formatDueDate = (date: Date | undefined): string => {
    if (!date) return '';
    const dueDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time to compare dates only
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return `Overdue ${daysOverdue}d`;
    } else if (dueDate.getTime() === today.getTime()) {
      return 'Due today';
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return 'Due tomorrow';
    } else {
      return `Due ${dueDate.toLocaleDateString()}`;
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      // Remove completed task from the list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError('Failed to complete task. Please try again.');
    }
  };

  const handleOpenDialog = () => {
    // Auto-link to current quote and client if available
    setNewTask({
      title: '',
      description: '',
      priority: 'normal',
      category: 'general',
      quoteId: currentQuoteId || undefined,
      clientId: client?.id || undefined,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewTask({
      title: '',
      description: '',
      priority: 'normal',
      category: 'general',
    });
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      return;
    }

    try {
      const created = await createTask(newTask);
      setTasks((prev) => [created, ...prev]);
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task. Please try again.');
    }
  };

  // Edit task handlers
  const handleOpenEditDialog = (task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) {
      return;
    }

    try {
      const updates: UpdateTaskInput = {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        category: editingTask.category,
        dueDate: editingTask.dueDate,
      };

      const updated = await updateTask(editingTask.id, updates);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      handleCloseEditDialog();
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again.');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  // Count active filters
  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0);

  return (
    <>
      <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header with search and actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Pending Tasks ({filteredTasks.length})</Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Toggle filters">
                <IconButton
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                  color={activeFiltersCount > 0 ? 'primary' : 'default'}
                >
                  <FilterIcon />
                  {activeFiltersCount > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontSize: '0.6rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {activeFiltersCount}
                    </Box>
                  )}
                </IconButton>
              </Tooltip>
              <Button size="small" startIcon={<AddIcon />} onClick={handleOpenDialog} variant="outlined">
                Add Task
              </Button>
            </Stack>
          </Box>

          {/* Search bar */}
          <TextField
            size="small"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 1 }}
          />

          {/* Filters */}
          {showFilters && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                    label="Priority"
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="urgent">🔴 Urgent</MenuItem>
                    <MenuItem value="high">🟡 High</MenuItem>
                    <MenuItem value="normal">🟢 Normal</MenuItem>
                    <MenuItem value="low">🔵 Low</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as TaskCategory | 'all')}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="follow_up">Follow Up</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                    <MenuItem value="client_relation">Client Relations</MenuItem>
                    <MenuItem value="system_maintenance">System Maintenance</MenuItem>
                    <MenuItem value="general">General</MenuItem>
                  </Select>
                </FormControl>
                {activeFiltersCount > 0 && (
                  <Button size="small" onClick={handleClearFilters} variant="text">
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
              <CircularProgress size={40} />
            </Box>
          ) : filteredTasks.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {tasks.length === 0
                  ? 'No pending tasks. Great job!'
                  : 'No tasks match your filters.'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ mt: 1, flexGrow: 1, overflow: 'auto' }}>
              {filteredTasks.map((task, index) => (
                <React.Fragment key={task.id}>
                  <ListItem
                    dense
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleOpenEditDialog(task)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={false}
                        onChange={() => handleToggleTask(task.id)}
                        tabIndex={-1}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <span>{task.title}</span>
                          <Chip
                            label={PRIORITY_CONFIG[task.priority].label}
                            size="small"
                            color={PRIORITY_CONFIG[task.priority].color}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={CATEGORY_LABELS[task.category]}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          {task.dueDate && (
                            <Chip
                              icon={<ClockIcon sx={{ fontSize: '0.9rem' }} />}
                              label={formatDueDate(task.dueDate)}
                              size="small"
                              color={isOverdue(task) ? 'error' : 'default'}
                              variant={isOverdue(task) ? 'filled' : 'outlined'}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          {task.quoteNumber && (
                            <Chip
                              label={`Quote: ${task.quoteNumber}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          {task.clientName && (
                            <Chip
                              label={task.clientName}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={task.description || undefined}
                      primaryTypographyProps={{
                        variant: 'body2',
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                      }}
                    />
                  </ListItem>
                  {index < filteredTasks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Task Title"
              fullWidth
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
              autoFocus
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                  label="Priority"
                >
                  <MenuItem value="urgent">🔴 Urgent</MenuItem>
                  <MenuItem value="high">🟡 High</MenuItem>
                  <MenuItem value="normal">🟢 Normal</MenuItem>
                  <MenuItem value="low">🔵 Low</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value as TaskCategory })}
                  label="Category"
                >
                  <MenuItem value="follow_up">Follow Up</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                  <MenuItem value="client_relation">Client Relations</MenuItem>
                  <MenuItem value="system_maintenance">System Maintenance</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={newTask.dueDate ? new Date(newTask.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) =>
                setNewTask({ ...newTask, dueDate: e.target.value ? new Date(e.target.value) : undefined })
              }
              InputLabelProps={{ shrink: true }}
            />
            {currentQuoteId && currentQuoteNumber && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This task will be linked to Quote: {currentQuoteNumber}
                {client && ` (${client.name})`}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={!newTask.title.trim()}>
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          {editingTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Task Title"
                fullWidth
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                required
                autoFocus
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              />
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={editingTask.priority}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })
                    }
                    label="Priority"
                  >
                    <MenuItem value="urgent">🔴 Urgent</MenuItem>
                    <MenuItem value="high">🟡 High</MenuItem>
                    <MenuItem value="normal">🟢 Normal</MenuItem>
                    <MenuItem value="low">🔵 Low</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editingTask.category}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, category: e.target.value as TaskCategory })
                    }
                    label="Category"
                  >
                    <MenuItem value="follow_up">Follow Up</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                    <MenuItem value="client_relation">Client Relations</MenuItem>
                    <MenuItem value="system_maintenance">System Maintenance</MenuItem>
                    <MenuItem value="general">General</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                value={
                  editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    dueDate: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
              {editingTask.quoteNumber && (
                <Alert severity="info">Linked to Quote: {editingTask.quoteNumber}</Alert>
              )}
              {editingTask.clientName && (
                <Alert severity="info">Client: {editingTask.clientName}</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleUpdateTask}
            variant="contained"
            disabled={!editingTask || !editingTask.title.trim()}
          >
            Update Task
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
