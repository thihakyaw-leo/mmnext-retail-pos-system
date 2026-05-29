import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Tabs, Table, Button, Input, Tag, Dropdown, 
  Modal, Form, Select, Row, Col, Statistic, Avatar, Space, message, DatePicker
} from 'antd';
import { Search, Plus, MoreVertical, Wallet, CalendarDays, FileText, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Payroll = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('staff');
  
  const [staffList, setStaffList] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);

  // default to current month
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  
  const [isGenerateRunModalOpen, setIsGenerateRunModalOpen] = useState(false);
  const [generateForm] = Form.useForm();

  const fetchStaffSalaries = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/payroll/calculate', {
        params: {
          startDate: dateRange[0].toISOString(),
          endDate: dateRange[1].toISOString()
        }
      });
      setStaffList(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff salaries:', error);
      message.error('Failed to fetch salaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollRuns = async () => {
    try {
      setRunsLoading(true);
      const res = await axiosClient.get('/payroll/runs');
      setPayrollRuns(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payroll runs:', error);
      message.error('Failed to fetch payroll runs');
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffSalaries();
    } else {
      fetchPayrollRuns();
    }
  }, [activeTab, dateRange]);

  const handleGenerateRun = async (values) => {
    try {
      setLoading(true);
      await axiosClient.post('/payroll/runs', {
        startDate: values.period[0].toISOString(),
        endDate: values.period[1].toISOString(),
        notes: values.notes
      });
      message.success('Payroll Run generated successfully');
      setIsGenerateRunModalOpen(false);
      generateForm.resetFields();
      setActiveTab('runs');
      fetchPayrollRuns();
    } catch (error) {
      console.error('Failed to generate run:', error);
      message.error(error.response?.data?.error || 'Failed to generate payroll run');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (runId) => {
    try {
      setRunsLoading(true);
      await axiosClient.put(`/payroll/runs/${runId}/pay`);
      message.success('Payroll marked as paid');
      fetchPayrollRuns();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      message.error('Failed to update payroll run');
    } finally {
      setRunsLoading(false);
    }
  };

  // --- Staff Salaries Logic ---
  const staffColumns = [
    {
      title: t('payroll.staff_member'),
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar style={{ backgroundColor: '#3b82f6' }}>{record.name?.charAt(0) || 'U'}</Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.role || 'Staff'}</Text>
          </div>
        </div>
      )
    },
    { 
      title: 'Days Worked', 
      dataIndex: 'days_worked', 
      key: 'days_worked', 
      render: (val, record) => <Text>{val || 0} / {record.period_days}</Text> 
    },
    { 
      title: 'Base Pay (Pro-rated)', 
      dataIndex: 'pro_rated_salary', 
      key: 'pro_rated_salary', 
      render: (val) => <Text>${Number(val || 0).toFixed(2)}</Text> 
    },
    { 
      title: 'Sales Commission', 
      dataIndex: 'earned_commission', 
      key: 'earned_commission', 
      render: (val) => <Text style={{ color: '#10b981' }}>+${Number(val || 0).toFixed(2)}</Text> 
    },
    { 
      title: t('payroll.net_pay'), 
      dataIndex: 'total_payout', 
      key: 'total_payout', 
      render: (val) => <Text strong>${Number(val || 0).toFixed(2)}</Text> 
    }
  ];

  // --- Payroll Runs Logic ---
  const runColumns = [
    { 
      title: 'Run ID', 
      dataIndex: 'id', 
      key: 'id', 
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text> 
    },
    { 
      title: 'Period Start', 
      dataIndex: 'period_start', 
      key: 'period_start',
      render: (text) => dayjs(text).format('MMM D, YYYY')
    },
    { 
      title: 'Period End', 
      dataIndex: 'period_end', 
      key: 'period_end',
      render: (text) => dayjs(text).format('MMM D, YYYY')
    },
    { title: 'Employees', dataIndex: 'total_employees', key: 'total_employees' },
    { 
      title: 'Total Amount', 
      dataIndex: 'total_amount', 
      key: 'total_amount', 
      render: (val) => <Text strong>${Number(val || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</Text> 
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'Paid' ? 'green' : 'orange'}>{status.toUpperCase()}</Tag>
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: [
          { 
            key: 'pay', 
            icon: <CheckCircle size={16} color="#10b981" />, 
            label: <span style={{ color: '#10b981' }}>Mark as Paid</span>, 
            disabled: record.status === 'Paid',
            onClick: () => markAsPaid(record.id)
          },
        ]}} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreVertical size={16} />} />
        </Dropdown>
      )
    }
  ];

  const totalPayrollEstimate = staffList.reduce((sum, staff) => sum + (staff.total_payout || 0), 0);
  const pendingRuns = payrollRuns.filter(r => r.status === 'Draft').length;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('payroll.title')}</Title>
          <Text type="secondary">{t('payroll.subtitle')}</Text>
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Total Payroll Estimate (Selected Period)" value={totalPayrollEstimate} prefix="$" precision={2} valueStyle={{ color: '#3b82f6' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Pending Payroll Runs" value={pendingRuns} valueStyle={{ color: '#f59e0b' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Active Employees in Payroll" value={staffList.length} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: '0 24px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { 
              key: 'staff', 
              label: <span><Wallet size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Live Salary Calculator</span>, 
              children: (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <RangePicker 
                      value={dateRange} 
                      onChange={(dates) => {
                        if(dates) setDateRange(dates);
                      }} 
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => {
                        generateForm.setFieldsValue({ period: dateRange });
                        setIsGenerateRunModalOpen(true);
                      }}>
                      Generate Payroll Run
                    </Button>
                  </div>
                  <Table columns={staffColumns} dataSource={staffList} rowKey="staff_id" pagination={{ pageSize: 10 }} loading={loading} />
                </div>
              ) 
            },
            { 
              key: 'runs', 
              label: <span><FileText size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Payroll Runs History</span>, 
              children: (
                <div style={{ padding: '24px 0' }}>
                  <Table columns={runColumns} dataSource={payrollRuns} rowKey="id" pagination={{ pageSize: 10 }} loading={runsLoading} />
                </div>
              ) 
            },
          ]}
        />
      </Card>

      {/* Generate Payroll Run Modal */}
      <Modal title="Generate Payroll Run" open={isGenerateRunModalOpen} onCancel={() => setIsGenerateRunModalOpen(false)} footer={null}>
        <Form form={generateForm} layout="vertical" style={{ marginTop: 24 }} onFinish={handleGenerateRun}>
          <Form.Item name="period" label="Pay Period" rules={[{ required: true }]}>
             <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes for this payroll run" />
          </Form.Item>
          
          <div style={{ padding: '12px 16px', background: 'rgba(255,152,0,0.1)', borderRadius: 8, marginBottom: 24 }}>
            <Text type="warning">Note: Generating a run will lock in the sales commission for the selected period and save it to the database.</Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsGenerateRunModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Generate Draft Run</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Payroll;
