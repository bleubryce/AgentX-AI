import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import { MarketAnalysisFilters } from './MarketAnalysisFilters';

interface FilterPresetsProps {
  open: boolean;
  onClose: () => void;
  currentFilters: MarketAnalysisFilters;
  onLoadPreset: (preset: MarketAnalysisFilters) => void;
  presets: FilterPreset[];
  onSavePreset: (name: string, filters: MarketAnalysisFilters) => void;
  onDeletePreset: (id: string) => void;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: MarketAnalysisFilters;
  createdAt: string;
}

export const FilterPresets: React.FC<FilterPresetsProps> = ({
  open,
  onClose,
  currentFilters,
  onLoadPreset,
  presets,
  onSavePreset,
  onDeletePreset,
}) => {
  const [newPresetName, setNewPresetName] = React.useState('');
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim(), currentFilters);
      setNewPresetName('');
      setShowSaveDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BookmarkIcon sx={{ mr: 1 }} />
            Filter Presets
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">Saved Presets</Typography>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => setShowSaveDialog(true)}
              >
                Save Current Filters
              </Button>
            </Box>

            {presets.length === 0 ? (
              <Typography color="text.secondary" align="center">
                No saved presets yet
              </Typography>
            ) : (
              <List>
                {presets.map((preset) => (
                  <ListItem
                    key={preset.id}
                    button
                    onClick={() => onLoadPreset(preset.filters)}
                  >
                    <ListItemText
                      primary={preset.name}
                      secondary={`Created: ${formatDate(preset.createdAt)}`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Delete preset">
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePreset(preset.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            fullWidth
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Enter a name for this preset"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSavePreset}
            variant="contained"
            disabled={!newPresetName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 