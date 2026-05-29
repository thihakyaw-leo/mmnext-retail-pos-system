import React, { useState } from 'react';
import { Typography, Card, Row, Col, DatePicker, Select, Button, Table, Space } from 'antd';
import { Download, TrendingUp, DollarSign, ShoppingBag, CreditCard } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Mock Data for Charts
const salesData = [
  { name: 'Mon', revenue: 4000, orders: 24, profit: 1200 },
  { name: 'Tue', revenue: 3000, orders: 18, profit: 900 },
  { name: 'Wed', revenue: 2000, orders: 15, profit: 600 },
  { name: 'Thu', revenue: 2780, orders: 20, profit: 800 },
  { name: 'Fri', revenue: 1890, orders: 12, profit: 500 },
  { name: 'Sat', revenue: 2390, orders: 16, profit: 700 },
  { name: 'Sun', revenue: 3490, orders: 22, profit: 1000 },
];

const categoryData = [
  { name: 'Laptops', value: 400, color: '#3b82f6' },
  { name: 'Phones', value: 300, color: '#10b981' },
  { name: 'Tablets', value: 300, color: '#f59e0b' },
  { name: 'Accessories', value: 200, color: '#8b5cf6' },
];

const paymentData = [
  { name: 'Cash', value: 45 },
  { name: 'Card', value: 40 },
  { name: 'Mobile', value: 15 },
];

const topProducts = [
  { key: '1', product: 'MacBook Pro 14"', category: 'Laptops', sold: 45, revenue: 89955 },
  { key: '2', product: 'iPhone 15 Pro', category: 'Phones', sold: 120, revenue: 119880 },
  { key: '3', product: 'AirPods Pro', category: 'Accessories', sold: 200, revenue: 49800 },
  { key: '4', product: 'iPad Air', category: 'Tablets', sold: 85, revenue: 50915 },
  { key: '5', product: 'USB-C Cable', category: 'Accessories', sold: 350, revenue: 6650 },
];

const Reports = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('7d');

  const StatCard = ({ title, value, icon, trend, prefix = '' }) => (
    <Card bordered={false} bodyStyle={{ padding: 24 }} className="hover-lift">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
          <Title level={2} style={{ margin: '8px 0 0', color: 'var(--text-primary)' }}>
            {prefix}{value}
          </Title>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={14} color="#10b981" />
            <Text style={{ color: '#10b981', fontSize: 12 }}>{trend}% from last period</Text>
          </div>
        </div>
        <div style={{ 
          padding: 12, 
          background: 'rgba(59, 130, 246, 0.1)', 
          borderRadius: 12,
          color: '#3b82f6'
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('reports.title')}</Title>
          <Text type="secondary">{t('reports.subtitle')}</Text>
        </div>
        
        <Space>
          <Select 
            value={dateRange} 
            onChange={setDateRange}
            style={{ width: 150 }}
            options={[
              { value: 'today', label: 'Today' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: 'this_month', label: 'This Month' },
              { value: 'custom', label: 'Custom Range' },
            ]}
          />
          {dateRange === 'custom' && <RangePicker />}
          <Button icon={<Download size={16} />}>Export PDF</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={t('reports.total_revenue')} value="124,500" prefix="$" icon={<DollarSign size={24} />} trend="12.5" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={t('reports.gross_profit')} value="38,200" prefix="$" icon={<TrendingUp size={24} />} trend="8.2" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={t('reports.total_orders')} value="1,452" icon={<ShoppingBag size={24} />} trend="5.4" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={t('reports.avg_order_value')} value="85.74" prefix="$" icon={<CreditCard size={24} />} trend="2.1" />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {/* Sales Trend Chart */}
        <Col xs={24} lg={16}>
          <Card bordered={false} title="Revenue & Profit Trend" style={{ height: '100%' }}>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Revenue by Category Pie Chart */}
        <Col xs={24} lg={8}>
          <Card bordered={false} title="Revenue by Category" style={{ height: '100%' }}>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Top Products Table */}
        <Col xs={24} lg={12}>
          <Card bordered={false} title={t('reports.top_products')}>
            <Table 
              dataSource={topProducts} 
              pagination={false}
              columns={[
                { title: t('products.product_name'), dataIndex: 'product', key: 'product' },
                { title: t('products.category'), dataIndex: 'category', key: 'category', render: (text) => <Text type="secondary">{text}</Text> },
                { title: 'Qty Sold', dataIndex: 'sold', key: 'sold', align: 'right' },
                { title: t('reports.total_revenue'), dataIndex: 'revenue', key: 'revenue', align: 'right', render: (val) => <Text strong>${val.toLocaleString()}</Text> },
              ]}
            />
          </Card>
        </Col>
        
        {/* Payment Methods Bar Chart */}
        <Col xs={24} lg={12}>
          <Card bordered={false} title="Payment Methods Breakdown">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="var(--text-secondary)" tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    formatter={(value) => [`${value}%`, 'Usage']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
