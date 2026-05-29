import React, { useState, useEffect } from 'react';
import { Layout, Typography, Space, Button, Avatar, Dropdown } from 'antd';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff, Clock, Store, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext';
import { offlineSyncService } from '../services/OfflineSyncService';
import { CloudOff, RefreshCw, DollarSign } from 'lucide-react';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

const POSLayout = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const { currency, changeCurrency } = useCurrency();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingOrders, setPendingOrders] = useState(offlineSyncService.getOfflineOrders().length);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const handleOfflineUpdate = () => {
      setPendingOrders(offlineSyncService.getOfflineOrders().length);
    };
    
    window.addEventListener('offline-orders-updated', handleOfflineUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('offline-orders-updated', handleOfflineUpdate);
    };
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'dashboard', label: 'Back to Dashboard', onClick: () => navigate('/') },
    { type: 'divider' },
    { key: 'logout', label: <span style={{ color: '#ef4444' }}>Log Out</span>, onClick: handleLogout },
  ];

  const currencyMenuItems = Object.values(CURRENCIES).map(c => ({
    key: c.code,
    label: `${c.code} (${c.symbol.trim()})`,
    onClick: () => changeCurrency(c.code)
  }));

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* POS Header */}
      <Header style={{ 
        padding: '0 16px', 
        background: '#1e293b', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        height: 60,
        lineHeight: '60px'
      }}>
        {/* Left Side: Brand & Back Button */}
        <Space size={16} align="center">
          <Button 
            type="text" 
            icon={<ArrowLeft size={18} />} 
            onClick={() => navigate('/')}
            style={{ color: 'var(--text-secondary)' }}
          />
          <Space align="center" size={8}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', borderRadius: 6 }} />
            <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
              MMNEXT <Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>POS</Text>
            </Title>
          </Space>
          <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.1)', height: 24, margin: '0 8px' }} />
          <Space align="center" size={6} style={{ color: 'var(--text-secondary)' }}>
            <Store size={16} />
            <Text type="secondary">Main Store</Text>
          </Space>
        </Space>

        {/* Right Side: Status, Time, User */}
        <Space size={24} align="center">
          {/* Connection Status */}
          <Space size={6} style={{ color: isConnected && offlineSyncService.isOnline ? '#10b981' : '#ef4444' }}>
            {isConnected && offlineSyncService.isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            <Text style={{ color: 'inherit', fontSize: 12, fontWeight: 500 }}>
              {isConnected && offlineSyncService.isOnline ? 'Online' : 'Offline'}
            </Text>
          </Space>

          {/* Pending Offline Orders */}
          {pendingOrders > 0 && (
            <Button 
              type="primary" 
              danger 
              size="small" 
              icon={<RefreshCw size={14} className={offlineSyncService.syncing ? 'spin' : ''} />}
              onClick={() => offlineSyncService.syncOrders()}
              loading={offlineSyncService.syncing}
              style={{ borderRadius: 12, fontSize: 12, fontWeight: 600, border: 'none' }}
            >
              Sync {pendingOrders}
            </Button>
          )}

          {/* Current Time */}
          <Space size={6} style={{ color: 'var(--text-primary)' }}>
            <Clock size={16} color="var(--text-secondary)" />
            <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </Space>

          {/* Currency Switcher */}
          <Dropdown menu={{ items: currencyMenuItems }} placement="bottomRight" arrow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, fontWeight: 600 }} className="hover-lift">
              <span>{currency}</span>
            </div>
          </Dropdown>

          {/* User Profile */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }} className="hover-lift">
              <Avatar size={30} icon={<User size={16} />} style={{ backgroundColor: '#3b82f6' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#fff' }}>{user.firstName || 'Cashier'}</Text>
                <Text type="secondary" style={{ fontSize: 11, lineHeight: 1 }}>Register 1</Text>
              </div>
            </div>
          </Dropdown>
        </Space>
      </Header>

      {/* POS Content Area */}
      <Content style={{ height: 'calc(100vh - 60px)', overflow: 'hidden', background: 'var(--bg-default)' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

// Helper component missing from antd imports
const Divider = ({ type, style }) => (
  <div style={{ 
    ...style, 
    width: type === 'vertical' ? 1 : '100%', 
    height: type === 'vertical' ? (style?.height || '100%') : 1,
    background: style?.background || 'rgba(0,0,0,0.06)',
    display: 'inline-block'
  }} />
);

export default POSLayout;
