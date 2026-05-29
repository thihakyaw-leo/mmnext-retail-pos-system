import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Space, Button, Input, Select, Modal, Form, InputNumber, Row, Col, Upload, Tabs, message, Tooltip, Switch } from 'antd';
import { Search, Filter, Plus, Edit, Trash2, Package, UploadCloud, Image as ImageIcon, FolderTree } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Products = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('products');
  
  // Product States
  const [searchText, setSearchText] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [imageFile, setImageFile] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Category States
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [catForm] = Form.useForm();
  const [editingCat, setEditingCat] = useState(null);

  const { user } = useAuth();

  const fetchCategories = async () => {
    try {
      setCatLoading(true);
      const res = await axiosClient.get('/categories');
      setCategories(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      message.error('Failed to load categories');
    } finally {
      setCatLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/products');
      const formattedProducts = (response.data.data || []).map((prod) => ({
        ...prod,
        key: prod.id,
        stock: prod.quantity_on_hand !== undefined ? prod.quantity_on_hand : prod.stock_quantity
      }));
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
      // Fetch categories for the select dropdown
      fetchCategories();
    } else {
      fetchCategories();
    }
  }, [activeTab]);

  const getStockStatus = (stock) => {
    if (stock <= 0) return { label: 'Out of Stock', color: 'error' };
    if (stock < 20) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  // --- PRODUCTS ---
  const productColumns = [
    {
      title: t('products.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.image_url ? (
            <img src={record.image_url} alt={text} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
          ) : (
            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={20} color="var(--text-secondary)" />
            </div>
          )}
          <div>
            <Text strong>{text}</Text>
            {record.description && (
               <Tooltip title={record.description}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, maxWidth: 200 }} ellipsis>{record.description}</Text>
               </Tooltip>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'SKU/Barcode',
      key: 'identifiers',
      render: (_, record) => (
        <div>
          <Text type="secondary" style={{ fontFamily: 'monospace', display: 'block', fontSize: 12 }}>SKU: {record.sku}</Text>
          {record.barcode && <Text type="secondary" style={{ fontFamily: 'monospace', display: 'block', fontSize: 12 }}>BC: {record.barcode}</Text>}
        </div>
      )
    },
    {
      title: t('products.category'),
      dataIndex: 'category_name',
      key: 'category_name',
      render: (text) => text || <Text type="secondary">None</Text>
    },
    {
      title: 'Pricing',
      key: 'pricing',
      render: (_, record) => {
        const margin = record.selling_price - (record.cost_price || 0);
        const marginPct = record.cost_price > 0 ? (margin / record.cost_price) * 100 : 100;
        return (
          <div>
            <Text strong style={{ display: 'block', color: '#10b981' }}>Sell: ${Number(record.selling_price).toFixed(2)}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Cost: ${Number(record.cost_price || 0).toFixed(2)}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Margin: {marginPct.toFixed(1)}%</Text>
          </div>
        );
      }
    },
    {
      title: t('products.stock'),
      dataIndex: 'stock',
      key: 'stock',
      render: (stock) => {
        const { label, color } = getStockStatus(stock);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{stock}</Text>
            <Tag color={color} style={{ borderRadius: 4, margin: 0, fontSize: 10 }}>{label}</Tag>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (val) => <Tag color={val ? 'green' : 'default'}>{val ? 'Active' : 'Inactive'}</Tag>
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<Edit size={16} color="#3b82f6" />} onClick={() => handleEditProduct(record)} />
          <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDeleteProduct(record.id)} />
        </Space>
      ),
    },
  ];

  const handleAddProduct = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, cost: 0, tax_rate: 0, initial_stock: 0 });
    setIsModalVisible(true);
  };

  const handleEditProduct = (record) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      sku: record.sku,
      barcode: record.barcode,
      price: record.selling_price,
      cost: record.cost_price,
      tax_rate: record.tax_rate,
      category_id: record.category_id,
      is_active: Boolean(record.is_active)
    });
    setIsModalVisible(true);
  };

  const handleDeleteProduct = (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this product?',
      content: 'This action cannot be undone. It will be marked as inactive.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axiosClient.delete(`/products/${id}`);
          message.success('Product deleted');
          fetchProducts();
        } catch (error) {
          console.error('Failed to delete product', error);
          message.error('Failed to delete product');
        }
      }
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', values.description || '');
        formData.append('sku', values.sku);
        formData.append('barcode', values.barcode || '');
        formData.append('price', values.price);
        formData.append('cost', values.cost || 0);
        formData.append('tax_rate', values.tax_rate || 0);
        formData.append('is_active', values.is_active ? 1 : 0);
        
        if (values.category_id) {
          formData.append('category_id', values.category_id);
        }
        
        if (!editingProduct && values.initial_stock) {
          formData.append('initial_stock', values.initial_stock);
          formData.append('store_id', '1'); // Default store id for now
        }
        
        if (imageFile) {
          formData.append('image', imageFile);
        }

        if (editingProduct) {
          await axiosClient.put(`/products/${editingProduct.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          message.success('Product updated successfully');
        } else {
          await axiosClient.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          message.success('Product created successfully');
        }
        
        fetchProducts();
        setIsModalVisible(false);
        form.resetFields();
        setImageFile(null);
        setEditingProduct(null);
      } catch (error) {
        console.error('Failed to save product:', error);
        message.error(error.response?.data?.error || 'Failed to save product');
      } finally {
        setLoading(false);
      }
    });
  };

  // --- CATEGORIES ---
  const catColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (text) => <Text strong>{text}</Text> },
    { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (text) => <Text type="secondary">{text}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Sort Order', dataIndex: 'sort_order', key: 'sort_order' },
    { title: 'Status', dataIndex: 'is_active', key: 'is_active', render: (val) => <Tag color={val ? 'green' : 'default'}>{val ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<Edit size={16} color="#3b82f6" />} onClick={() => handleEditCat(record)} />
          <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDeleteCat(record.id)} />
        </Space>
      ),
    },
  ];

  const handleAddCat = () => {
    setEditingCat(null);
    catForm.resetFields();
    catForm.setFieldsValue({ is_active: true, sort_order: 0 });
    setIsCatModalVisible(true);
  };

  const handleEditCat = (record) => {
    setEditingCat(record);
    catForm.setFieldsValue({
      name: record.name,
      description: record.description,
      sort_order: record.sort_order,
      is_active: Boolean(record.is_active)
    });
    setIsCatModalVisible(true);
  };

  const handleDeleteCat = (id) => {
    Modal.confirm({
      title: 'Delete Category?',
      content: 'Products in this category will become uncategorized. Continue?',
      onOk: async () => {
        try {
          await axiosClient.delete(`/categories/${id}`);
          message.success('Category deleted');
          fetchCategories();
        } catch (error) {
          message.error(error.response?.data?.error || 'Failed to delete category');
        }
      }
    });
  };

  const handleCatModalOk = () => {
    catForm.validateFields().then(async (values) => {
      try {
        setCatLoading(true);
        const payload = {
          ...values,
          is_active: values.is_active ? 1 : 0
        };

        if (editingCat) {
          await axiosClient.put(`/categories/${editingCat.id}`, payload);
          message.success('Category updated');
        } else {
          await axiosClient.post('/categories', payload);
          message.success('Category created');
        }
        
        fetchCategories();
        setIsCatModalVisible(false);
      } catch (error) {
        message.error(error.response?.data?.error || 'Failed to save category');
      } finally {
        setCatLoading(false);
      }
    });
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Package size={28} color="#3b82f6" />
            {activeTab === 'products' ? t('products.title') : 'Categories'}
          </Title>
          <Text type="secondary">{activeTab === 'products' ? t('products.subtitle') : 'Manage product groupings'}</Text>
        </div>
        {user?.role === 'admin' || user?.role === 'manager' ? (
          <Button 
            type="primary" 
            icon={<Plus size={16} />}
            style={{ background: '#3b82f6', borderRadius: 8, height: 40 }}
            onClick={activeTab === 'products' ? handleAddProduct : handleAddCat}
            className="hover-lift"
          >
            {activeTab === 'products' ? t('products.add_product') : 'Add Category'}
          </Button>
        ) : null}
      </div>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'products',
              label: <span><Package size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Products List</span>,
              children: (
                <>
                  <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Input 
                      placeholder={t('products.search')} 
                      prefix={<Search size={16} color="var(--text-secondary)" />}
                      style={{ width: 320, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    <Select defaultValue="all" style={{ width: 160 }} dropdownStyle={{ background: '#1e293b' }}>
                      <Select.Option value="all">All Categories</Select.Option>
                      {categories.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
                    </Select>
                    <Button icon={<Filter size={16} />} style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)' }}>
                      More Filters
                    </Button>
                  </div>
                  <Table 
                    columns={productColumns} 
                    dataSource={products}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              )
            },
            {
              key: 'categories',
              label: <span><FolderTree size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Categories</span>,
              children: (
                <div style={{ padding: '24px 0' }}>
                  <Table 
                    columns={catColumns} 
                    dataSource={categories}
                    loading={catLoading}
                    pagination={{ pageSize: 10 }}
                    rowKey="id"
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* PRODUCT MODAL */}
      <Modal
        title={editingProduct ? t('products.edit_title', 'Edit Product') : t('products.add_title')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); setImageFile(null); setEditingProduct(null); }}
        okText={t('products.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ style: { background: '#3b82f6' } }}
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label={t('products.name')} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_id" label={t('products.category')}>
                <Select placeholder="Select category">
                  {categories.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sku" label={t('products.barcode', 'SKU')} rules={[{ required: true }]}>
                <Input placeholder="Stock Keeping Unit" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="barcode" label="Barcode (Optional)">
                <Input placeholder="Scan or enter barcode" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="cost" label="Cost Price">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="price" label={t('products.price', 'Selling Price')} rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tax_rate" label="Tax Rate (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.1} />
              </Form.Item>
            </Col>
          </Row>

          {!editingProduct && (
            <Row gutter={16}>
              <Col span={12}>
                 <Form.Item name="initial_stock" label="Initial Stock Quantity">
                   <InputNumber style={{ width: '100%' }} min={0} />
                 </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('products.image', 'Product Image')}>
                <Upload
                  accept="image/*"
                  beforeUpload={(file) => {
                    setImageFile(file);
                    return false;
                  }}
                  maxCount={1}
                  onRemove={() => setImageFile(null)}
                >
                  <Button icon={<UploadCloud size={16} />}>Select Image</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal
        title={editingCat ? "Edit Category" : "Add Category"}
        open={isCatModalVisible}
        onOk={handleCatModalOk}
        onCancel={() => { setIsCatModalVisible(false); catForm.resetFields(); }}
      >
        <Form form={catForm} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sort_order" label="Sort Order">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
