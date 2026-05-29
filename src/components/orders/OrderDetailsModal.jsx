import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Table, Typography, Tag, Divider, Space, Spin, message } from 'antd';
import { Receipt, User, Calendar, CreditCard } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const OrderDetailsModal = ({ open, orderId, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    }
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/orders/${orderId}`);
      if (response.data && response.data.success) {
        setOrderData(response.data.data);
      } else {
        // Fallback for mocked order in frontend
        setOrderData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      message.error('Failed to load order details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    {
      title: 'Item',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text) => <Text strong>{text || 'Unknown Item'}</Text>
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center'
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}`
    },
    {
      title: 'Discount',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      align: 'right',
      render: (val) => val > 0 ? <Text type="danger">-${Number(val).toFixed(2)}</Text> : '-'
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (val) => <Text strong>${Number(val).toFixed(2)}</Text>
    }
  ];

  if (!orderData && !loading) {
    return null;
  }

  const getStatusTag = (status) => {
    const statStr = (status || 'unknown').toString().toLowerCase();
    if (statStr === 'completed') return <Tag color="success">COMPLETED</Tag>;
    if (statStr === 'processing') return <Tag color="processing">PROCESSING</Tag>;
    if (statStr === 'failed') return <Tag color="error">FAILED</Tag>;
    if (statStr === 'refunded') return <Tag color="warning">REFUNDED</Tag>;
    return <Tag>{statStr.toUpperCase()}</Tag>;
  };

  return (
    <Modal
      title={
        <Space>
          <Receipt size={20} color="#3b82f6" />
          <span>Order Details</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {orderData && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              <div>
                <Text type="secondary">Order Number</Text>
                <Title level={4} style={{ margin: 0 }}>{orderData.order_number || orderData.id}</Title>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary">Status</Text>
                <div>{getStatusTag(orderData.status)}</div>
              </div>
            </div>

            <Descriptions column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label={<span><Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> Date</span>}>
                {orderData.created_at ? dayjs(orderData.created_at).format('MMM D, YYYY HH:mm') : orderData.date}
              </Descriptions.Item>
              <Descriptions.Item label={<span><User size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> Customer</span>}>
                {orderData.customer_name || (orderData.customer_id ? `Customer #${orderData.customer_id}` : 'Walk-in Customer')}
              </Descriptions.Item>
              <Descriptions.Item label={<span><User size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> Cashier</span>}>
                {orderData.cashier_name || `Cashier #${orderData.cashier_id || 'Unknown'}`}
              </Descriptions.Item>
              <Descriptions.Item label={<span><CreditCard size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> Payment</span>}>
                <Text type="secondary">{orderData.payment_method?.toUpperCase() || 'UNKNOWN'}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Order Items</Divider>

            <Table 
              columns={itemColumns} 
              dataSource={orderData.items || []} 
              rowKey="id"
              pagination={false}
              size="small"
              bordered
            />

            <div style={{ width: '300px', marginLeft: 'auto', marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Subtotal:</Text>
                <Text>${Number(orderData.subtotal || 0).toFixed(2)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Tax ({Number(orderData.tax_rate || 0)}%):</Text>
                <Text>${Number(orderData.tax_amount || 0).toFixed(2)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Discount:</Text>
                <Text type="danger">-${Number(orderData.discount_amount || 0).toFixed(2)}</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 16 }}>Grand Total:</Text>
                <Text strong style={{ fontSize: 18, color: '#10b981' }}>${Number(orderData.total_amount || 0).toFixed(2)}</Text>
              </div>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default OrderDetailsModal;
