import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Typography, Input, Button, Badge, Empty, List, Divider, Space, Segmented, notification, Tooltip } from 'antd';
import { Search, ShoppingCart, Trash2, Plus, Minus, Tag, User, PauseCircle, PlayCircle, CreditCard, Keyboard } from 'lucide-react';
import CheckoutModal from '../components/pos/CheckoutModal';
import ReceiptModal from '../components/pos/ReceiptModal';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';
import { offlineSyncService } from '../services/OfflineSyncService';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSettings } from '../contexts/SettingsContext';

const { Title, Text } = Typography;

// Mock products with barcodes
const MOCK_PRODUCTS = [
  { id: '1', name: 'MacBook Pro 14"', price: 1999.00, stock: 15, category: 'Laptops', image: 'https://via.placeholder.com/150?text=MacBook', barcode: '10001' },
  { id: '2', name: 'iPhone 15 Pro', price: 999.00, stock: 42, category: 'Phones', image: 'https://via.placeholder.com/150?text=iPhone', barcode: '10002' },
  { id: '3', name: 'AirPods Pro', price: 249.00, stock: 108, category: 'Accessories', image: 'https://via.placeholder.com/150?text=AirPods', barcode: '10003' },
  { id: '4', name: 'iPad Air', price: 599.00, stock: 23, category: 'Tablets', image: 'https://via.placeholder.com/150?text=iPad', barcode: '10004' },
  { id: '5', name: 'Magic Keyboard', price: 299.00, stock: 5, category: 'Accessories', image: 'https://via.placeholder.com/150?text=Keyboard', barcode: '10005' },
  { id: '6', name: 'Apple Watch S9', price: 399.00, stock: 30, category: 'Accessories', image: 'https://via.placeholder.com/150?text=Watch', barcode: '10006' },
  { id: '7', name: 'USB-C Cable', price: 19.00, stock: 200, category: 'Accessories', image: 'https://via.placeholder.com/150?text=Cable', barcode: '10007' },
  { id: '8', name: 'Power Adapter', price: 39.00, stock: 85, category: 'Accessories', image: 'https://via.placeholder.com/150?text=Adapter', barcode: '10008' },
];

const CATEGORIES = ['All', 'Laptops', 'Phones', 'Tablets', 'Accessories'];

const POS = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { orgSettings } = useSettings();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [heldOrders, setHeldOrders] = useState([]);
  
  // Modals state
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState(null);

  // Refs for keyboard listener to always access latest state
  const cartRef = useRef(cart);
  const productsRef = useRef(products);
  const checkoutVisibleRef = useRef(checkoutVisible);
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    checkoutVisibleRef.current = checkoutVisible;
  }, [checkoutVisible]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await axiosClient.get('/products');
        // Map backend fields to frontend expected fields
        const mappedProducts = (response.data || []).map(p => ({
          ...p,
          price: p.selling_price || p.price || 0,
          stock: p.stock_quantity || 100, // Fallback if inventory is not joined
          image: p.image_url || 'https://via.placeholder.com/150?text=No+Image',
          category: p.category_name || 'Uncategorized'
        }));
        
        setProducts(mappedProducts.length > 0 ? mappedProducts : MOCK_PRODUCTS);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (checkoutVisibleRef.current || receiptVisible) return;

      // Handle Hotkeys
      if (e.key === 'F4') {
        e.preventDefault();
        if (cartRef.current.length > 0) setCheckoutVisible(true);
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (cartRef.current.length > 0) clearCart();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleHoldOrder();
        return;
      }

      // Barcode Scanner Logic
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = e.key.length === 1 ? e.key : '';
      } else {
        if (e.key === 'Enter' && barcodeBuffer.current.length > 2) {
          e.preventDefault();
          const scannedCode = barcodeBuffer.current;
          const product = productsRef.current.find(p => p.barcode === scannedCode);
          if (product) {
            addToCart(product);
            notification.success({ message: `Scanned: ${product.name}`, placement: 'bottomRight', duration: 1 });
          } else {
            notification.warning({ message: 'Barcode not found', description: scannedCode, placement: 'bottomRight' });
          }
          barcodeBuffer.current = '';
        } else if (e.key.length === 1) {
          barcodeBuffer.current += e.key;
        }
      }
      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Computed totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Enforce Max Discount
  const allowDiscount = orgSettings?.settings?.allow_discount ?? true;
  const maxDiscountPercent = orgSettings?.settings?.max_discount_percent ?? 100;
  const actualDiscountPercent = allowDiscount ? Math.min(discountPercent, maxDiscountPercent) : 0;
  
  const discountAmount = subtotal * (actualDiscountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  
  // Enforce Tax Rate
  const taxRate = orgSettings?.tax_rate ? orgSettings.tax_rate / 100 : 0.10; // Default 10% if undefined
  const taxAmount = taxableAmount * taxRate;
  const grandTotal = taxableAmount + taxAmount;

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          notification.warning({ message: 'Stock limit reached', duration: 2 });
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, animKey: Date.now() } : item);
      }
      return [...prev, { ...product, quantity: 1, animKey: Date.now() }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.stock) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [...prev, { id: Date.now(), cart, discountPercent, time: new Date() }]);
    clearCart();
    notification.info({ message: 'Order Held', placement: 'bottomRight' });
  };

  const resumeHoldOrder = (order) => {
    if (cart.length > 0) {
      handleHoldOrder(); // Hold current before restoring
    }
    setCart(order.cart);
    setDiscountPercent(order.discountPercent);
    setHeldOrders(prev => prev.filter(o => o.id !== order.id));
  };

  const handleCheckoutComplete = async (paymentDetails) => {
    const orderData = {
      store_id: 1, // Fallback store ID
      order_number: `ORD-${Date.now()}`,
      items: cart.map(item => ({
        product_id: parseInt(item.id),
        quantity: item.quantity,
        unit_price: item.price,
        total_amount: item.price * item.quantity
      })),
      subtotal,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      discount_amount: discountAmount,
      total_amount: grandTotal,
      payment_method: paymentDetails.method,
      payment_status: 'completed'
    };

    try {
      if (!offlineSyncService.isOnline) {
        throw new Error('Network Offline');
      }
      await axiosClient.post('/orders', orderData);
      notification.success({ message: 'Order created successfully', placement: 'bottomRight' });
    } catch (error) {
      console.error('Order submission failed:', error);
      // If network error (or forced offline error), queue the order locally
      if (!offlineSyncService.isOnline || error.message.includes('Network') || error.message.includes('timeout')) {
        await offlineSyncService.queueOrder(orderData);
      } else {
        notification.error({ message: 'Failed to create order', description: error.message, placement: 'bottomRight' });
      }
    }

    setCheckoutVisible(false);
    
    setLastOrderDetails({
      items: [...cart],
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: grandTotal,
      payment: paymentDetails
    });
    
    setReceiptVisible(true);
    clearCart();
    
    // Auto-print Receipt
    if (orgSettings?.settings?.auto_print_receipt) {
      setTimeout(() => {
        window.print();
      }, 500); // Wait for modal to render
    }
  };

  return (
    <Row style={{ height: '100%' }}>
      {/* Left Area: Products */}
      <Col xs={24} md={15} lg={16} xl={17} style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Input 
                size="large"
                placeholder="Search by name or barcode..."
                prefix={<Search size={18} color="var(--text-secondary)" />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                allowClear
                style={{ borderRadius: 8, flex: 1 }}
              />
              <Tooltip title="Scanner Ready. Just scan any item.">
                <Badge status="processing" text="Scanner Active" />
              </Tooltip>
            </div>
            <Segmented 
              options={CATEGORIES} 
              value={selectedCategory} 
              onChange={setSelectedCategory} 
              size="large"
            />
          </Space>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg-default)' }}>
          <Row gutter={[16, 16]}>
            {filteredProducts.map(product => (
              <Col xs={12} sm={8} lg={6} xl={4} key={product.id}>
                <Card 
                  hoverable 
                  className="hover-lift"
                  bodyStyle={{ padding: 12 }}
                  onClick={() => addToCart(product)}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {product.stock <= 5 && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 8px', borderBottomLeftRadius: 8, zIndex: 10 }}>
                      Only {product.stock} left
                    </div>
                  )}
                  <div style={{ height: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={product.image} alt={product.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Text strong style={{ fontSize: 13, lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, marginBottom: 8 }}>{product.barcode}</Text>
                    <Text style={{ color: '#10b981', fontWeight: 700, fontSize: 16 }}>
                      {formatCurrency(product.price)}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          {filteredProducts.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Empty description="No products found" />
            </div>
          )}
        </div>
      </Col>

      {/* Right Area: Cart */}
      <Col xs={24} md={9} lg={8} xl={7} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
        
        {/* Held Orders Quick Access */}
        {heldOrders.length > 0 && (
          <div style={{ padding: '8px 24px', background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {heldOrders.map((order, i) => (
              <Button key={order.id} size="small" type="primary" ghost icon={<PlayCircle size={14} />} onClick={() => resumeHoldOrder(order)}>
                Order #{i + 1}
              </Button>
            ))}
          </div>
        )}

        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Button block icon={<User size={16} />} style={{ textAlign: 'left', justifyContent: 'flex-start', borderRadius: 8, height: 40 }}>
            {t('pos.add_customer')}
          </Button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
              <ShoppingCart size={48} style={{ marginBottom: 16 }} />
              <Text>{t('pos.cart_empty')}</Text>
            </div>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={cart}
              renderItem={item => (
                <List.Item 
                  key={item.animKey}
                  className="fade-in"
                  style={{ padding: '16px 0', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}
                  actions={[
                    <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => removeFromCart(item.id)} />
                  ]}
                >
                  <List.Item.Meta
                    title={<Text strong style={{ fontSize: 14 }}>{item.name}</Text>}
                    description={<Text style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(item.price)}</Text>}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 6 }}>
                    <Button type="text" size="small" icon={<Minus size={14} />} onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1} />
                    <Text strong style={{ width: 24, textAlign: 'center' }}>{item.quantity}</Text>
                    <Button type="text" size="small" icon={<Plus size={14} />} onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.stock} />
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>

        {/* Totals & Actions */}
        <div style={{ padding: 24, background: 'var(--bg-elevated)', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            
            {/* Quick Discount Buttons */}
            {allowDiscount && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[0, 5, 10, 20].map(pct => (
                  <Button 
                    key={pct} 
                    size="small" 
                    type={discountPercent === pct ? 'primary' : 'default'}
                    onClick={() => setDiscountPercent(pct)}
                    disabled={pct > maxDiscountPercent}
                    style={{ flex: 1, borderRadius: 6 }}
                  >
                    {pct === 0 ? 'No Disc' : `${pct}%`}
                  </Button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">{t('pos.subtotal')}</Text>
              <Text strong>{formatCurrency(subtotal)}</Text>
            </div>
            
            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={12} /> {t('pos.discount')} ({discountPercent}%)
                </Text>
                <Text type="danger">-{formatCurrency(discountAmount)}</Text>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">{t('pos.tax', { rate: taxRate * 100 })}</Text>
              <Text strong>{formatCurrency(taxAmount)}</Text>
            </div>
            
            <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 18 }}>{t('pos.total')}</Text>
              <Text strong style={{ fontSize: 32, color: '#3b82f6', lineHeight: 1 }}>{formatCurrency(grandTotal)}</Text>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="large" onClick={handleHoldOrder} disabled={cart.length === 0} icon={<PauseCircle size={16}/>} style={{ flex: 1 }}>
                Hold (F9)
              </Button>
              <Button size="large" danger onClick={clearCart} disabled={cart.length === 0} icon={<Trash2 size={16}/>} style={{ flex: 1 }}>
                Clear (F8)
              </Button>
            </div>
            <Button 
              type="primary" 
              size="large" 
              block
              style={{ height: 56, fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: 8, marginTop: 8 }} 
              disabled={cart.length === 0}
              onClick={() => setCheckoutVisible(true)}
            >
              <CreditCard size={20} style={{ marginRight: 8 }} />
              PAY NOW (F4)
            </Button>
          </Space>
        </div>
      </Col>

      {/* Modals */}
      <CheckoutModal 
        visible={checkoutVisible} 
        total={grandTotal} 
        onCancel={() => setCheckoutVisible(false)} 
        onComplete={handleCheckoutComplete} 
      />
      
      <ReceiptModal
        visible={receiptVisible}
        orderDetails={lastOrderDetails}
        onNewOrder={() => setReceiptVisible(false)}
        onPrint={() => {
          window.print();
          setReceiptVisible(false);
        }}
      />
    </Row>
  );
};

export default POS;
