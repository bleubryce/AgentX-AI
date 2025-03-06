import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Lightbulb as LightbulbIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { MarketInsight, MarketHealth } from './types';

interface MarketInsightsProps {
  insights: MarketInsight;
  marketHealth: MarketHealth;
}

export const MarketInsights: React.FC<MarketInsightsProps> = ({
  insights,
  marketHealth,
}) => {
  const getHealthColor = (health: MarketHealth) => {
    switch (health) {
      case MarketHealth.HOT:
        return 'success';
      case MarketHealth.BALANCED:
        return 'info';
      case MarketHealth.COOL:
        return 'warning';
      case MarketHealth.STAGNANT:
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Market Insights
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Market Summary</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                {insights.market_summary}
              </Typography>
              <Chip
                label={`Market Health: ${marketHealth}`}
                color={getHealthColor(marketHealth)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Key Findings</Typography>
              </Box>
              <List>
                {insights.key_findings.map((finding, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={finding} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LightbulbIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Opportunities</Typography>
              </Box>
              <List>
                {insights.opportunities.map((opportunity, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <LightbulbIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={opportunity} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Risks</Typography>
              </Box>
              <List>
                {insights.risks.map((risk, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary={risk} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              <List>
                {insights.recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 