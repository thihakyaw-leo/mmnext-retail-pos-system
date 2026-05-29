import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const Login = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const onFinish = async (values) => {
    setLoading(true);
    const result = await login(values.email, values.password);
    setLoading(false);
    
    if (result.success) {
      message.success(t('login.success'));
      navigate('/');
    } else {
      message.error(result.error || t('login.error'));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url("https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop") center/cover no-repeat',
      position: 'relative'
    }}>
      {/* Dark Overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)'
      }} />

      <div className="glass-panel slide-up" style={{
        width: '100%',
        maxWidth: 420,
        padding: '48px 40px',
        borderRadius: 24,
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            width: 56, height: 56, 
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', 
            borderRadius: 16,
            margin: '0 auto 24px',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)'
          }} />
          <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
            {t('login.title')} <span className="text-gradient">MMNEXT</span>
          </Title>
          <Text style={{ color: 'var(--text-secondary)' }}>{t('login.subtitle')}</Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'var(--text-secondary)' }} />} 
              placeholder={t('login.email')} 
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />} 
              placeholder={t('login.password')} 
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox style={{ color: 'var(--text-secondary)' }}>{t('login.remember')}</Checkbox>
            </Form.Item>
            <a style={{ color: '#60a5fa' }} href="#">{t('login.forgot')}</a>
          </div>

          <Form.Item style={{ margin: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block 
              style={{ 
                height: 48, 
                borderRadius: 8, 
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                border: 'none',
                fontWeight: 600,
                fontSize: 16
              }}
              className="hover-lift"
            >
              {loading ? t('login.signing_in') : t('login.sign_in')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
