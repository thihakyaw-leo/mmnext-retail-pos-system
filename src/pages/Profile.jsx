import React, { useState } from 'react';
import { Typography, Card, Tabs, Form, Input, Button, Divider, Avatar, message, Upload, List } from 'antd';
import { User, Lock, Activity, Camera, Save, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleProfileUpdate = async (values) => {
    setLoading(true);
    try {
      // API call to update profile would go here
      await new Promise(resolve => setTimeout(resolve, 800));
      message.success('Profile updated successfully');
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (values) => {
    setLoading(true);
    try {
      // API call to update password would go here
      await new Promise(resolve => setTimeout(resolve, 800));
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Mock activity log
  const activityData = [
    { id: 1, action: 'Logged in', time: 'Today, 09:41 AM', ip: '192.168.1.42', device: 'Chrome on Windows' },
    { id: 2, action: 'Processed Order #ORD-1002', time: 'Yesterday, 04:30 PM', ip: '192.168.1.42', device: 'Chrome on Windows' },
    { id: 3, action: 'Updated product pricing', time: 'May 26, 11:15 AM', ip: '192.168.1.42', device: 'Chrome on Windows' },
    { id: 4, action: 'Logged out', time: 'May 25, 06:05 PM', ip: '192.168.1.42', device: 'Chrome on Windows' },
  ];

  const personalInfoTab = (
    <div className="fade-in">
      <Title level={4}>Personal Information</Title>
      <Text type="secondary">Update your photo and personal details here.</Text>
      <Divider />
      
      <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Avatar 
            size={120} 
            style={{ backgroundColor: '#3b82f6', fontSize: 48 }}
          >
            {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
          <Upload showUploadList={false}>
            <Button icon={<Camera size={16} />}>Change Photo</Button>
          </Upload>
        </div>
        
        <div style={{ flex: 1 }}>
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleProfileUpdate}
            initialValues={{
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
              email: user?.email || '',
              phone: user?.phone || ''
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                <Input size="large" />
              </Form.Item>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                <Input size="large" />
              </Form.Item>
            </div>
            
            <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
              <Input size="large" disabled />
            </Form.Item>
            
            <Form.Item name="phone" label="Phone Number">
              <Input size="large" />
            </Form.Item>
            
            <Button type="primary" htmlType="submit" icon={<Save size={16} />} loading={loading}>
              {t('common.save')}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );

  const securityTab = (
    <div className="fade-in">
      <Title level={4}>Change Password</Title>
      <Text type="secondary">Ensure your account is using a long, random password to stay secure.</Text>
      <Divider />
      
      <Form 
        form={passwordForm} 
        layout="vertical" 
        onFinish={handlePasswordUpdate}
        style={{ maxWidth: 400 }}
      >
        <Form.Item 
          name="currentPassword" 
          label="Current Password" 
          rules={[{ required: true, message: 'Please input your current password!' }]}
        >
          <Input.Password size="large" />
        </Form.Item>
        
        <Form.Item 
          name="newPassword" 
          label="New Password" 
          rules={[
            { required: true, message: 'Please input your new password!' },
            { min: 8, message: 'Password must be at least 8 characters long.' }
          ]}
        >
          <Input.Password size="large" />
        </Form.Item>
        
        <Form.Item 
          name="confirmPassword" 
          label="Confirm New Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('The two passwords that you entered do not match!'));
              },
            }),
          ]}
        >
          <Input.Password size="large" />
        </Form.Item>
        
        <Button type="primary" htmlType="submit" icon={<Lock size={16} />} loading={loading}>
          Update Password
        </Button>
      </Form>
    </div>
  );

  const activityTab = (
    <div className="fade-in">
      <Title level={4}>Activity Log</Title>
      <Text type="secondary">Recent activity on your account.</Text>
      <Divider />
      
      <List
        itemLayout="horizontal"
        dataSource={activityData}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar style={{ backgroundColor: item.action.includes('out') ? '#ef4444' : '#10b981' }} icon={item.action.includes('out') ? <LogOut size={16} /> : <Activity size={16} />} />}
              title={<Text strong>{item.action}</Text>}
              description={
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <Text type="secondary">{item.time}</Text>
                  <Text type="secondary">IP: {item.ip}</Text>
                  <Text type="secondary">{item.device}</Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  const tabItems = [
    {
      key: '1',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} />
          {t('header.my_profile')}
        </span>
      ),
      children: personalInfoTab,
    },
    {
      key: '2',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={16} />
          Security
        </span>
      ),
      children: securityTab,
    },
    {
      key: '3',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} />
          Activity Log
        </span>
      ),
      children: activityTab,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('header.my_profile')}</Title>
        <Text type="secondary">Manage your account settings and preferences</Text>
      </div>

      <Card bordered={false} style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Tabs 
          defaultActiveKey="1" 
          items={tabItems} 
          tabPosition="left"
          style={{ minHeight: 400 }}
        />
      </Card>
    </div>
  );
};

export default Profile;
