import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Table, 
  Button, 
  Tag, 
  Modal, 
  Form, 
  Input,
  Select,
  Dropdown
} from 'antd';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2,
  MapPin,
  MonitorSmartphone,
  Store as StoreIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;

const MOCK_STORES = [
  { id: 'STR-001', name: 'Main HQ Branch', location: 'Downtown Yangon', manager: 'John Doe', registers: 4, status: 'Active' },
  { id: 'STR-002', name: 'Mandalay Hub', location: 'Chanayethazan', manager: 'Jane Smith', registers: 2, status: 'Active' },
  { id: 'STR-003', name: 'Naypyidaw Outlet', location: 'Zabuthiri', manager: 'Mike Johnson', registers: 1, status: 'Maintenance' },
];

const MOCK_REGISTERS = [
  { id: 'REG-101', name: 'Register 1', store: 'Main HQ Branch', type: 'Desktop POS', status: 'Online' },
  { id: 'REG-102', name: 'Register 2', store: 'Main HQ Branch', type: 'Tablet POS', status: 'Online' },
  { id: 'REG-201', name: 'Register 1', store: 'Mandalay Hub', type: 'Desktop POS', status: 'Offline' },
];

const Stores = () => {
  const { t } = useTranslation();
  const [stores, setStores] = useState(MOCK_STORES);
  const [registers, setRegisters] = useState(MOCK_REGISTERS);
  
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const storeColumns = [
    { 
      title: 'Store Name', 
      key: 'name', 
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StoreIcon size={18} color="#3b82f6" />
          </div>
          <div>
            <Text strong style={{ display: 'block' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.id}</Text>
          </div>
        </div>
      )
    },
    { 
      title: 'Location', 
      key: 'location', 
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={14} color="var(--text-secondary)" />
          <Text>{record.location}</Text>
        </div>
      ) 
    },
    { title: 'Manager', dataIndex: 'manager', key: 'manager' },
    { title: 'Registers', dataIndex: 'registers', key: 'registers' },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'Active' ? 'green' : 'orange'}>{status}</Tag>
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: [
          { key: 'edit', icon: <Edit size={16} />, label: t('common.edit') },
          { type: 'divider' },
          { key: 'delete', icon: <Trash2 size={16} color="#ef4444" />, label: <span style={{ color: '#ef4444' }}>{t('common.delete')}</span> },
        ]}} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreVertical size={16} />} />
        </Dropdown>
      )
    }
  ];

  const registerColumns = [
    { 
      title: 'Register Name', 
      key: 'name', 
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MonitorSmartphone size={16} color="var(--text-secondary)" />
          <div>
            <Text strong style={{ display: 'block' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.id}</Text>
          </div>
        </div>
      )
    },
    { title: 'Assigned Store', dataIndex: 'store', key: 'store' },
    { title: 'Device Type', dataIndex: 'type', key: 'type', render: (text) => <Tag>{text}</Tag> },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: status === 'Online' ? '#10b981' : '#94a3b8' }} />
          <Text>{status}</Text>
        </div>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: [
          { key: 'edit', icon: <Edit size={16} />, label: t('common.edit') },
          { type: 'divider' },
          { key: 'delete', icon: <Trash2 size={16} color="#ef4444" />, label: <span style={{ color: '#ef4444' }}>{t('common.delete')}</span> },
        ]}} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreVertical size={16} />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('stores.title')}</Title>
          <Text type="secondary">{t('stores.subtitle')}</Text>
        </div>
      </div>

      <Card bordered={false} title="Branch Locations" extra={<Button type="primary" icon={<Plus size={16} />} onClick={() => setIsStoreModalOpen(true)}>{t('common.add')}</Button>} style={{ marginBottom: 24 }}>
        <Table columns={storeColumns} dataSource={stores} rowKey="id" pagination={false} />
      </Card>

      <Card bordered={false} title="POS Terminals" extra={<Button icon={<Plus size={16} />} onClick={() => setIsRegisterModalOpen(true)}>{t('common.add')}</Button>}>
        <Table columns={registerColumns} dataSource={registers} rowKey="id" pagination={{ pageSize: 5 }} />
      </Card>

      {/* Store Modal */}
      <Modal title="Add New Store Branch" open={isStoreModalOpen} onCancel={() => setIsStoreModalOpen(false)} footer={null}>
        <Form layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item label="Store Name" required><Input placeholder="e.g. Downtown Outlet" /></Form.Item>
          <Form.Item label="Location / Address" required><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Store Manager"><Input placeholder="Manager Name" /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsStoreModalOpen(false)}>Cancel</Button>
            <Button type="primary">Save Store</Button>
          </div>
        </Form>
      </Modal>

      {/* Register Modal */}
      <Modal title="Add New POS Terminal" open={isRegisterModalOpen} onCancel={() => setIsRegisterModalOpen(false)} footer={null}>
        <Form layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item label="Register Name" required><Input placeholder="e.g. Register 3" /></Form.Item>
          <Form.Item label="Assign to Store" required>
            <Select placeholder="Select a store">
              {stores.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Device Type">
            <Select defaultValue="desktop">
              <Option value="desktop">Desktop POS</Option>
              <Option value="tablet">Tablet POS (Mobile)</Option>
              <Option value="kiosk">Self-Service Kiosk</Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsRegisterModalOpen(false)}>Cancel</Button>
            <Button type="primary">Save Terminal</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Stores;
