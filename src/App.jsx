import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import themeConfig from './theme/themeConfig';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { SettingsProvider } from './contexts/SettingsContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Gamification from './pages/Gamification';
import AuditLogs from './pages/AuditLogs';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Purchasing from './pages/Purchasing';
import Discounts from './pages/Discounts';
import Shifts from './pages/Shifts';
import Stores from './pages/Stores';
import Payroll from './pages/Payroll';

import POSLayout from './layouts/POSLayout';
import POS from './pages/POS';

// Placeholder Pages

function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <CurrencyProvider>
        <SettingsProvider>
          <AuthProvider>
            <WebSocketProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/pos" element={<POSLayout />}>
                  <Route index element={<POS />} />
                </Route>

                <Route path="/" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="products" element={<Products />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="purchasing" element={<Purchasing />} />
                  <Route path="discounts" element={<Discounts />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="shifts" element={<Shifts />} />
                  <Route path="gamification" element={<Gamification />} />
                  <Route path="stores" element={<Stores />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
            </WebSocketProvider>
          </AuthProvider>
        </SettingsProvider>
      </CurrencyProvider>
    </ConfigProvider>
  );
}

export default App;