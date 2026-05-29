import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Space, Button, Input, Modal, Form, InputNumber, Select, Tabs, DatePicker, message } from 'antd';
import { Search, Filter, Package, AlertTriangle, FileText, Activity } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Inventory = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stock');
  
  // State for Stock List
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // State for Logs
  const [logsList, setLogsList] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // State for Adjustment Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [form] = Form.useForm();

  // Fetch Inventory List
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/inventory');
      const data = res.data.data || res.data || [];
      setInventoryList(data.map((item, idx) => ({ ...item, key: item.id || idx })));
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      message.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Inventory Logs
  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await axiosClient.get('/inventory/logs');
      const data = res.data.data || res.data || [];
      setLogsList(data.map((item, idx) => ({ ...item, key: item.id || idx })));
    } catch (error) {
      console.error('Failed to fetch inventory logs:', error);
      message.error('Failed to load inventory logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchInventory();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleAdjustClick = (record) => {
    setAdjustingItem(record);
    form.setFieldsValue({
      type: 'receive',
      quantity_change: 1,
      reason: ''
    });
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        setLoading(true);
        // quantity_change should be positive or negative based on type
        let finalChange = values.quantity_change;
        if (values.type === 'adjustment' && values.action === 'decrease') {
          finalChange = -Math.abs(values.quantity_change);
        } else if (values.type === 'return') {
           finalChange = Math.abs(values.quantity_change);
        } else if (values.type === 'sale') {
           finalChange = -Math.abs(values.quantity_change);
        }

        await axiosClient.post('/inventory/update', {
          store_id: adjustingItem.store_id || 1,
          product_id: adjustingItem.product_id,
          quantity_change: finalChange,
          reason: values.reason
        });
        
        message.success('Inventory adjusted successfully');
        setIsModalVisible(false);
        fetchInventory();
      } catch (error) {
        console.error('Failed to adjust inventory:', error);
        message.error('Failed to adjust inventory');
      } finally {
        setLoading(false);
      }
    });
  };

  const getStockStatus = (stock, reorderPoint) => {
    if (stock <= 0) return { label: 'Out of Stock', color: 'error' };
    if (stock <= (reorderPoint || 10)) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  const stockColumns = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text) => <Text strong>{text || 'Unknown Product'}</Text>,
    },
    {
      title: 'SKU',
      dataIndex: 'product_sku',
      key: 'product_sku',
      render: (text) => <Text type="secondary" style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'On Hand',
      dataIndex: 'quantity_on_hand',
      key: 'quantity_on_hand',
      render: (val, record) => {
        const { label, color } = getStockStatus(val, record.reorder_point);
        return (
          <Space>
            <Text>{val}</Text>
            <Tag color={color}>{label}</Tag>
          </Space>
        );
      }
    },
    {
      title: 'Available',
      dataIndex: 'quantity_available',
      key: 'quantity_available',
    },
    {
      title: 'Reorder Point',
      dataIndex: 'reorder_point',
      key: 'reorder_point',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          ghost
          onClick={() => handleAdjustClick(record)}
        >
          Adjust Stock
        </Button>
      ),
    },
  ];

  const logColumns = [
    {
      title: 'Date/Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('MMM D, YYYY HH:mm'),
    },
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const colorMap = { receive: 'blue', adjustment: 'orange', sale: 'green', return: 'purple' };
        return <Tag color={colorMap[type] || 'default'}>{type?.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Change',
      dataIndex: 'quantity_change',
      key: 'quantity_change',
      render: (val) => (
        <Text type={val > 0 ? 'success' : 'danger'} strong>
          {val > 0 ? `+${val}` : val}
        </Text>
      )
    },
    {
      title: 'New Quantity',
      dataIndex: 'new_quantity',
      key: 'new_quantity',
      render: (val) => <Text strong>{val}</Text>
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => text || '-'
    },
  ];

  const filteredInventory = inventoryList.filter(item => 
    (item.product_name || '').toLowerCase().includes(searchText.toLowerCase()) || 
    (item.product_sku || '').toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={28} color="#10b981" />
            Inventory Management
          </Title>
          <Text type="secondary">Monitor stock levels, adjust quantities, and view history</Text>
        </div>
      </div>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'stock',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={16} /> Current Stock
                </span>
              ),
              children: (
                <div>
                  <div style={{ padding: '16px 0', display: 'flex', gap: 16 }}>
                    <Input 
                      placeholder="Search by Product Name or SKU..." 
                      prefix={<Search size={16} color="var(--text-secondary)" />}
                      style={{ width: 320, background: 'rgba(255,255,255,0.05)' }}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                  <Table 
                    columns={stockColumns} 
                    dataSource={filteredInventory}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              )
            },
            {
              key: 'logs',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} /> Stock History Logs
                </span>
              ),
              children: (
                <div style={{ paddingTop: 16 }}>
                  <Table 
                    columns={logColumns} 
                    dataSource={logsList}
                    loading={logsLoading}
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={`Adjust Stock: ${adjustingItem?.product_name}`}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Confirm Adjustment"
        okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Current Quantity on Hand:</Text>
              <Text strong style={{ fontSize: 16 }}>{adjustingItem?.quantity_on_hand}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Reorder Point:</Text>
              <Text>{adjustingItem?.reorder_point}</Text>
            </div>
          </div>

          <Form.Item name="type" label="Adjustment Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="receive">Receive Stock (Restock)</Select.Option>
              <Select.Option value="adjustment">Manual Adjustment</Select.Option>
              <Select.Option value="return">Customer Return</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prev, current) => prev.type !== current.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'adjustment') {
                return (
                  <Form.Item name="action" label="Action" rules={[{ required: true }]}>
                    <Select placeholder="Increase or Decrease">
                      <Select.Option value="increase">Increase (+)</Select.Option>
                      <Select.Option value="decrease">Decrease (-)</Select.Option>
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="quantity_change" label="Quantity" rules={[{ required: true, min: 1, type: 'number' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>

          <Form.Item name="reason" label="Reason / Reference" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="E.g., Received from supplier, Damaged goods, Found during stock take..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
