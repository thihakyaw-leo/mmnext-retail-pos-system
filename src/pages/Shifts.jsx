import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Table, Button, Tag, Modal, Form, 
  InputNumber, Row, Col, Statistic, Select, Divider, Input, message
} from 'antd';
import { Clock, PlayCircle, StopCircle, DollarSign, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Shifts = () => {
  const { t } = useTranslation();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isOpenShiftModalVisible, setIsOpenShiftModalVisible] = useState(false);
  const [isCloseShiftModalVisible, setIsCloseShiftModalVisible] = useState(false);
  const [isCashMovementModalVisible, setIsCashMovementModalVisible] = useState(false);
  
  const [openForm] = Form.useForm();
  const [closeForm] = Form.useForm();
  const [moveForm] = Form.useForm();

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/shifts');
      setShifts(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      message.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const activeShift = shifts.find(s => s.status === 'Open');

  const handleOpenShift = async (values) => {
    try {
      setLoading(true);
      await axiosClient.post('/shifts/open', {
        register_name: values.register_name,
        starting_cash: values.starting_cash,
        notes: values.notes
      });
      message.success('Shift opened successfully');
      setIsOpenShiftModalVisible(false);
      openForm.resetFields();
      fetchShifts();
    } catch (error) {
      console.error('Failed to open shift:', error);
      message.error(error.response?.data?.error || 'Failed to open shift');
    } finally {
      setLoading(false);
    }
  };

  const handleCashMovement = async (values) => {
    if (!activeShift) return;
    try {
      setLoading(true);
      await axiosClient.post(`/shifts/${activeShift.id}/movement`, {
        type: values.movement_type,
        amount: values.amount,
        reason: values.reason
      });
      message.success('Cash movement recorded');
      setIsCashMovementModalVisible(false);
      moveForm.resetFields();
      fetchShifts();
    } catch (error) {
      console.error('Failed to record movement:', error);
      message.error(error.response?.data?.error || 'Failed to record movement');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (values) => {
    if (!activeShift) return;
    try {
      setLoading(true);
      const res = await axiosClient.post(`/shifts/${activeShift.id}/close`, {
        actual_ending_cash: values.actual_counted_cash,
        notes: values.closing_notes
      });
      
      message.success('Shift closed successfully. Z-Report generated.');
      setIsCloseShiftModalVisible(false);
      closeForm.resetFields();
      fetchShifts();
      
      // Optionally display the Z-Report here using res.data
      const data = res.data;
      Modal.success({
        title: 'Z-Report Summary',
        content: (
          <div style={{ marginTop: 16 }}>
            <p>Cash Sales: ${Number(data.cashSales).toFixed(2)}</p>
            <p>Expected Cash: ${Number(data.expectedCash).toFixed(2)}</p>
            <p>Actual Cash: ${Number(data.actualEndingCash).toFixed(2)}</p>
            <p style={{ color: data.discrepancy === 0 ? 'green' : 'red' }}>
              Discrepancy: ${Number(data.discrepancy).toFixed(2)}
            </p>
          </div>
        )
      });

    } catch (error) {
      console.error('Failed to close shift:', error);
      message.error(error.response?.data?.error || 'Failed to close shift');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Shift ID', dataIndex: 'id', key: 'id', render: (text) => <Text type="secondary" style={{fontSize: 12}}>{text}</Text> },
    { title: t('payroll.staff_member'), dataIndex: 'cashier', key: 'cashier' },
    { title: 'Register', dataIndex: 'register_name', key: 'register_name' },
    { title: t('shifts.shift_start'), dataIndex: 'start_time', key: 'start_time', render: (text) => <Text type="secondary">{dayjs(text).format('MMM D, HH:mm')}</Text> },
    { title: t('shifts.shift_end'), dataIndex: 'end_time', key: 'end_time', render: (text) => text ? <Text type="secondary">{dayjs(text).format('MMM D, HH:mm')}</Text> : '-' },
    { title: 'Start Cash', dataIndex: 'starting_cash', key: 'starting_cash', render: (val) => `$${Number(val||0).toFixed(2)}` },
    { title: 'End Cash', dataIndex: 'actual_ending_cash', key: 'actual_ending_cash', render: (val) => val != null ? `$${Number(val).toFixed(2)}` : '-' },
    { 
      title: 'Discrepancy', 
      dataIndex: 'discrepancy', 
      key: 'discrepancy',
      render: (val) => {
        if (val == null) return '-';
        const num = Number(val);
        const color = num < 0 ? '#ef4444' : num > 0 ? '#f59e0b' : '#10b981';
        return <Text style={{ color, fontWeight: 500 }}>${num.toFixed(2)}</Text>;
      }
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'Open' ? 'blue' : 'default'}>{status}</Tag>
    }
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('shifts.title')}</Title>
          <Text type="secondary">{t('shifts.subtitle')}</Text>
        </div>
        <div>
          {activeShift ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="default" onClick={() => setIsCashMovementModalVisible(true)} size="large">
                Cash In / Out
              </Button>
              <Button type="primary" danger icon={<StopCircle size={16} />} onClick={() => setIsCloseShiftModalVisible(true)} size="large">
                Close Shift
              </Button>
            </div>
          ) : (
            <Button type="primary" icon={<PlayCircle size={16} />} onClick={() => setIsOpenShiftModalVisible(true)} size="large">
              Open New Shift
            </Button>
          )}
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Current Status" value={activeShift ? 'Shift Open' : 'Register Closed'} valueStyle={{ color: activeShift ? '#3b82f6' : '#64748b' }} prefix={<Clock size={20} />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Active Cashier" value={activeShift ? activeShift.cashier : 'None'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Starting Float" value={activeShift ? activeShift.starting_cash : 0} prefix="$" precision={2} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} title="Shift History">
        <Table columns={columns} dataSource={shifts} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} />
      </Card>

      {/* Open Shift Modal */}
      <Modal title="Open Register Shift" open={isOpenShiftModalVisible} onCancel={() => setIsOpenShiftModalVisible(false)} footer={null}>
        <Form form={openForm} layout="vertical" style={{ marginTop: 24 }} onFinish={handleOpenShift} initialValues={{ starting_cash: 200, register_name: 'Register 1 (Main)' }}>
          <Form.Item name="register_name" label="Select Register" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Register 1 (Main)">Register 1 (Main)</Select.Option>
              <Select.Option value="Register 2 (Tablet)">Register 2 (Tablet)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="starting_cash" label="Starting Cash (Float)" rules={[{ required: true }]} tooltip="Amount of cash in the drawer at start">
            <InputNumber prefix="$" style={{ width: '100%' }} size="large" min={0} />
          </Form.Item>
          <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsOpenShiftModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Open Shift</Button>
          </div>
        </Form>
      </Modal>

      {/* Close Shift Modal */}
      <Modal title="Close Register (Z-Report)" open={isCloseShiftModalVisible} onCancel={() => setIsCloseShiftModalVisible(false)} footer={null}>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <Text type="secondary">System will calculate expected cash based on starting float, cash sales, and pay-ins/outs.</Text>
        </div>
        <Form form={closeForm} layout="vertical" onFinish={handleCloseShift}>
          <Form.Item name="actual_counted_cash" label="Actual Counted Cash" rules={[{ required: true }]} tooltip="Count the physical cash in the drawer">
            <InputNumber prefix="$" style={{ width: '100%' }} size="large" placeholder="Enter counted amount" min={0} />
          </Form.Item>
          <Form.Item name="closing_notes" label="Closing Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsCloseShiftModalVisible(false)}>Cancel</Button>
            <Button type="primary" danger htmlType="submit" loading={loading}>Close Shift & Generate Z-Report</Button>
          </div>
        </Form>
      </Modal>

      {/* Cash Movement Modal */}
      <Modal title="Cash Movement (Pay In / Out)" open={isCashMovementModalVisible} onCancel={() => setIsCashMovementModalVisible(false)} footer={null}>
        <Form form={moveForm} layout="vertical" style={{ marginTop: 24 }} onFinish={handleCashMovement} initialValues={{ movement_type: 'pay_in' }}>
          <Form.Item name="movement_type" label="Movement Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="pay_in">Pay In (Add Cash to Drawer)</Select.Option>
              <Select.Option value="pay_out">Pay Out (Remove Cash from Drawer)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber prefix="$" style={{ width: '100%' }} size="large" placeholder="0.00" min={0.01} />
          </Form.Item>
          <Form.Item name="reason" label="Reason / Note" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="e.g. Bought supplies, Added extra change" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setIsCashMovementModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Record Cash Movement</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Shifts;
