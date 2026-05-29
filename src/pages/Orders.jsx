import React, { useState } from 'react';
import { Card, Table, Typography, Tag, Space, Button, Input, DatePicker, Select } from 'antd';
import { Search, Filter, Eye, Download } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

import OrderDetailsModal from '../components/orders/OrderDetailsModal';

const Orders = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async (search = '', status = 'all') => {
    try {
      setLoading(true);
      let query = `/orders?search=${encodeURIComponent(search)}`;
      if (status !== 'all') {
        query += `&status=${encodeURIComponent(status)}`;
      }
      const response = await axiosClient.get(query);
      setOrders(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      message.error('Failed to load orders');
      setOrders([]); 
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(searchText, statusFilter);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, statusFilter]);

  const columns = [
    {
      title: t('orders.order_id'),
      dataIndex: 'id',
      key: 'id',
      render: (text) => <Text strong style={{ color: '#60a5fa' }}>{text || 'N/A'}</Text>,
    },
    {
      title: t('orders.date'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text, record) => text ? new Date(text).toLocaleString() : record.date,
    },
    {
      title: t('orders.customer'),
      dataIndex: 'customer_id',
      key: 'customer',
      render: (id, record) => record.customer || `Customer #${id || 'Walk-in'}`,
    },
    {
      title: t('menu.stores'),
      dataIndex: 'organization_id',
      key: 'store',
      render: (id, record) => record.store || `Org #${id || 'Unknown'}`,
    },
    {
      title: t('orders.total'),
      dataIndex: 'total_amount',
      key: 'total',
      render: (amount, record) => {
        const val = amount !== undefined ? Number(amount) : record.total;
        return <Text strong>${(val || 0).toFixed(2)}</Text>;
      },
    },
    {
      title: 'Payment',
      dataIndex: 'payment_method',
      key: 'payment',
      render: (method, record) => <Text type="secondary">{method || record.payment || 'Unknown'}</Text>,
    },
    {
      title: t('orders.status'),
      key: 'status',
      dataIndex: 'status',
      render: (status) => {
        const statStr = (status || 'unknown').toString().toLowerCase();
        let color = 'default';
        if (statStr === 'completed') color = 'success';
        if (statStr === 'processing') color = 'processing';
        if (statStr === 'failed') color = 'error';
        if (statStr === 'refunded') color = 'warning';
        return <Tag color={color} style={{ borderRadius: 4 }}>{(status || 'Unknown').toUpperCase()}</Tag>;
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<Eye size={16} />} 
            onClick={() => {
              setSelectedOrderId(record.id);
              setIsModalOpen(true);
            }} 
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('orders.title')}</Title>
          <Text type="secondary">{t('orders.subtitle')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<Download size={16} />}
          style={{ background: '#3b82f6' }}
        >
          Export CSV
        </Button>
      </div>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input 
            placeholder={t('orders.search')} 
            prefix={<Search size={16} color="var(--text-secondary)" />}
            style={{ width: 280, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <RangePicker style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }} />
          <Select 
            value={statusFilter} 
            onChange={(value) => setStatusFilter(value)}
            style={{ width: 140 }} 
            dropdownStyle={{ background: '#1e293b' }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="processing">Processing</Select.Option>
            <Select.Option value="failed">Failed</Select.Option>
            <Select.Option value="refunded">Refunded</Select.Option>
          </Select>
          <Button icon={<Filter size={16} />} style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)' }}>
            More Filters
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <OrderDetailsModal 
        open={isModalOpen} 
        orderId={selectedOrderId} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrderId(null);
        }} 
      />
    </div>
  );
};

export default Orders;
