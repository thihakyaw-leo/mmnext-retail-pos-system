import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Badge, Select } from 'antd';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  Bell, 
  Award,
  ShieldCheck,
  Menu as MenuIcon,
  BarChart2,
  Truck,
  Tag as TagIcon,
  Clock,
  Store as StoreIcon,
  Wallet,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, loading } = useAuth();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: '/', icon: <LayoutDashboard size={18} />, label: t('menu.dashboard') },
    { key: '/orders', icon: <ShoppingCart size={18} />, label: t('menu.orders') },
    { key: '/customers', icon: <Users size={18} />, label: t('menu.customers') },
    { key: '/products', icon: <Package size={18} />, label: t('menu.catalog', 'Catalog') },
    { key: '/inventory', icon: <Activity size={18} />, label: t('menu.inventory') },
    { key: '/purchasing', icon: <Truck size={18} />, label: t('menu.purchasing') },
    { key: '/discounts', icon: <TagIcon size={18} />, label: t('menu.discounts') },
    { key: '/staff', icon: <Users size={18} />, label: t('menu.staff') },
    { key: '/payroll', icon: <Wallet size={18} />, label: t('menu.payroll') },
    { key: '/shifts', icon: <Clock size={18} />, label: t('menu.shifts') },
    { key: '/stores', icon: <StoreIcon size={18} />, label: t('menu.stores') },
    { key: '/reports', icon: <BarChart2 size={18} />, label: t('menu.reports') },
    { key: '/gamification', icon: <Award size={18} />, label: t('menu.gamification') },
    { key: '/audit', icon: <ShieldCheck size={18} />, label: t('menu.audit_logs') },
    { key: '/settings', icon: <Settings size={18} />, label: t('menu.settings') },
  ];

  const userMenuItems = [
    { key: 'profile', label: t('header.my_profile'), onClick: () => navigate('/profile') },
    { type: 'divider' },
    { key: 'logout', label: <span style={{ color: '#ef4444' }}>{t('header.logout')}</span>, onClick: handleLogout, icon: <LogOut size={16} color="#ef4444" /> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        collapsedWidth={0}
        width={260}
        style={{ 
          borderRight: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {collapsed ? (
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', borderRadius: 8 }} />
          ) : (
            <Title level={4} style={{ margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>
              <span className="text-gradient">MMNEXT</span> POS
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ padding: '16px 8px', borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#1e293b', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          height: 64
        }}>
          <Button
            type="text"
            icon={<MenuIcon size={20} color="var(--text-primary)" />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
          
          <Space size={24}>
            {/* Connection Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isConnected ? 'Live' : 'Offline'}
              </Text>
            </div>
            
            {/* Open POS */}
            <Button 
              type="primary" 
              onClick={() => navigate('/pos')}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              {t('header.open_pos')}
            </Button>

            {/* Language Switcher */}
            <Select
              defaultValue={i18n.language || 'en'}
              style={{ width: 80 }}
              onChange={changeLanguage}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'mm', label: 'MM' },
              ]}
            />

            {/* Notifications */}
            <Badge count={3} size="small" color="#3b82f6">
              <Button type="text" shape="circle" icon={<Bell size={20} color="var(--text-primary)" />} />
            </Badge>
            
            {/* User Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }} className="hover-lift">
                <Avatar style={{ backgroundColor: '#3b82f6' }}>{user.firstName?.charAt(0) || user.email?.charAt(0)}</Avatar>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>{user.firstName || 'User'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.role}</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ margin: '24px', minHeight: 280, position: 'relative' }}>
          <div className="fade-in" style={{ height: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
