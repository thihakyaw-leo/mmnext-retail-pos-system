import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Tabs, Table, Button, Input, Tag, Dropdown, 
  Modal, Form, Select, DatePicker, InputNumber, message, Space
} from 'antd';
import { 
  Search, Plus, MoreVertical, Edit, Trash2, 
  Tag as TagIcon, Ticket, CheckCircle, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Discounts = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('promotions');
  
  const [promotions, setPromotions] = useState([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  
  const [promoForm] = Form.useForm();
  const [couponForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Search states
  const [searchPromo, setSearchPromo] = useState('');
  const [searchCoupon, setSearchCoupon] = useState('');

  const fetchPromotions = async () => {
    setLoadingPromotions(true);
    try {
      const res = await axiosClient.get('/discounts/promotions');
      setPromotions(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch promotions', error);
      message.error('Failed to fetch promotions');
    } finally {
      setLoadingPromotions(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await axiosClient.get('/discounts/coupons');
      setCoupons(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons', error);
      message.error('Failed to fetch coupons');
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
    fetchCoupons();
  }, []);

  // --- Promotions ---
  const filteredPromotions = promotions.filter(p => p.name?.toLowerCase().includes(searchPromo.toLowerCase()));

  const handleAddPromotion = async (values) => {
    setSubmitting(true);
    try {
      const [start, end] = values.activePeriod;
      const payload = {
        name: values.name,
        type: values.type,
        value: Number(values.value),
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD')
      };
      
      await axiosClient.post('/discounts/promotions', payload);
      message.success('Promotion created successfully');
      setIsPromoModalOpen(false);
      promoForm.resetFields();
      fetchPromotions();
    } catch (error) {
      message.error(error.message || 'Failed to create promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const promoColumns = [
    { title: 'Promotion Name', dataIndex: 'name', key: 'name', render: (text) => <Text strong>{text}</Text> },
    { 
      title: t('discounts.type'), 
      dataIndex: 'type', 
      key: 'type', 
      render: (text) => <Tag color="blue">{text === 'percent' ? 'Percentage Off' : text === 'fixed' ? 'Fixed Amount' : 'BOGO'}</Tag> 
    },
    { 
      title: t('discounts.value'), 
      key: 'value', 
      render: (_, record) => (
        <Text>{record.type === 'percent' ? `${record.value}%` : record.type === 'fixed' ? `$${record.value}` : 'Free Item'}</Text>
      )
    },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (date) => <Text type="secondary">{new Date(date).toLocaleDateString()}</Text> },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', render: (date) => <Text type="secondary">{new Date(date).toLocaleDateString()}</Text> },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'Active' ? 'green' : status === 'Scheduled' ? 'blue' : 'default';
        let icon = status === 'Active' ? <CheckCircle size={12} /> : status === 'Scheduled' ? <Clock size={12} /> : null;
        return <Tag color={color} icon={icon}>{status}</Tag>;
      }
    }
  ];

  // --- Coupons ---
  const filteredCoupons = coupons.filter(c => c.code?.toLowerCase().includes(searchCoupon.toLowerCase()));

  const handleAddCoupon = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        code: values.code,
        type: values.type,
        value: Number(values.value),
        usage_limit: values.usage_limit ? Number(values.usage_limit) : null
      };
      
      await axiosClient.post('/discounts/coupons', payload);
      message.success('Coupon created successfully');
      setIsCouponModalOpen(false);
      couponForm.resetFields();
      fetchCoupons();
    } catch (error) {
      message.error(error.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const couponColumns = [
    { title: t('discounts.code'), dataIndex: 'code', key: 'code', render: (text) => <Text strong style={{ letterSpacing: 1 }}>{text}</Text> },
    { 
      title: t('discounts.type'), 
      dataIndex: 'type', 
      key: 'type', 
      render: (text) => <Tag color="purple">{text === 'percent' ? 'Percentage Off' : 'Fixed Amount'}</Tag> 
    },
    { 
      title: t('discounts.value'), 
      key: 'value', 
      render: (_, record) => (
        <Text>{record.type === 'percent' ? `${record.value}%` : `$${record.value}`}</Text>
      )
    },
    { title: 'Usage Limit', dataIndex: 'usage_limit', key: 'usage_limit', render: (val) => val || 'Unlimited' },
    { title: 'Times Used', dataIndex: 'used_count', key: 'used_count' },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'Active' ? 'green' : status === 'Depleted' ? 'orange' : 'error';
        return <Tag color={color}>{status}</Tag>;
      }
    }
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('discounts.title')}</Title>
          <Text type="secondary">{t('discounts.subtitle')}</Text>
        </div>
      </div>

      <Card bordered={false} bodyStyle={{ padding: '0 24px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { 
              key: 'promotions', 
              label: <span><TagIcon size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Promotions</span>, 
              children: (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Input 
                      placeholder={t('common.search')} 
                      prefix={<Search size={16} />} 
                      style={{ maxWidth: 300 }}
                      value={searchPromo}
                      onChange={e => setSearchPromo(e.target.value)}
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => setIsPromoModalOpen(true)}>{t('common.add')}</Button>
                  </div>
                  <Table columns={promoColumns} dataSource={filteredPromotions} rowKey="id" pagination={{ pageSize: 10 }} loading={loadingPromotions} />
                </div>
              ) 
            },
            { 
              key: 'coupons', 
              label: <span><Ticket size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Coupons</span>, 
              children: (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Input 
                      placeholder={t('common.search')} 
                      prefix={<Search size={16} />} 
                      style={{ maxWidth: 300 }}
                      value={searchCoupon}
                      onChange={e => setSearchCoupon(e.target.value)}
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => setIsCouponModalOpen(true)}>{t('common.add')}</Button>
                  </div>
                  <Table columns={couponColumns} dataSource={filteredCoupons} rowKey="id" pagination={{ pageSize: 10 }} loading={loadingCoupons} />
                </div>
              ) 
            },
          ]}
        />
      </Card>

      {/* Promotion Modal */}
      <Modal title="Create Promotion" open={isPromoModalOpen} onCancel={() => setIsPromoModalOpen(false)} footer={null}>
        <Form form={promoForm} layout="vertical" onFinish={handleAddPromotion} style={{ marginTop: 24 }}>
          <Form.Item name="name" label="Campaign Name" rules={[{ required: true }]}><Input placeholder="e.g. Summer Sale" /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="type" label="Discount Type" rules={[{ required: true }]} initialValue="percent">
              <Select>
                <Option value="percent">Percentage Off</Option>
                <Option value="fixed">Fixed Amount</Option>
                <Option value="bogo">Buy 1 Get 1</Option>
              </Select>
            </Form.Item>
            <Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="activePeriod" label="Active Period" rules={[{ required: true }]}><RangePicker style={{ width: '100%' }} /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsPromoModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Save Promotion</Button>
          </div>
        </Form>
      </Modal>

      {/* Coupon Modal */}
      <Modal title="Create Coupon" open={isCouponModalOpen} onCancel={() => setIsCouponModalOpen(false)} footer={null}>
        <Form form={couponForm} layout="vertical" onFinish={handleAddCoupon} style={{ marginTop: 24 }}>
          <Form.Item name="code" label="Coupon Code" rules={[{ required: true }]}><Input placeholder="e.g. WELCOME10" style={{ textTransform: 'uppercase' }} /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="type" label="Discount Type" rules={[{ required: true }]} initialValue="percent">
              <Select>
                <Option value="percent">Percentage Off</Option>
                <Option value="fixed">Fixed Amount</Option>
              </Select>
            </Form.Item>
            <Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="usage_limit" label="Usage Limit (Optional)"><InputNumber min={1} style={{ width: '100%' }} placeholder="Leave empty for unlimited" /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsCouponModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Save Coupon</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Discounts;
