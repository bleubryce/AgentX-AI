import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/analytics/Dashboard';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import ForgotPassword from '../components/auth/ForgotPassword';
import ResetPassword from '../components/auth/ResetPassword';
import Profile from '../components/user/Profile';
import Settings from '../components/user/Settings';
import Subscriptions from '../components/subscriptions/Subscriptions';
import SubscriptionDetails from '../components/subscriptions/SubscriptionDetails';
import Payments from '../components/payments/Payments';
import PaymentDetails from '../components/payments/PaymentDetails';
import Reports from '../components/reports/Reports';
import ReportDetails from '../components/reports/ReportDetails';
import LeadList from '../components/leads/LeadList';
import LeadDetail from '../components/leads/LeadDetail';
import LeadForm from '../components/leads/LeadForm';
import NotFound from '../components/common/NotFound';
import ProtectedRoute from './ProtectedRoute';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* User routes */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        
        {/* Subscription routes */}
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetails />} />
        
        {/* Payment routes */}
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:id" element={<PaymentDetails />} />
        
        {/* Report routes */}
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportDetails />} />
        
        {/* Lead routes */}
        <Route path="leads" element={<LeadList />} />
        <Route path="leads/new" element={<LeadForm />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="leads/:id/edit" element={<LeadForm isEdit={true} />} />
      </Route>
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes; 