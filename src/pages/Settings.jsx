import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Tabs, 
  Form, 
  Input, 
  InputNumber, 
  Switch, 
  Button, 
  Divider,
  message,
  Space,
  Select
} from 'antd';
import { 
  Building2, 
  Calculator, 
  Package, 
  ShieldCheck,
  Save,
  CreditCard,
  Printer,
  Globe,
  Bell,
  Receipt
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useCurrency } from '../contexts/CurrencyContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Mock settings data matching the backend database schema
const mockSettings = {
  business: {
    business_name: 'Cloudflare Enterprise POS',
    business_email: 'contact@cloudflarepos.com',
    business_phone: '+1 234 567 8900',
    business_address: '123 Tech Avenue, Suite 100\nSan Francisco, CA 94105',
  },
  pos: {
    currency: 'USD',
    tax_rate: 10,
    receipt_footer: 'Thank you for your business! Please come again.',
    allow_discount: true,
    max_discount_percent: 50,
    auto_print_receipt: true,
  },
  inventory: {
    low_stock_threshold: 10,
  },
  security: {
    session_timeout: 480,
    max_login_attempts: 5,
    lockout_duration: 30,
  },
  payment: {
    accept_cash: true,
    accept_card: true,
    accept_mobile: true,
    kpay_merchant_id: 'KP-123456',
    wavepay_merchant_id: 'WP-789012',
  },
  hardware: {
    printer_type: 'usb',
    printer_ip: '',
    usb_printer_name: 'POS-80C',
    paper_size: '80mm',
    cash_drawer_auto_open: true,
  },
  localization: {
    language: 'en',
    timezone: 'Asia/Yangon',
    date_format: 'DD/MM/YYYY',
  },
  notifications: {
    daily_report_email: true,
    low_stock_email: true,
    large_transaction_alert: false,
    alert_email: 'admin@cloudflarepos.com'
  },
  receipt: {
    header_text: 'Cloudflare Enterprise POS\n123 Tech Avenue\nYangon, Myanmar',
    footer_text: 'Thank you for your business!\nPlease come again.',
    show_logo: true,
    show_cashier: true,
    show_customer: true,
    show_barcode: true
  }
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { refreshSettings } = useSettings();
  const { changeCurrency } = useCurrency();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get('/organization');
        if (response?.data) {
          const org = response.data;
          
          // Flatten organization fields and settings JSON for the form
          const flattenedSettings = {
            business_name: org.name,
            business_description: org.description,
            business_email: org.email,
            business_phone: org.phone,
            business_address: org.address,
            business_city: org.city,
            business_state: org.state,
            business_country: org.country,
            business_postal_code: org.postal_code,
            currency: org.currency,
            tax_rate: org.tax_rate,
            timezone: org.timezone,
            
            // Default mock fallbacks if settings is empty
            ...mockSettings.pos,
            ...mockSettings.inventory,
            ...mockSettings.security,
            ...mockSettings.payment,
            ...mockSettings.hardware,
            ...mockSettings.localization,
            ...mockSettings.notifications,
            ...mockSettings.receipt,
            
            // Override with actual settings from DB
            ...(org.settings || {})
          };
          
          setInitialValues(flattenedSettings);
          form.setFieldsValue(flattenedSettings);
          
          if (flattenedSettings.language && flattenedSettings.language !== i18n.language) {
             i18n.changeLanguage(flattenedSettings.language);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error, error.response?.data || error.message);
        message.error(`Failed to load settings: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Group the flat form values back into organization schema
      const {
        business_name,
        business_description,
        business_email,
        business_phone,
        business_address,
        business_city,
        business_state,
        business_country,
        business_postal_code,
        currency,
        tax_rate,
        timezone,
        ...restSettings // Everything else goes into the settings JSON
      } = values;

      const payload = {
        name: business_name,
        description: business_description,
        email: business_email,
        phone: business_phone,
        address: business_address,
        city: business_city,
        state: business_state,
        country: business_country,
        postal_code: business_postal_code,
        currency: currency,
        tax_rate: tax_rate,
        timezone: timezone,
        settings: restSettings
      };

      await axiosClient.put('/organization', payload);
      if (values.language) {
         i18n.changeLanguage(values.language);
      }
      if (values.currency) {
         changeCurrency(values.currency);
      }
      await refreshSettings();
      message.success(t('common.save') + ' successful');
    } catch (error) {
      console.error('Save settings error:', error);
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const header_text = Form.useWatch('header_text', form) || mockSettings.receipt.header_text;
  const footer_text = Form.useWatch('footer_text', form) || mockSettings.receipt.footer_text;
  const show_logo = Form.useWatch('show_logo', form) ?? mockSettings.receipt.show_logo;
  const show_cashier = Form.useWatch('show_cashier', form) ?? mockSettings.receipt.show_cashier;
  const show_customer = Form.useWatch('show_customer', form) ?? mockSettings.receipt.show_customer;
  const show_barcode = Form.useWatch('show_barcode', form) ?? mockSettings.receipt.show_barcode;

  const businessTab = (
    <div className="fade-in">
      <Title level={4}>Business Information</Title>
      <Text type="secondary">Update your company details and contact information.</Text>
      <Divider />
      <Form.Item name="business_name" label={t('settings.business_name')} rules={[{ required: true }]}>
        <Input placeholder="Enter business name" />
      </Form.Item>
      <Form.Item name="business_email" label="Contact Email" rules={[{ type: 'email' }]}>
        <Input placeholder="admin@example.com" />
      </Form.Item>
      <Form.Item name="business_phone" label="Phone Number">
        <Input placeholder="+1 234 567 8900" />
      </Form.Item>
      <Form.Item name="business_address" label="Business Address">
        <TextArea rows={3} placeholder="Enter full address" />
      </Form.Item>
    </div>
  );

  const posTab = (
    <div className="fade-in">
      <Title level={4}>Point of Sale (POS) Settings</Title>
      <Text type="secondary">Configure receipt, tax, and checkout preferences.</Text>
      <Divider />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <Form.Item name="currency" label={t('settings.currency')} rules={[{ required: true }]}>
          <Input placeholder="e.g., USD, EUR, MMK" />
        </Form.Item>
        <Form.Item name="tax_rate" label={t('settings.tax_rate')} rules={[{ required: true }]}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
      </div>
      
      <Form.Item name="receipt_footer" label="Receipt Footer Message">
        <TextArea rows={2} placeholder="Thank you message on receipts" />
      </Form.Item>
      
      <Divider dashed />
      <Title level={5}>Discounts & Checkout</Title>
      
      <Form.Item name="allow_discount" valuePropName="checked">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Allow Staff Discounts</strong></div>
            <Text type="secondary">Enable cashiers to apply manual discounts</Text>
          </div>
          <Switch />
        </div>
      </Form.Item>
      
      <Form.Item name="max_discount_percent" label="Maximum Discount Allowed (%)">
        <InputNumber min={0} max={100} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="auto_print_receipt" valuePropName="checked">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Auto-Print Receipts</strong></div>
            <Text type="secondary">Automatically print receipt after successful payment</Text>
          </div>
          <Switch />
        </div>
      </Form.Item>
    </div>
  );

  const inventoryTab = (
    <div className="fade-in">
      <Title level={4}>Inventory Settings</Title>
      <Text type="secondary">Manage inventory alerts and behaviors.</Text>
      <Divider />
      <Form.Item name="low_stock_threshold" label="Low Stock Alert Threshold">
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 24 }}>
        The system will alert you when a product's stock falls below this number.
      </Text>
    </div>
  );

  const securityTab = (
    <div className="fade-in">
      <Title level={4}>Security Policies</Title>
      <Text type="secondary">Configure session and authentication policies.</Text>
      <Divider />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <Form.Item name="session_timeout" label="Session Timeout (Minutes)" rules={[{ required: true }]}>
          <InputNumber min={10} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="max_login_attempts" label="Max Login Attempts" rules={[{ required: true }]}>
          <InputNumber min={1} max={10} style={{ width: '100%' }} />
        </Form.Item>
      </div>
      <Form.Item name="lockout_duration" label="Account Lockout Duration (Minutes)" rules={[{ required: true }]}>
        <InputNumber min={1} style={{ width: '50%' }} />
      </Form.Item>
    </div>
  );

  const paymentTab = (
    <div className="fade-in">
      <Title level={4}>Payment Settings</Title>
      <Text type="secondary">Configure accepted payment methods and integrations.</Text>
      <Divider />
      
      <Title level={5}>Accepted Payment Methods</Title>
      <Form.Item name="accept_cash" valuePropName="checked">
        <Switch checkedChildren="Cash Enabled" unCheckedChildren="Cash Disabled" />
      </Form.Item>
      <Form.Item name="accept_card" valuePropName="checked">
        <Switch checkedChildren="Card/POS Enabled" unCheckedChildren="Card/POS Disabled" />
      </Form.Item>
      <Form.Item name="accept_mobile" valuePropName="checked">
        <Switch checkedChildren="Mobile Wallets Enabled" unCheckedChildren="Mobile Wallets Disabled" />
      </Form.Item>

      <Divider dashed />
      <Title level={5}>Mobile Wallet Integration (Myanmar)</Title>
      
      <Form.Item name="kpay_merchant_id" label="KBZPay Merchant ID" extra="Required for generating KBZPay dynamic QR codes">
        <Input placeholder="Enter KBZPay Merchant ID" />
      </Form.Item>
      <Form.Item name="wavepay_merchant_id" label="WavePay Merchant ID" extra="Required for generating WavePay dynamic QR codes">
        <Input placeholder="Enter WavePay Merchant ID" />
      </Form.Item>
    </div>
  );

  const hardwareTab = (
    <div className="fade-in">
      <Title level={4}>{t('settings.hardware')}</Title>
      <Text type="secondary">Configure receipt printers, barcode scanners, and cash drawers.</Text>
      <Divider />
      
      <Form.Item name="printer_type" label="Printer Connection Type">
        <Select>
          <Select.Option value="usb">USB Printer</Select.Option>
          <Select.Option value="network">Network (LAN/WiFi)</Select.Option>
          <Select.Option value="bluetooth">Bluetooth</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.printer_type !== currentValues.printer_type}
      >
        {({ getFieldValue }) => {
          const type = getFieldValue('printer_type');
          if (type === 'network') {
            return (
              <Form.Item name="printer_ip" label="Receipt Printer IP Address">
                <Input placeholder="e.g. 192.168.1.100" />
              </Form.Item>
            );
          }
          if (type === 'usb') {
            return (
              <Form.Item name="usb_printer_name" label="USB Printer Name" extra="Make sure the printer is installed in your OS">
                <Input placeholder="e.g. POS-80C" />
              </Form.Item>
            );
          }
          return null;
        }}
      </Form.Item>
      
      <Form.Item name="paper_size" label="Receipt Paper Size">
        <Form.Item name="paper_size" noStyle>
          <Input placeholder="80mm or 58mm" style={{ width: 200 }} />
        </Form.Item>
      </Form.Item>

      <Form.Item name="cash_drawer_auto_open" valuePropName="checked">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Auto-open Cash Drawer</strong></div>
            <Text type="secondary">Send kick signal to drawer on cash payment</Text>
          </div>
          <Switch />
        </div>
      </Form.Item>
    </div>
  );

  const localizationTab = (
    <div className="fade-in">
      <Title level={4}>Appearance & Localization</Title>
      <Text type="secondary">Set your preferred language, timezone, and date formats.</Text>
      <Divider />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <Form.Item name="language" label={t('settings.language')}>
          <Select 
            options={[
              { value: 'en', label: 'English' },
              { value: 'mm', label: 'မြန်မာ (Myanmar)' },
              { value: 'th', label: 'ภาษาไทย (Thailand)' }
            ]} 
            onChange={(val) => i18n.changeLanguage(val)}
          />
        </Form.Item>
        <Form.Item name="timezone" label="Timezone">
          <Input placeholder="e.g. Asia/Yangon" />
        </Form.Item>
      </div>
      
      <Form.Item name="date_format" label="Date Format">
        <Input placeholder="DD/MM/YYYY" style={{ width: 200 }} />
      </Form.Item>
    </div>
  );

  const notificationsTab = (
    <div className="fade-in">
      <Title level={4}>Notifications & Alerts</Title>
      <Text type="secondary">Configure email and SMS alerts for important events.</Text>
      <Divider />
      
      <Form.Item name="alert_email" label="Alert Email Address">
        <Input placeholder="admin@example.com" />
      </Form.Item>
      
      <Divider dashed />
      
      <Form.Item name="daily_report_email" valuePropName="checked">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Daily Sales Report</strong></div>
            <Text type="secondary">Receive Z-Report and sales summary at end of day</Text>
          </div>
          <Switch />
        </div>
      </Form.Item>

      <Form.Item name="low_stock_email" valuePropName="checked">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Low Stock Alerts</strong></div>
            <Text type="secondary">Receive email when items drop below threshold</Text>
          </div>
          <Switch />
        </div>
      </Form.Item>

      <Form.Item name="large_transaction_alert" valuePropName="checked">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Large Transaction Alerts</strong></div>
            <Text type="secondary">Notify manager for unusually large orders</Text>
          </div>
          <Switch />
        </div>
      </Form.Item>
    </div>
  );

  const receiptConfigTab = (
    <div className="fade-in" style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <Title level={4}>{t('settings.receipt_customization')}</Title>
        <Text type="secondary">{t('settings.receipt_customization_subtitle')}</Text>
        <Divider />
        
        <Form.Item name="header_text" label={t('settings.receipt_header')}>
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item name="footer_text" label={t('settings.receipt_footer_msg')}>
          <TextArea rows={2} />
        </Form.Item>

        <Divider dashed />
        <Title level={5}>{t('settings.receipt_elements')}</Title>

        <Form.Item name="show_logo" valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{t('settings.show_logo')}</Text>
            <Switch />
          </div>
        </Form.Item>
        <Form.Item name="show_cashier" valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{t('settings.show_cashier')}</Text>
            <Switch />
          </div>
        </Form.Item>
        <Form.Item name="show_customer" valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{t('settings.show_customer')}</Text>
            <Switch />
          </div>
        </Form.Item>
        <Form.Item name="show_barcode" valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{t('settings.show_barcode')}</Text>
            <Switch />
          </div>
        </Form.Item>
      </div>

      {/* Receipt Preview */}
      <div style={{ width: 320, padding: '24px 0' }}>
        <Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>{t('settings.live_preview')}</Title>
        <div style={{
          background: '#fff',
          padding: 24,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          borderRadius: 2,
          fontFamily: '"Courier New", Courier, monospace',
          color: '#000',
          fontSize: 13,
          lineHeight: 1.6
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {show_logo && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', border: '2px solid #000' }}>
                  <Package size={24} color="#000" />
                </div>
              </div>
            )}
            <div style={{ whiteSpace: 'pre-line', fontWeight: 'bold' }}>{header_text}</div>
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', marginBottom: 12, paddingBottom: 12 }}>
            <div>Date: 28-05-2026 14:30</div>
            <div>Receipt: #INV-0001</div>
            {show_cashier && <div>Cashier: John Doe</div>}
            {show_customer && <div>Customer: Walk-in</div>}
          </div>

          <div style={{ borderBottom: '1px dashed #000', marginBottom: 12, paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Coffee Beans (250g) x 2</span>
              <span>$24.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Filter Paper x 1</span>
              <span>$5.50</span>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', marginBottom: 12, paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>$29.50</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (10%)</span>
              <span>$2.95</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16, marginTop: 8 }}>
              <span>TOTAL</span>
              <span>$32.45</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', whiteSpace: 'pre-line', marginTop: 24, fontSize: 12 }}>
            {footer_text}
          </div>

          {show_barcode && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ 
                height: 50, 
                width: '100%', 
                background: 'repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 6px, #fff 6px, #fff 7px, #000 7px, #000 10px, #fff 10px, #fff 12px)' 
              }}></div>
              <div style={{ fontSize: 11, marginTop: 4 }}>INV-0001</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const tabItems = [
    {
      key: '1',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} />
          {t('settings.business_name')}
        </span>
      ),
      children: businessTab,
    },
    {
      key: '2',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} />
          POS & Checkout
        </span>
      ),
      children: posTab,
    },
    {
      key: '3',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={16} />
          Inventory
        </span>
      ),
      children: inventoryTab,
    },
    {
      key: '4',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} />
          Security
        </span>
      ),
      children: securityTab,
    },
    {
      key: '5',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={16} />
          Payments
        </span>
      ),
      children: paymentTab,
    },
    {
      key: '6',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Printer size={16} />
          Hardware
        </span>
      ),
      children: hardwareTab,
    },
    {
      key: '7',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} />
          {t('settings.language')}
        </span>
      ),
      children: localizationTab,
    },
    {
      key: '8',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} />
          Notifications
        </span>
      ),
      children: notificationsTab,
    },
    {
      key: '9',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Receipt size={16} />
          {t('settings.receipt_maker')}
        </span>
      ),
      children: receiptConfigTab,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('settings.title')}</Title>
          <Text type="secondary">{t('settings.subtitle')}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<Save size={16} />} 
          onClick={() => form.submit()}
          loading={loading}
        >
          {t('common.save')}
        </Button>
      </div>

      <Card bordered={false} style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          initialValues={initialValues}
        >
          <Tabs 
            defaultActiveKey="1" 
            items={tabItems} 
            tabPosition="left"
            style={{ minHeight: 400 }}
          />
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
