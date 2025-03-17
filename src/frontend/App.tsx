import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import LeadList from './components/leads/LeadList';
import LeadDetail from './components/leads/LeadDetail';
import LeadForm from './components/leads/LeadForm';
import LeadAnalytics from './components/leads/LeadAnalytics';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Auth
import AuthGuard from './components/auth/AuthGuard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              <Route path="leads">
                <Route index element={<LeadList />} />
                <Route path="new" element={<LeadForm />} />
                <Route path=":id" element={<LeadDetail />} />
                <Route path=":id/edit" element={<LeadForm isEdit />} />
                <Route path="analytics" element={<LeadAnalytics />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App; 