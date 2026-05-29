import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Space, Button, Input, Select, Modal, Form, Avatar, InputNumber, Tabs, message, Tooltip, Statistic, Row, Col } from 'antd';
import { Search, Filter, Plus, Edit, Trash2, Users, Mail, Shield, Clock, PlayCircle, StopCircle, CheckCircle, FileText } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;



const Staff = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingStaff, setEditingStaff] = useState(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('directory');

  // Attendance states
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [clockAction, setClockAction] = useState(null); // 'in' or 'out'
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axiosClient.get('/staff');
        const formattedStaff = (response.data || []).map((usr, index) => ({
          ...usr,
          key: usr.id || index,
          name: usr.full_name || usr.name || `${usr.first_name || ''} ${usr.last_name || ''}`.trim(),
        }));
        setStaffList(formattedStaff);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        setStaffList([]);
      } finally {
        setLoading(false);
      }
    };
    const fetchAttendance = async () => {
      try {
        setAttendanceLoading(true);
        const [logsRes, statusRes] = await Promise.all([
          axiosClient.get('/attendance/history'),
          axiosClient.get('/attendance/status')
        ]);
        setAttendanceLogs(logsRes.data.data || []);
        setActiveStatus(statusRes.data.data || null);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setAttendanceLoading(false);
      }
    };
    
    if (activeTab === 'directory') {
      fetchStaff();
    } else {
      fetchAttendance();
    }
  }, [activeTab]);

  const getRoleTag = (role) => {
    const roleStr = (role || '').toLowerCase();
    switch (roleStr) {
      case 'admin': return <Tag color="purple">Admin</Tag>;
      case 'manager': return <Tag color="blue">Manager</Tag>;
      case 'cashier': return <Tag color="cyan">Cashier</Tag>;
      default: return <Tag color="default">{role || 'Staff'}</Tag>;
    }
  };

  const columns = [
    {
      title: t('staff.employee'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar style={{ backgroundColor: '#3b82f6' }}>{text ? text.charAt(0).toUpperCase() : 'S'}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{text || 'Unknown User'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: t('staff.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role) => getRoleTag(role),
    },
    {
      title: 'Store / Location',
      dataIndex: 'store',
      key: 'store',
      render: (store, record) => <Text>{store || record.organization_id || 'Main Branch'}</Text>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={String(status).toLowerCase() === 'active' ? 'success' : 'error'} style={{ borderRadius: 4 }}>
          {(status || 'Unknown').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Active',
      dataIndex: 'lastActive',
      key: 'lastActive',
      render: (text, record) => <Text type="secondary">{text || (record.last_login ? new Date(record.last_login).toLocaleString() : 'Never')}</Text>,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<Edit size={16} color="#3b82f6" />} onClick={() => handleEditStaff(record)} />
          <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDeleteStaff(record.id)} />
        </Space>
      ),
    },
  ];

  const attendanceColumns = [
    { title: 'Log ID', dataIndex: 'id', key: 'id', render: (text) => <Text type="secondary" style={{fontSize: 12}}>{text}</Text> },
    { title: 'Date', dataIndex: 'clock_in_time', key: 'date', render: (text) => dayjs(text).format('MMM D, YYYY') },
    { title: 'Staff', dataIndex: 'staff_name', key: 'staff_name' },
    { title: 'Clock In', dataIndex: 'clock_in_time', key: 'clock_in_time', render: (text) => <Tag color="blue" icon={<PlayCircle size={12} />}>{dayjs(text).format('hh:mm A')}</Tag> },
    { title: 'Clock Out', dataIndex: 'clock_out_time', key: 'clock_out_time', render: (text) => text ? <Tag color="orange" icon={<StopCircle size={12} />}>{dayjs(text).format('hh:mm A')}</Tag> : <Tag color="processing">Working</Tag> },
    { title: 'Total Hrs', dataIndex: 'total_hours', key: 'total_hours', render: (val) => val ? <Text strong>{Number(val).toFixed(2)}h</Text> : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag color="green">{val}</Tag> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (val) => val ? <Tooltip title={val}><Text ellipsis style={{maxWidth: 150}}>{val}</Text></Tooltip> : '-' }
  ];

  const handleClockAction = async () => {
    try {
      setAttendanceLoading(true);
      if (clockAction === 'in') {
        await axiosClient.post('/attendance/clock-in', { notes: notesText });
        message.success('Clocked in successfully');
      } else {
        await axiosClient.post('/attendance/clock-out', { notes: notesText });
        message.success('Clocked out successfully');
      }
      setNotesModalVisible(false);
      setNotesText('');
      
      const [logsRes, statusRes] = await Promise.all([
        axiosClient.get('/attendance/history'),
        axiosClient.get('/attendance/status')
      ]);
      setAttendanceLogs(logsRes.data.data || []);
      setActiveStatus(statusRes.data.data || null);
    } catch (error) {
      console.error('Clock action error:', error);
      message.error(error.response?.data?.error || 'Failed to process action');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openClockModal = (action) => {
    setClockAction(action);
    setNotesModalVisible(true);
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditStaff = (record) => {
    setEditingStaff(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      role: record.role,
      store: record.store,
      salary: record.salary,
      password: ''
    });
    setIsModalVisible(true);
  };

  const handleDeleteStaff = (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this staff member?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axiosClient.delete(`/staff/${id}`);
          setStaffList(staffList.filter(s => s.id !== id));
        } catch (error) {
          console.error('Failed to delete staff', error);
        }
      }
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        setLoading(true);
        const nameParts = values.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        const payload = {
          first_name: firstName,
          last_name: lastName,
          email: values.email,
          role: values.role,
          password: values.password,
          salary: values.salary,
        };
        
        if (values.store && values.store !== 'all') {
          // You might need to look up store_id, or omit if not implemented fully
          // payload.store_id = values.store;
        }
        
        if (!payload.password) delete payload.password; // Don't send empty password

        if (editingStaff) {
          await axiosClient.put(`/staff/${editingStaff.id}`, payload);
        } else {
          await axiosClient.post('/staff', payload);
        }
        
        // Refresh staff list
        const response = await axiosClient.get('/staff');
        const formattedStaff = (response.data || []).map((usr, index) => ({
          ...usr,
          key: usr.id || index,
          name: usr.full_name || usr.name || `${usr.first_name || ''} ${usr.last_name || ''}`.trim(),
        }));
        setStaffList(formattedStaff);
        
        setIsModalVisible(false);
        form.resetFields();
        setEditingStaff(null);
      } catch (error) {
        console.error('Failed to create staff:', error);
        setIsModalVisible(false);
        form.resetFields();
        setEditingStaff(null);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingStaff(null);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Users size={28} color="#3b82f6" />
            {t('staff.title')}
          </Title>
          <Text type="secondary">{t('staff.subtitle')}</Text>
        </div>
        {user?.role === 'admin' ? (
          <Button 
            type="primary" 
            icon={<Plus size={16} />}
            style={{ background: '#3b82f6', borderRadius: 8, height: 40 }}
            onClick={handleAddStaff}
            className="hover-lift"
          >
            {t('staff.add_staff')}
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
              key: 'directory',
              label: <span><Users size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Staff Directory</span>,
              children: (
                <>
                  <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Input 
                      placeholder={t('staff.search')} 
                      prefix={<Search size={16} color="var(--text-secondary)" />}
                      style={{ width: 320, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    <Select defaultValue="all" style={{ width: 160 }} dropdownStyle={{ background: '#1e293b' }}>
                      <Select.Option value="all">All Roles</Select.Option>
                      <Select.Option value="admin">Admins</Select.Option>
                      <Select.Option value="manager">Managers</Select.Option>
                      <Select.Option value="cashier">Cashiers</Select.Option>
                      <Select.Option value="staff">Staff</Select.Option>
                    </Select>
                    <Button icon={<Filter size={16} />} style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)' }}>
                      More Filters
                    </Button>
                  </div>
                  <Table 
                    columns={columns} 
                    dataSource={staffList}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              )
            },
            {
              key: 'attendance',
              label: <span><Clock size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Attendance & Time Tracking</span>,
              children: (
                <div style={{ padding: '24px 0' }}>
                  <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                      <Card bordered={false} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Statistic 
                          title="Current Status" 
                          value={activeStatus ? 'Clocked In' : 'Clocked Out'} 
                          valueStyle={{ color: activeStatus ? '#10b981' : '#f59e0b' }} 
                          prefix={activeStatus ? <CheckCircle size={20} /> : <Clock size={20} />} 
                        />
                        {activeStatus && <Text type="secondary" style={{display: 'block', marginTop: 8}}>Since: {dayjs(activeStatus.clock_in_time).format('hh:mm A')}</Text>}
                      </Card>
                    </Col>
                    <Col span={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                      {!activeStatus ? (
                        <Button type="primary" size="large" icon={<PlayCircle size={18} />} onClick={() => openClockModal('in')} style={{ height: 60, padding: '0 32px', fontSize: 16, borderRadius: 12, background: '#10b981', borderColor: '#10b981' }}>
                          Clock In
                        </Button>
                      ) : (
                        <Button type="primary" danger size="large" icon={<StopCircle size={18} />} onClick={() => openClockModal('out')} style={{ height: 60, padding: '0 32px', fontSize: 16, borderRadius: 12 }}>
                          Clock Out
                        </Button>
                      )}
                    </Col>
                  </Row>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>Attendance Logs</Title>
                    <Button icon={<FileText size={16} />}>Export Timesheet</Button>
                  </div>
                  <Table 
                    columns={attendanceColumns} 
                    dataSource={attendanceLogs}
                    loading={attendanceLoading}
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editingStaff ? t('staff.edit_title', 'Edit Staff') : t('staff.add_title')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={t('staff.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ style: { background: '#3b82f6' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="name" label={t('staff.employee')} rules={[{ required: true }]}>
            <Input placeholder="Enter full name" prefix={<Users size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />} />
          </Form.Item>
          <Form.Item name="email" label={t('staff.email')} rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Enter email address" prefix={<Mail size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />} />
          </Form.Item>
          <Form.Item name="role" label={t('staff.role')} rules={[{ required: true }]}>
            <Select placeholder="Select a role">
              <Select.Option value="admin">Administrator</Select.Option>
              <Select.Option value="manager">Store Manager</Select.Option>
              <Select.Option value="cashier">Cashier</Select.Option>
              <Select.Option value="staff">General Staff</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="store" label="Assigned Store">
            <Select placeholder="Select store (leave blank for all)">
              <Select.Option value="main">Main Branch</Select.Option>
              <Select.Option value="downtown">Downtown Branch</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="salary" label={t('staff.base_salary')} rules={[{ required: true }]}>
            <InputNumber prefix="$" style={{ width: '100%' }} placeholder="e.g. 1500" />
          </Form.Item>
          <Form.Item name="password" label="Temporary Password" rules={[{ required: !editingStaff }]}>
            <Input.Password placeholder={editingStaff ? "Leave blank to keep unchanged" : "Enter a secure password"} prefix={<Shield size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={clockAction === 'in' ? "Clock In" : "Clock Out"}
        open={notesModalVisible}
        onOk={handleClockAction}
        onCancel={() => setNotesModalVisible(false)}
        okText={clockAction === 'in' ? "Confirm Clock In" : "Confirm Clock Out"}
        okButtonProps={{ danger: clockAction === 'out', style: clockAction === 'in' ? { background: '#10b981', borderColor: '#10b981' } : {} }}
      >
        <div style={{ marginTop: 20 }}>
          <Text style={{ marginBottom: 8, display: 'block' }}>Add optional notes for this entry:</Text>
          <Input.TextArea 
            rows={4} 
            value={notesText} 
            onChange={e => setNotesText(e.target.value)}
            placeholder="e.g., Arrived late due to traffic, Leaving early for appointment..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default Staff;
