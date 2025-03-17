import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import LeadList from './components/leads/LeadList';
import LeadDetail from './pages/LeadDetail';
import AddLead from './pages/AddLead';
import EditLead from './pages/EditLead';
import LeadAnalytics from './components/leads/LeadAnalytics';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Auth
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } />
                
                <Route path="leads" element={
                  <PrivateRoute>
                    <LeadList />
                  </PrivateRoute>
                } />
                
                <Route path="leads/new" element={
                  <PrivateRoute>
                    <AddLead />
                  </PrivateRoute>
                } />
                
                <Route path="leads/:id" element={
                  <PrivateRoute>
                    <LeadDetail />
                  </PrivateRoute>
                } />
                
                <Route path="leads/:id/edit" element={
                  <PrivateRoute>
                    <EditLead />
                  </PrivateRoute>
                } />
                
                <Route path="analytics" element={
                  <PrivateRoute>
                    <LeadAnalytics />
                  </PrivateRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App; 