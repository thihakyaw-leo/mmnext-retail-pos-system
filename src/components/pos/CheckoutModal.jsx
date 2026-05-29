import React, { useState, useEffect } from 'react';
import { Modal, Typography, Button, InputNumber, Divider, Space, Segmented, Switch, Alert } from 'antd';
import { Banknote, CreditCard, QrCode, Split } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

const { Title, Text } = Typography;

const CheckoutModal = ({ visible, total, onCancel, onComplete }) => {
  const { formatCurrency, currencyConfig } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState(total);
  const [processing, setProcessing] = useState(false);
  
  // Split payment state
  const [isSplit, setIsSplit] = useState(false);
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(total);

  // Auto-update amountTendered when total changes if method is cash
  useEffect(() => {
    if (visible && !isSplit) {
      if (paymentMethod === 'cash') setAmountTendered(total);
      else setAmountTendered(0); // Card/mobile auto exact match conceptually
    } else if (visible && isSplit) {
      setSplitCard(Math.max(0, total - splitCash));
    }
  }, [visible, total, paymentMethod, isSplit]);

  // Handle Split calculation
  useEffect(() => {
    if (isSplit) {
      setSplitCard(Math.max(0, total - splitCash));
    }
  }, [splitCash, total, isSplit]);

  const changeDue = isSplit 
    ? Math.max(0, (splitCash + splitCard) - total) 
    : Math.max(0, amountTendered - total);
    
  const canCheckout = isSplit
    ? (splitCash + splitCard) >= total
    : (paymentMethod !== 'cash' || amountTendered >= total);

  const handleCheckout = () => {
    setProcessing(true);
    // Simulate API call or payment processing
    setTimeout(() => {
      setProcessing(false);
      
      const finalPayment = isSplit ? {
        method: 'split',
        total,
        amountTendered: splitCash + splitCard,
        changeDue,
        details: { cash: splitCash, card: splitCard }
      } : {
        method: paymentMethod,
        total,
        amountTendered: paymentMethod === 'cash' ? amountTendered : total,
        changeDue: paymentMethod === 'cash' ? changeDue : 0
      };
      
      onComplete(finalPayment);
    }, 1000);
  };

  const quickAmounts = [
    total,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  return (
    <Modal
      title={<Title level={3} style={{ margin: 0 }}>Complete Payment</Title>}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
      centered
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 12 }}>
          <Text type="secondary" style={{ fontSize: 16 }}>Amount Due</Text>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#3b82f6', lineHeight: 1.2 }}>
            {formatCurrency(total)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong>Payment Method</Text>
          <Space>
            <Text type="secondary">Split Payment</Text>
            <Switch checked={isSplit} onChange={setIsSplit} />
          </Space>
        </div>

        {!isSplit ? (
          <>
            <Segmented
              block
              size="large"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { label: <Space><Banknote size={16} /> Cash</Space>, value: 'cash' },
                { label: <Space><CreditCard size={16} /> Card</Space>, value: 'card' },
                { label: <Space><QrCode size={16} /> Mobile</Space>, value: 'mobile' },
              ]}
              style={{ marginBottom: 24 }}
            />

            {paymentMethod === 'cash' && (
              <div className="fade-in">
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Amount Tendered</Text>
                  <InputNumber
                    size="large"
                    prefix={currencyConfig.symbol}
                    style={{ width: '100%', fontSize: 24, height: 48 }}
                    value={amountTendered}
                    onChange={setAmountTendered}
                    min={0}
                    precision={2}
                    autoFocus
                  />
                </div>
                
                <Space size={8} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
                  {quickAmounts.map(amount => (
                    <Button 
                      key={amount} 
                      size="large"
                      onClick={() => setAmountTendered(amount)}
                      type={amountTendered === amount ? 'primary' : 'default'}
                      style={{ borderRadius: 8 }}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </Space>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '32px 0' }}>
                <CreditCard size={64} color="#3b82f6" style={{ opacity: 0.8, marginBottom: 16 }} />
                <br />
                <Text style={{ fontSize: 16 }}>Please follow instructions on the card terminal.</Text>
              </div>
            )}

            {paymentMethod === 'mobile' && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '32px 0' }}>
                <QrCode size={64} color="#10b981" style={{ opacity: 0.8, marginBottom: 16 }} />
                <br />
                <Text style={{ fontSize: 16 }}>Scan QR code with mobile wallet.</Text>
              </div>
            )}
          </>
        ) : (
          <div className="fade-in" style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
            <Alert message="Split Payment Active" type="info" showIcon style={{ marginBottom: 16 }} icon={<Split size={16} />} />
            
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}><Banknote size={14} style={{ verticalAlign: 'middle', marginRight: 4 }}/> Cash Amount</Text>
                <InputNumber
                  size="large"
                  prefix={currencyConfig.symbol}
                  style={{ width: '100%', fontSize: 20 }}
                  value={splitCash}
                  onChange={(val) => setSplitCash(val || 0)}
                  min={0}
                  precision={2}
                  autoFocus
                />
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}><CreditCard size={14} style={{ verticalAlign: 'middle', marginRight: 4 }}/> Card Amount</Text>
                <InputNumber
                  size="large"
                  prefix={currencyConfig.symbol}
                  style={{ width: '100%', fontSize: 20 }}
                  value={splitCard}
                  onChange={(val) => setSplitCard(val || 0)}
                  min={0}
                  precision={2}
                />
              </div>
            </Space>
          </div>
        )}

        {(!isSplit && paymentMethod === 'cash') || isSplit ? (
          <div style={{ 
            padding: 16, 
            background: changeDue > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)', 
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: `1px solid ${changeDue > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}`
          }}>
            <Text style={{ fontSize: 16, color: changeDue > 0 ? '#10b981' : 'var(--text-secondary)' }}>Change Due</Text>
            <Text strong style={{ fontSize: 28, color: changeDue > 0 ? '#10b981' : 'var(--text-primary)' }}>
              {formatCurrency(changeDue)}
            </Text>
          </div>
        ) : null}

        <Divider style={{ margin: '24px 0' }} />

        <div style={{ display: 'flex', gap: 12 }}>
          <Button size="large" style={{ flex: 1, height: 48, borderRadius: 8 }} onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            size="large" 
            style={{ 
              flex: 2, 
              height: 48, 
              borderRadius: 8, 
              fontSize: 16, 
              fontWeight: 600,
              background: canCheckout ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
              border: 'none'
            }}
            onClick={handleCheckout}
            loading={processing}
            disabled={!canCheckout}
          >
            {processing ? 'Processing...' : `Confirm Payment`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CheckoutModal;
