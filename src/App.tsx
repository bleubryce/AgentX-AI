import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import SalesOpportunityPage from './pages/SalesOpportunityPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import LeadGenerationPage from './pages/LeadGenerationPage';
import ReportsPage from './pages/ReportsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer}>
      <List>
        <ListItem button component={Link} to="/">
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/sales">
          <ListItemIcon>
            <BusinessIcon />
          </ListItemIcon>
          <ListItemText primary="Sales Opportunities" />
        </ListItem>
        <ListItem button component={Link} to="/leads">
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Lead Generation" />
        </ListItem>
        <ListItem button component={Link} to="/reports">
          <ListItemIcon>
            <AssessmentIcon />
          </ListItemIcon>
          <ListItemText primary="Reports" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed">
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={toggleDrawer}
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div">
                  Lead Generation & Sales Platform
                </Typography>
              </Toolbar>
            </AppBar>
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={toggleDrawer}
            >
              {drawer}
            </Drawer>
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                width: '100%',
                mt: 8
              }}
            >
              <ErrorBoundary>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <LeadGenerationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all route for 404 */}
                  <Route
                    path="*"
                    element={
                      <div className="min-h-screen flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                          <p className="text-gray-600 mb-8">
                            The page you're looking for doesn't exist or has been moved.
                          </p>
                        </div>
                      </div>
                    }
                  />
                </Routes>
              </ErrorBoundary>
            </Box>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

// Placeholder components for other routes
const Dashboard = () => (
  <Container>
    <Typography variant="h4" gutterBottom>Dashboard</Typography>
    <Typography paragraph>
      Welcome to the Lead Generation & Sales Platform. Use the navigation menu to access different sections.
    </Typography>
  </Container>
);

const LeadGeneration = () => (
  <Container>
    <Typography variant="h4" gutterBottom>Lead Generation</Typography>
    <Typography paragraph>
      Lead generation functionality will be implemented in a future phase.
    </Typography>
  </Container>
);

const Reports = () => (
  <Container>
    <Typography variant="h4" gutterBottom>Reports</Typography>
    <Typography paragraph>
      Reporting functionality will be implemented in a future phase.
    </Typography>
  </Container>
);

export default App; 