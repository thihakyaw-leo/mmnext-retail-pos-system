import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Dropdown, 
  Modal, 
  Form, 
  Avatar,
  message,
  Row,
  Col,
  Select,
  DatePicker,
  Switch,
  Divider
} from 'antd';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  User,
  Star,
  ShoppingBag,
  Building,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Customers = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();

  const fetchCustomers = async (query = '') => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/customers?search=${encodeURIComponent(query)}`);
      setCustomers(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const getActionMenu = (record) => [
    { key: 'edit', icon: <Edit size={16} />, label: t('customers.edit_customer', 'Edit Customer'), onClick: () => handleEditCustomer(record) },
    { type: 'divider' },
    { key: 'delete', icon: <Trash2 size={16} color="#ef4444" />, label: <span style={{ color: '#ef4444' }}>{t('common.delete')}</span>, onClick: () => handleDeleteCustomer(record.id) },
  ];

  const handleAddClick = () => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({
      gender: 'prefer_not_to_say',
      loyalty_member: false,
      is_active: true
    });
    setIsModalVisible(true);
  };

  const handleEditCustomer = (record) => {
    setEditingCustomer(record);
    form.setFieldsValue({
      first_name: record.first_name,
      last_name: record.last_name,
      company_name: record.company_name,
      phone: record.phone,
      email: record.email,
      gender: record.gender || 'prefer_not_to_say',
      date_of_birth: record.date_of_birth ? dayjs(record.date_of_birth) : null,
      address: record.address_line_1,
      city: record.city,
      state: record.state,
      postal_code: record.zip_code,
      country: record.country || 'VN',
      loyalty_member: Boolean(record.loyalty_member),
      is_active: Boolean(record.is_active !== 0) // Treat as active if not explicitly 0
    });
    setIsModalVisible(true);
  };

  const handleDeleteCustomer = (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this customer?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axiosClient.delete(`/customers/${id}`);
          message.success('Deleted successfully');
          fetchCustomers(searchQuery);
        } catch (error) {
          console.error('Failed to delete customer', error);
          message.error('Failed to delete customer');
        }
      }
    });
  };

  const columns = [
    {
      title: t('customers.customer'),
      key: 'customer',
      render: (_, record) => {
        const displayName = record.display_name || `${record.first_name} ${record.last_name}`.trim();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar style={{ backgroundColor: '#3b82f6' }}>{displayName.charAt(0)}</Avatar>
            <div>
              <Text strong style={{ display: 'block' }}>{displayName}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.customer_code}</Text>
              {record.company_name && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}><Building size={10} style={{ marginRight: 4 }}/>{record.company_name}</Text>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: t('customers.contact'),
      key: 'contact',
      render: (_, record) => (
        <div>
          {record.phone && <Text style={{ display: 'block', fontSize: 13 }}><Phone size={12} style={{ marginRight: 4 }}/> {record.phone}</Text>}
          {record.email && <Text type="secondary" style={{ fontSize: 13 }}><Mail size={12} style={{ marginRight: 4 }}/> {record.email}</Text>}
        </div>
      )
    },
    {
      title: t('customers.orders', 'Orders'),
      dataIndex: 'total_orders',
      key: 'total_orders',
      render: (orders) => (
        <Space size={6}>
          <ShoppingBag size={14} color="var(--text-secondary)" />
          <Text>{orders || 0}</Text>
        </Space>
      )
    },
    {
      title: t('customers.spent', 'Spent'),
      dataIndex: 'total_spent',
      key: 'total_spent',
      render: (spent) => <Text strong>${Number(spent || 0).toFixed(2)}</Text>
    },
    {
      title: t('customers.points', 'Loyalty'),
      key: 'loyalty',
      render: (_, record) => {
        if (!record.loyalty_member) return <Text type="secondary">Not a member</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Space size={6}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text strong>{record.loyalty_points || 0}</Text>
            </Space>
            <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>{record.loyalty_tier?.toUpperCase() || 'BRONZE'}</Tag>
          </Space>
        );
      }
    },
    {
      title: t('common.status'),
      key: 'status',
      render: (_, record) => (
         <Tag color={record.is_active ? 'green' : 'default'}>{record.is_active ? 'Active' : 'Inactive'}</Tag>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreVertical size={16} />} />
        </Dropdown>
      )
    }
  ];

  const handleSaveCustomer = async (values) => {
    try {
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name || '',
        company_name: values.company_name,
        phone: values.phone,
        email: values.email || '',
        gender: values.gender,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null,
        address: values.address || '',
        city: values.city,
        state: values.state,
        postal_code: values.postal_code,
        country: values.country,
        loyalty_member: values.loyalty_member,
        is_active: values.is_active ? 1 : 0
      };

      if (editingCustomer) {
        await axiosClient.put(`/customers/${editingCustomer.id}`, payload);
        message.success('Customer updated successfully');
      } else {
        await axiosClient.post('/customers', payload);
        message.success(t('customers.success_add', 'Customer added successfully'));
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingCustomer(null);
      fetchCustomers(searchQuery);
    } catch (error) {
      console.error('Failed to add customer:', error);
      message.error(error.response?.data?.error || t('customers.error_add', 'Failed to save customer'));
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('customers.title')}</Title>
          <Text type="secondary">{t('customers.subtitle')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={16} />}
          onClick={handleAddClick}
          className="hover-lift"
        >
          {t('customers.add_customer')}
        </Button>
      </div>

      <Card bordered={false} bodyStyle={{ padding: '24px 0 0 0' }}>
        <div style={{ padding: '0 24px 24px 24px', display: 'flex', gap: 16 }}>
          <Input
            placeholder={t('customers.search')}
            prefix={<Search size={16} color="var(--text-secondary)" />}
            style={{ maxWidth: 400, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        <Table 
          columns={columns} 
          dataSource={customers} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingCustomer ? 'Edit Customer' : t('customers.add_title')}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingCustomer(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveCustomer} style={{ marginTop: 24 }}>
          
          <Divider orientation="left">Personal Information</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label={t('customers.first_name')} rules={[{ required: true }]}>
                <Input prefix={<User size={16} style={{ color: 'var(--text-secondary)' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label={t('customers.last_name')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="gender" label="Gender">
                 <Select>
                   <Option value="male">Male</Option>
                   <Option value="female">Female</Option>
                   <Option value="other">Other</Option>
                   <Option value="prefer_not_to_say">Prefer not to say</Option>
                 </Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="date_of_birth" label="Date of Birth">
                 <DatePicker style={{ width: '100%' }} />
               </Form.Item>
             </Col>
          </Row>

          <Form.Item name="company_name" label="Company Name (Optional)">
             <Input prefix={<Building size={16} style={{ color: 'var(--text-secondary)' }} />} />
          </Form.Item>

          <Divider orientation="left">Contact Information</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label={t('customers.phone')} rules={[{ required: true }]}>
                <Input prefix={<Phone size={16} style={{ color: 'var(--text-secondary)' }}/>} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label={t('customers.email')}>
                <Input prefix={<Mail size={16} style={{ color: 'var(--text-secondary)' }}/>} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="address" label={t('customers.address')}>
            <Input.TextArea rows={2} placeholder="Street Address" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State/Province">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="postal_code" label="Zip/Postal Code">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Divider orientation="left">Account Settings</Divider>
          <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="loyalty_member" label="Loyalty Program" valuePropName="checked">
                 <Switch checkedChildren="Member" unCheckedChildren="Not Member" />
               </Form.Item>
             </Col>
             {editingCustomer && (
               <Col span={12}>
                 <Form.Item name="is_active" label="Status" valuePropName="checked">
                   <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                 </Form.Item>
               </Col>
             )}
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
            <Button onClick={() => {
              setIsModalVisible(false);
              setEditingCustomer(null);
              form.resetFields();
            }}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit">{t('customers.save', 'Save Customer')}</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;
