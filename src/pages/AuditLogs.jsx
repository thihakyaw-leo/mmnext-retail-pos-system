import React, { useState } from 'react';
import { Card, Table, Typography, Tag, Select, DatePicker, Input, Space, Button } from 'antd';
import { ShieldCheck, Search, Download } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const mockAuditLogs = [
  { key: '1', id: 'LOG-001', user: 'Admin User', action: 'CREATE_USER', target: 'Staff ID: EMP-104', date: '2026-05-28 09:12:45', ip: '192.168.1.105', status: 'Success' },
  { key: '2', id: 'LOG-002', user: 'Admin User', action: 'UPDATE_SETTINGS', target: 'Global Tax Rate', date: '2026-05-28 09:15:30', ip: '192.168.1.105', status: 'Success' },
  { key: '3', id: 'LOG-003', user: 'Jane Smith (Manager)', action: 'VOID_ORDER', target: 'Order: ORD-2026-004', date: '2026-05-28 12:11:00', ip: '10.0.0.45', status: 'Success' },
  { key: '4', id: 'LOG-004', user: 'Unknown', action: 'LOGIN_ATTEMPT', target: 'admin@mmnext.com', date: '2026-05-28 14:02:15', ip: '203.14.88.2', status: 'Failed' },
  { key: '5', id: 'LOG-005', user: 'System', action: 'DB_BACKUP', target: 'Database Backup', date: '2026-05-28 03:00:00', ip: '127.0.0.1', status: 'Success' },
];

const AuditLogs = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axiosClient.get('/audit');
        const formattedLogs = (response.logs || []).map((log, index) => ({
          ...log,
          key: log.id || index
        }));
        setLogs(formattedLogs.length > 0 ? formattedLogs : mockAuditLogs);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        setLogs(mockAuditLogs);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, []);

  const columns = [
    {
      title: t('audit.timestamp'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text, record) => <Text type="secondary">{text ? new Date(text).toLocaleString() : record.date}</Text>,
    },
    {
      title: t('audit.action'),
      dataIndex: 'action',
      key: 'action',
      render: (action) => (
        <Tag color="blue" style={{ borderRadius: 4, fontFamily: 'monospace' }}>
          {action}
        </Tag>
      ),
    },
    {
      title: t('audit.user'),
      dataIndex: 'user_id',
      key: 'user',
      render: (id, record) => <Text strong>{record.user || `User #${id}`}</Text>,
    },
    {
      title: t('audit.details'),
      dataIndex: 'details',
      key: 'details',
      render: (details, record) => {
        let text = record.target || '-';
        if (details) {
          try {
             text = typeof details === 'string' ? details : JSON.stringify(details);
          } catch(e){}
        }
        return <Text>{text}</Text>;
      }
    },
    {
      title: t('audit.ip'),
      dataIndex: 'ip_address',
      key: 'ip',
      render: (ip, record) => <Text type="secondary" style={{ fontFamily: 'monospace' }}>{ip || record.ip || '-'}</Text>,
    },
    {
      title: t('common.status'),
      key: 'status',
      dataIndex: 'status',
      render: (status) => {
        return <Tag color={status === 'Success' ? 'success' : 'error'} style={{ borderRadius: 4 }}>{status.toUpperCase()}</Tag>;
      },
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={28} color="#3b82f6" />
            {t('audit.title')}
          </Title>
          <Text type="secondary">{t('audit.subtitle')}</Text>
        </div>
        <Button 
          type="default" 
          icon={<Download size={16} />}
          style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
        >
          Export Logs
        </Button>
      </div>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input 
            placeholder={t('common.search')} 
            prefix={<Search size={16} color="var(--text-secondary)" />}
            style={{ width: 280, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <RangePicker style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }} />
          <Select defaultValue="all" style={{ width: 180 }} dropdownStyle={{ background: '#1e293b' }}>
            <Select.Option value="all">All Actions</Select.Option>
            <Select.Option value="auth">Authentication</Select.Option>
            <Select.Option value="data">Data Modifications</Select.Option>
            <Select.Option value="system">System Events</Select.Option>
          </Select>
        </div>

        <Table 
          columns={columns} 
          dataSource={logs}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default AuditLogs;
