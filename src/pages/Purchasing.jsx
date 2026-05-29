import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Tabs, Table, Button, Input, Space, Tag, Dropdown, 
  Modal, Form, Select, DatePicker, Divider, InputNumber, message, Popconfirm
} from 'antd';
import { 
  Search, Plus, MoreVertical, Eye, Edit, Trash2, Truck,
  FileText, Building, CheckCircle, Clock, PlusCircle, MinusCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import { useCurrency } from '../contexts/CurrencyContext';

const { Title, Text } = Typography;
const { Option } = Select;

const Purchasing = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('suppliers');
  
  // States
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [pos, setPos] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [products, setProducts] = useState([]);

  // Search states
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchPO, setSearchPO] = useState('');
  
  // Modal states
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [supplierForm] = Form.useForm();
  
  const [poModalVisible, setPoModalVisible] = useState(false);
  const [poForm] = Form.useForm();
  const [poItems, setPoItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Data
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const res = await axiosClient.get('/purchasing/suppliers');
      setSuppliers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchPOs = async () => {
    setLoadingPOs(true);
    try {
      const res = await axiosClient.get('/purchasing/purchase-orders');
      setPos(res.data || []);
    } catch (error) {
      console.error('Failed to fetch POs', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/products');
      setProducts(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchPOs();
    fetchProducts();
  }, []);

  // --- Suppliers Logic ---
  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(searchSupplier.toLowerCase()) || 
    s.contact_name?.toLowerCase().includes(searchSupplier.toLowerCase())
  );

  const handleAddSupplier = async (values) => {
    try {
      await axiosClient.post('/purchasing/suppliers', values);
      message.success('Supplier added successfully');
      setSupplierModalVisible(false);
      supplierForm.resetFields();
      fetchSuppliers();
    } catch (error) {
      message.error(error.message || 'Failed to add supplier');
    }
  };

  const supplierColumns = [
    {
      title: t('purchasing.supplier'),
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={16} color="#3b82f6" />
          </div>
          <div>
            <Text strong style={{ display: 'block' }}>{record.name}</Text>
          </div>
        </div>
      )
    },
    { title: 'Contact Person', dataIndex: 'contact_name', key: 'contact_name', render: t => t || 'N/A' },
    {
      title: 'Contact Details',
      key: 'details',
      render: (_, record) => (
        <div>
          <Text style={{ display: 'block' }}>{record.phone || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email || ''}</Text>
        </div>
      )
    },
    {
      title: t('common.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
    },
  ];

  // --- Purchase Orders Logic ---
  const filteredPOs = pos.filter(p => 
    p.po_number?.toLowerCase().includes(searchPO.toLowerCase()) || 
    p.supplier_name?.toLowerCase().includes(searchPO.toLowerCase())
  );

  const handleMarkReceived = async (poId) => {
    try {
      await axiosClient.put(`/purchasing/purchase-orders/${poId}/status`, { status: 'Received' });
      message.success('Purchase Order marked as Received. Stock has been updated.');
      fetchPOs();
    } catch (error) {
      message.error(error.message || 'Failed to update status');
    }
  };

  const poColumns = [
    {
      title: t('purchasing.po_number'),
      key: 'po_number',
      render: (_, record) => (
        <Space>
          <FileText size={16} color="var(--text-secondary)" />
          <Text strong>{record.po_number}</Text>
        </Space>
      )
    },
    { title: t('purchasing.supplier'), dataIndex: 'supplier_name', key: 'supplier_name' },
    { title: t('orders.date'), dataIndex: 'created_at', key: 'created_at', render: (date) => <Text type="secondary">{new Date(date).toLocaleDateString()}</Text> },
    { 
      title: t('purchasing.expected_date'), 
      dataIndex: 'expected_date', 
      key: 'expected_date',
      render: (expected) => expected ? (
        <Space size={6}>
          <Clock size={14} color="#f59e0b" />
          <Text>{new Date(expected).toLocaleDateString()}</Text>
        </Space>
      ) : 'N/A'
    },
    { title: t('orders.items'), dataIndex: 'item_count', key: 'item_count', align: 'center' },
    { title: t('orders.total'), dataIndex: 'total_amount', key: 'total_amount', align: 'right', render: (val) => <Text strong>{formatCurrency(val)}</Text> },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'Received' ? 'green' : status === 'Pending' ? 'blue' : 'default';
        let icon = status === 'Received' ? <CheckCircle size={12} /> : null;
        return <Tag color={color} icon={icon}>{status}</Tag>;
      }
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: [
          { key: 'view', icon: <Eye size={16} />, label: t('common.view') },
          { 
            key: 'receive', 
            icon: <Truck size={16} />, 
            label: 'Mark Received', 
            disabled: record.status === 'Received',
            onClick: () => handleMarkReceived(record.id)
          },
        ]}} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreVertical size={16} />} />
        </Dropdown>
      )
    }
  ];

  // PO Item Handlers
  const addPoItem = () => {
    setPoItems([...poItems, { id: Date.now(), product_id: null, quantity: 1, unit_cost: 0 }]);
  };

  const removePoItem = (id) => {
    setPoItems(poItems.filter(item => item.id !== id));
  };

  const updatePoItem = (id, field, value) => {
    setPoItems(poItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) updated.unit_cost = Number(product.cost_price || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleAddPO = async (values) => {
    if (poItems.length === 0) {
      return message.error('Please add at least one item to the purchase order.');
    }
    
    // Validate items
    for (let item of poItems) {
      if (!item.product_id) return message.error('Please select a product for all rows.');
      if (item.quantity <= 0) return message.error('Quantity must be greater than 0.');
    }

    setSubmitting(true);
    try {
      const items = poItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost
      }));

      const total_amount = items.reduce((sum, i) => sum + i.total_cost, 0);

      const payload = {
        supplier_id: values.supplier_id,
        expected_date: values.expectedDate ? values.expectedDate.toISOString() : null,
        total_amount,
        items
      };

      await axiosClient.post('/purchasing/purchase-orders', payload);
      message.success('Purchase Order created successfully');
      setPoModalVisible(false);
      poForm.resetFields();
      setPoItems([]);
      fetchPOs();
    } catch (error) {
      message.error(error.message || 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPoAmount = poItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  // --- Tabs Content ---
  const suppliersTab = (
    <div className="fade-in">
      <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder={t('common.search')}
          prefix={<Search size={16} color="var(--text-secondary)" />}
          style={{ maxWidth: 300 }}
          value={searchSupplier}
          onChange={(e) => setSearchSupplier(e.target.value)}
          allowClear
        />
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setSupplierModalVisible(true)}>
          Add Supplier
        </Button>
      </div>
      <Table 
        columns={supplierColumns} 
        dataSource={filteredSuppliers} 
        rowKey="id" 
        pagination={{ pageSize: 10 }} 
        loading={loadingSuppliers}
      />
    </div>
  );

  const poTab = (
    <div className="fade-in">
      <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder={t('purchasing.search')}
          prefix={<Search size={16} color="var(--text-secondary)" />}
          style={{ maxWidth: 300 }}
          value={searchPO}
          onChange={(e) => setSearchPO(e.target.value)}
          allowClear
        />
        <Button type="primary" icon={<Plus size={16} />} onClick={() => {
          setPoItems([]);
          setPoModalVisible(true);
        }}>
          Create Purchase Order
        </Button>
      </div>
      <Table 
        columns={poColumns} 
        dataSource={filteredPOs} 
        rowKey="id" 
        pagination={{ pageSize: 10 }} 
        loading={loadingPOs}
      />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('purchasing.title')}</Title>
        <Text type="secondary">{t('purchasing.subtitle')}</Text>
      </div>

      <Card bordered={false} bodyStyle={{ padding: '0 24px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { key: 'suppliers', label: <span><Building size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Suppliers</span>, children: suppliersTab },
            { key: 'pos', label: <span><FileText size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Purchase Orders</span>, children: poTab },
          ]}
        />
      </Card>

      {/* Add Supplier Modal */}
      <Modal title="Add New Supplier" open={supplierModalVisible} onCancel={() => setSupplierModalVisible(false)} footer={null}>
        <Form form={supplierForm} layout="vertical" onFinish={handleAddSupplier} style={{ marginTop: 24 }}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Apple Inc." />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="contact_name" label="Contact Person">
              <Input placeholder="John Doe" />
            </Form.Item>
            <Form.Item name="phone" label="Phone Number">
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email Address">
            <Input placeholder="sales@company.com" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea placeholder="123 Business St." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Button onClick={() => setSupplierModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Supplier</Button>
          </div>
        </Form>
      </Modal>

      {/* Create PO Modal */}
      <Modal title="Create Purchase Order" open={poModalVisible} onCancel={() => setPoModalVisible(false)} footer={null} width={800} centered>
        <Form form={poForm} layout="vertical" onFinish={handleAddPO} style={{ marginTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="supplier_id" label="Select Supplier" rules={[{ required: true, message: 'Supplier is required' }]}>
              <Select placeholder="Choose a supplier">
                {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="expectedDate" label="Expected Delivery Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          
          <Divider orientation="left">Order Items</Divider>
          
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            {poItems.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 2 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Product</Text>
                  <Select 
                    showSearch
                    placeholder="Select product"
                    style={{ width: '100%' }}
                    value={item.product_id}
                    onChange={(v) => updatePoItem(item.id, 'product_id', v)}
                    optionFilterProp="children"
                  >
                    {products.map(p => (
                      <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>
                    ))}
                  </Select>
                </div>
                <div style={{ width: 100 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Quantity</Text>
                  <InputNumber 
                    min={1} 
                    value={item.quantity} 
                    onChange={(v) => updatePoItem(item.id, 'quantity', v)} 
                    style={{ width: '100%' }} 
                  />
                </div>
                <div style={{ width: 140 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Unit Cost</Text>
                  <InputNumber 
                    min={0} 
                    precision={2} 
                    value={item.unit_cost} 
                    onChange={(v) => updatePoItem(item.id, 'unit_cost', v)} 
                    style={{ width: '100%' }} 
                  />
                </div>
                <div style={{ width: 120, paddingTop: 26 }}>
                  <Text strong>{formatCurrency(item.quantity * item.unit_cost)}</Text>
                </div>
                <div style={{ paddingTop: 24 }}>
                  <Button type="text" danger icon={<Trash2 size={18} />} onClick={() => removePoItem(item.id)} />
                </div>
              </div>
            ))}
          </div>
          
          <Button type="dashed" block icon={<PlusCircle size={16} />} onClick={addPoItem}>
            Add Item
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
            <Text style={{ fontSize: 16 }}>Total Order Amount</Text>
            <Text strong style={{ fontSize: 24, color: '#3b82f6' }}>{formatCurrency(totalPoAmount)}</Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => setPoModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Create Purchase Order</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Purchasing;
