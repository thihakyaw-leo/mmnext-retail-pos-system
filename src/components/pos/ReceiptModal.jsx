import React, { useState, useEffect } from 'react';
import { Modal, Typography, Button, Divider, Space, Spin } from 'antd';
import { Printer, Mail, PlusCircle, Store, Package } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useSettings } from '../../contexts/SettingsContext';

const { Title, Text } = Typography;

const ReceiptModal = ({ visible, orderDetails, onNewOrder, onPrint }) => {
  const { formatCurrency } = useCurrency();
  const { orgSettings, loadingSettings } = useSettings();

  if (!orderDetails) return null;

  const { items, total, subtotal, tax, discount, payment } = orderDetails;

  return (
    <Modal
      title={null}
      open={visible}
      closable={false}
      footer={null}
      width={400}
      centered
      maskClosable={false}
      bodyStyle={{ padding: 0 }}
    >
      <Spin spinning={loadingSettings}>
        <div style={{ background: '#fff', color: '#000', padding: 32, borderRadius: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {orgSettings?.settings?.show_logo !== false && (
              <Store size={48} color="#000" style={{ marginBottom: 8 }} />
            )}
            <Title level={4} style={{ margin: 0, color: '#000', whiteSpace: 'pre-line' }}>
              {orgSettings?.settings?.header_text || orgSettings?.name || 'MMNEXT POS'}
            </Title>
            {/* If header_text is not provided, use default address blocks */}
            {!orgSettings?.settings?.header_text && (
              <>
                <Text style={{ color: '#666', fontSize: 12 }}>{orgSettings?.address || '123 Tech Avenue, Suite 100'}</Text><br />
                <Text style={{ color: '#666', fontSize: 12 }}>{orgSettings?.city ? `${orgSettings.city}, ${orgSettings.state || ''}` : 'San Francisco, CA 94105'}</Text><br />
                <Text style={{ color: '#666', fontSize: 12 }}>Tel: {orgSettings?.phone || '+1 234 567 8900'}</Text>
              </>
            )}
          </div>

          <div style={{ borderBottom: '1px dashed #ccc', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: '#000', fontSize: 12 }}>Date: {new Date().toLocaleDateString()}</Text>
            <Text style={{ color: '#000', fontSize: 12 }}>Time: {new Date().toLocaleTimeString()}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: '#000', fontSize: 12 }}>Receipt #: RCP-{Math.floor(Math.random() * 1000000)}</Text>
            {orgSettings?.settings?.show_cashier !== false && (
              <Text style={{ color: '#000', fontSize: 12 }}>Cashier: Staff</Text>
            )}
          </div>
          
          {orgSettings?.settings?.show_customer !== false && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: '#000', fontSize: 12 }}>Customer: Walk-in</Text>
            </div>
          )}

          <div style={{ borderBottom: '1px dashed #ccc', margin: '16px 0' }} />

        <div style={{ marginBottom: 16 }}>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <Text style={{ color: '#000', fontSize: 14 }}>{item.name}</Text>
                <div style={{ color: '#666', fontSize: 12 }}>{item.quantity} x {formatCurrency(item.price)}</div>
              </div>
              <Text style={{ color: '#000', fontSize: 14 }}>{formatCurrency(item.quantity * item.price)}</Text>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: '1px dashed #ccc', margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#666' }}>Subtotal</Text>
          <Text style={{ color: '#000' }}>{formatCurrency(subtotal)}</Text>
        </div>
        
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#666' }}>Discount</Text>
            <Text style={{ color: '#ef4444' }}>-{formatCurrency(discount)}</Text>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#666' }}>Tax (10%)</Text>
          <Text style={{ color: '#000' }}>{formatCurrency(tax)}</Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text strong style={{ color: '#000', fontSize: 18 }}>TOTAL</Text>
          <Text strong style={{ color: '#000', fontSize: 24 }}>{formatCurrency(total)}</Text>
        </div>

        <div style={{ borderBottom: '1px dashed #ccc', margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#666' }}>Payment ({payment.method.toUpperCase()})</Text>
          <Text style={{ color: '#000' }}>{formatCurrency(payment.amountTendered)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <Text style={{ color: '#666' }}>Change Due</Text>
          <Text style={{ color: '#000' }}>{formatCurrency(payment.changeDue)}</Text>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24, whiteSpace: 'pre-line' }}>
          <Text style={{ color: '#000', fontSize: 12 }}>
            {orgSettings?.settings?.footer_text || 'Thank you for your business!\nPlease come again.'}
          </Text>
        </div>
        
        {orgSettings?.settings?.show_barcode !== false && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ 
              height: 50, 
              width: '100%', 
              background: 'repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 6px, #fff 6px, #fff 7px, #000 7px, #000 10px, #fff 10px, #fff 12px)' 
            }}></div>
            <div style={{ fontSize: 11, marginTop: 4 }}>RCP-BARCODE</div>
          </div>
        )}
      </div>
      </Spin>

      <div style={{ padding: 24, background: 'var(--bg-elevated)', borderRadius: '0 0 8px 8px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button 
              size="large" 
              icon={<Printer size={18} />} 
              style={{ flex: 1 }}
              onClick={onPrint}
            >
              Print Receipt
            </Button>
            <Button 
              size="large" 
              icon={<Mail size={18} />} 
              style={{ flex: 1 }}
            >
              Email
            </Button>
          </div>
          <Button 
            type="primary" 
            size="large" 
            block 
            icon={<PlusCircle size={18} />} 
            onClick={onNewOrder}
          >
            New Order
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
