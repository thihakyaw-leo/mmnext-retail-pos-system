import React from 'react';
import { Row, Col, Card, Typography, Table, Badge, Progress, Space, Statistic, Tag, Skeleton, Alert, Select } from 'antd';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Package,
  AlertTriangle,
  Clock,
  BarChart2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [dashData, setDashData] = React.useState(null);
  const [realtimeData, setRealtimeData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState('30d');

  const fetchDashboard = React.useCallback(async (selectedPeriod = '30d') => {
    setLoading(true);
    try {
      const [dashRes, realtimeRes] = await Promise.all([
        axiosClient.get(`/analytics/dashboard?period=${selectedPeriod}`),
        axiosClient.get('/analytics/realtime')
      ]);
      // axiosClient interceptor returns response.data directly
      setDashData(dashRes);
      setRealtimeData(realtimeRes);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard(period);
  }, [period, fetchDashboard]);

  // Format helpers
  const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtMoney = (num) => `$${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const metrics = dashData?.metrics || {};
  const trends = dashData?.trends?.daily || [];
  const topProducts = dashData?.topProducts || [];
  const categorySales = dashData?.categorySales || [];
  const paymentBreakdown = dashData?.paymentBreakdown || [];
  const inventoryAlerts = dashData?.inventoryAlerts || [];
  const recentOrders = realtimeData?.recentOrders || [];
  const lowStockAlerts = realtimeData?.lowStockAlerts || [];
  const todayStats = realtimeData?.today || {};

  const revenueGrowth = metrics.revenue_growth || 0;
  const orderGrowth = metrics.order_growth || 0;

  const StatCard = ({ title, value, prefix, icon: Icon, iconColor, trend, trendValue, loading: cardLoading }) => (
    <Card bordered={false} className="hover-lift" style={{ height: '100%' }}>
      {cardLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
            <Title level={3} style={{ margin: '8px 0 4px' }}>{prefix}{value}</Title>
            {trendValue !== undefined && (
              <Space size={4}>
                {trend === 'up'
                  ? <ArrowUpRight size={14} color="#10b981" />
                  : <ArrowDownRight size={14} color="#ef4444" />
                }
                <Text style={{ color: trend === 'up' ? '#10b981' : '#ef4444', fontSize: 13 }}>
                  {Math.abs(trendValue)}% vs last period
                </Text>
              </Space>
            )}
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `${iconColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={22} color={iconColor} />
          </div>
        </div>
      )}
    </Card>
  );

  const orderColumns = [
    {
      title: t('orders.order_id'),
      key: 'id',
      render: (_, record) => (
        <Text strong style={{ color: '#60a5fa', fontSize: 13 }}>#{record.id}</Text>
      )
    },
    {
      title: t('customers.customer'),
      dataIndex: 'customer_name',
      key: 'customer',
      render: (name) => <Text style={{ fontSize: 13 }}>{name || 'Walk-in'}</Text>
    },
    {
      title: t('orders.total'),
      dataIndex: 'total_amount',
      key: 'total',
      render: (amt) => <Text strong style={{ fontSize: 13 }}>{fmtMoney(amt)}</Text>
    },
    {
      title: t('dashboard.date'),
      dataIndex: 'created_at',
      key: 'time',
      render: (time) => <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(time).fromNow()}</Text>
    }
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('dashboard.title')}</Title>
          <Text type="secondary">{t('dashboard.subtitle')}</Text>
        </div>
        <Space>
          <Text type="secondary" style={{ fontSize: 13 }}>Period:</Text>
          <Select value={period} onChange={(v) => setPeriod(v)} style={{ width: 120 }}>
            <Select.Option value="1d">Today</Select.Option>
            <Select.Option value="7d">Last 7 Days</Select.Option>
            <Select.Option value="30d">Last 30 Days</Select.Option>
            <Select.Option value="90d">Last 90 Days</Select.Option>
            <Select.Option value="1y">This Year</Select.Option>
          </Select>
        </Space>
      </div>

      {/* Stat Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('dashboard.revenue')}
            value={fmtMoney(metrics.total_revenue)}
            icon={DollarSign}
            iconColor="#10b981"
            trend={revenueGrowth >= 0 ? 'up' : 'down'}
            trendValue={revenueGrowth}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('dashboard.orders')}
            value={fmt(metrics.total_orders)}
            icon={ShoppingCart}
            iconColor="#3b82f6"
            trend={orderGrowth >= 0 ? 'up' : 'down'}
            trendValue={orderGrowth}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Unique Customers"
            value={fmt(metrics.unique_customers)}
            icon={Users}
            iconColor="#8b5cf6"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Avg. Order Value"
            value={fmtMoney(metrics.avg_order_value)}
            icon={TrendingUp}
            iconColor="#f59e0b"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Today Quick Stats */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.08))' }}>
            <Row gutter={[24, 16]}>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Orders Today</Text>
                  <Title level={3} style={{ margin: '4px 0', color: '#3b82f6' }}>{loading ? '-' : fmt(todayStats.orders_today)}</Title>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Revenue Today</Text>
                  <Title level={3} style={{ margin: '4px 0', color: '#10b981' }}>{loading ? '-' : fmtMoney(todayStats.revenue_today)}</Title>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Customers Today</Text>
                  <Title level={3} style={{ margin: '4px 0', color: '#8b5cf6' }}>{loading ? '-' : fmt(todayStats.customers_today)}</Title>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Active Staff</Text>
                  <Title level={3} style={{ margin: '4px 0', color: '#f59e0b' }}>{loading ? '-' : fmt(todayStats.active_staff_today)}</Title>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            title={<Space><BarChart2 size={16} color="#3b82f6" />{t('dashboard.sales_overview')}</Space>}
            style={{ height: '100%' }}
          >
            {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends.map(d => ({ name: dayjs(d.date || d.period).format('MMM D'), total: d.revenue || 0, orders: d.orders || 0 }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value, name) => [name === 'total' ? fmtMoney(value) : value, name === 'total' ? 'Revenue' : 'Orders']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} title="Sales by Category" style={{ height: '100%' }}>
            {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : (
              categorySales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <BarChart2 size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <br />
                  <Text type="secondary">No sales data yet</Text>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
                  {categorySales.map((item, index) => (
                    <div key={index}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Space size={8}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                          <Text style={{ fontSize: 13 }}>{item.category_name}</Text>
                        </Space>
                        <Text strong style={{ fontSize: 13 }}>{item.percentage}%</Text>
                      </div>
                      <Progress
                        percent={item.percentage}
                        showInfo={false}
                        strokeColor={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        trailColor="rgba(255,255,255,0.06)"
                        strokeWidth={6}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>{fmtMoney(item.revenue)} · {item.quantity_sold} units</Text>
                    </div>
                  ))}
                </div>
              )
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Orders + Alerts */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card bordered={false} title={<Space><ShoppingCart size={16} color="#3b82f6" />{t('dashboard.recent_orders')}</Space>} bodyStyle={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 24 }}><Skeleton active /></div>
            ) : (
              <Table
                dataSource={recentOrders}
                pagination={false}
                columns={orderColumns}
                rowKey="id"
                size="small"
                locale={{ emptyText: 'No recent orders' }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} title={<Space><AlertTriangle size={16} color="#f59e0b" />System Alerts</Space>} style={{ height: '100%' }}>
            {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Real-time WebSocket alert */}
                {lastMessage && lastMessage.type === 'low_stock_alert' && (
                  <div className="fade-in" style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                    <Text strong style={{ color: '#ef4444', display: 'block', fontSize: 13, marginBottom: 2 }}>🔴 Low Stock Alert</Text>
                    <Text style={{ fontSize: 12 }}>{lastMessage.data?.product?.name} is running low (Stock: {lastMessage.data?.product?.currentStock})</Text>
                  </div>
                )}
                {/* DB low stock alerts */}
                {lowStockAlerts.length > 0 ? lowStockAlerts.map((item, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                      <Tag color="orange" style={{ margin: 0 }}>Low Stock</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Stock: {item.current_stock} / Min: {item.low_stock_threshold}</Text>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <ShieldCheck size={44} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: 12 }} />
                    <br />
                    <Text type="secondary">All systems operational.</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>No alerts at this time</Text>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Top Products */}
      {!loading && topProducts.length > 0 && (
        <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card bordered={false} title={<Space><TrendingUp size={16} color="#10b981" />{t('dashboard.top_products')}</Space>}>
              <Table
                dataSource={topProducts}
                rowKey="sku"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'Product',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name, record) => (
                      <div>
                        <Text strong>{name}</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{record.sku}</Text>
                      </div>
                    )
                  },
                  {
                    title: 'Category',
                    dataIndex: 'category_name',
                    key: 'category',
                    render: (cat) => <Tag>{cat || 'Uncategorized'}</Tag>
                  },
                  {
                    title: 'Sold',
                    dataIndex: 'quantity_sold',
                    key: 'qty',
                    render: (qty) => <Text strong>{fmt(qty)}</Text>
                  },
                  {
                    title: 'Revenue',
                    dataIndex: 'revenue',
                    key: 'revenue',
                    render: (rev) => <Text strong style={{ color: '#10b981' }}>{fmtMoney(rev)}</Text>
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;
