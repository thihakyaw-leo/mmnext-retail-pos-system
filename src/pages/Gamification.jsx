import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Table, Progress, Avatar, Tabs, List, Tag } from 'antd';
import { Trophy, Star, Target, Zap, Medal } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const mockLeaderboardData = [
    { key: '1', rank: 1, name: 'Alice Brown', store: 'Main Branch', points: 4500, badges: 12 },
    { key: '2', rank: 2, name: 'John Doe', store: 'Downtown', points: 3850, badges: 9 },
    { key: '3', rank: 3, name: 'Sarah Connor', store: 'Main Branch', points: 3100, badges: 7 },
    { key: '4', rank: 4, name: 'Bruce Wayne', store: 'Uptown', points: 2900, badges: 6 },
    { key: '5', rank: 5, name: 'Diana Prince', store: 'Downtown', points: 2150, badges: 5 },
  ];

const Gamification = () => {
  const { t } = useTranslation();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axiosClient.get('/gamification/leaderboard');
        // Add a rank based on index if the backend doesn't provide it
        const rankedData = (response.leaderboard || []).map((user, index) => ({
          ...user,
          key: user.user_id || index,
          rank: user.rank || index + 1,
        }));
        setLeaderboardData(rankedData.length > 0 ? rankedData : mockLeaderboardData);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setLeaderboardData(mockLeaderboardData);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const recentAchievements = [
    { title: 'Speed Demon', description: 'Processed 50 transactions in an hour', icon: <Zap size={24} color="#f59e0b" />, time: '2 hours ago', user: 'Alice Brown' },
    { title: 'Customer Favorite', description: 'Received 5-star rating 10 times this week', icon: <Star size={24} color="#10b981" />, time: '5 hours ago', user: 'John Doe' },
    { title: 'Sales Target Met', description: 'Exceeded weekly sales goal by 20%', icon: <Target size={24} color="#3b82f6" />, time: '1 day ago', user: 'Sarah Connor' },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('gamification.title')}</Title>
        <Text type="secondary">{t('gamification.subtitle')}</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Leaderboard */}
        <Col xs={24} lg={16}>
          <Card 
            bordered={false} 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy color="#f59e0b" size={20} />
                <span>{t('gamification.leaderboard')}</span>
              </div>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Tabs 
              defaultActiveKey="1" 
              style={{ padding: '0 24px' }}
              items={[
                {
                  key: '1',
                  label: 'This Week',
                  children: (
                    <Table 
                      dataSource={leaderboardData} 
                      pagination={false}
                      loading={loading}
                      columns={[
                        { 
                          title: 'Rank', 
                          dataIndex: 'rank',
                          render: (rank) => (
                            <div style={{ 
                              width: 28, height: 28, borderRadius: '50%', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: rank === 1 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                          rank === 2 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
                                          rank === 3 ? 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' : 'rgba(255,255,255,0.05)',
                              color: rank <= 3 ? '#fff' : 'var(--text-secondary)',
                              fontWeight: rank <= 3 ? 'bold' : 'normal'
                            }}>
                              {rank}
                            </div>
                          )
                        },
                        { 
                          title: t('payroll.staff_member'), 
                          key: 'name',
                          render: (_, record) => {
                            const name = record.name || record.first_name || 'Staff Member';
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar style={{ backgroundColor: '#3b82f6' }}>{name.charAt(0)}</Avatar>
                                <Text strong>{name}</Text>
                              </div>
                            );
                          }
                        },
                        { title: t('menu.stores'), dataIndex: 'organization_id', render: (store) => <Tag>{store || 'Main'}</Tag> },
                        { 
                          title: t('gamification.points'), 
                          dataIndex: 'total_points',
                          render: (points, record) => {
                            const pts = points !== undefined ? points : record.points;
                            return <Text strong style={{ color: '#10b981' }}>{(pts || 0).toLocaleString()} pts</Text>;
                          }
                        },
                        { title: 'Level', dataIndex: 'level', render: (level) => level || 1 }
                      ]}
                    />
                  )
                },
                { key: '2', label: 'This Month', children: <div>Monthly Leaderboard (Empty)</div> },
                { key: '3', label: 'All Time', children: <div>All Time Leaderboard (Empty)</div> }
              ]}
            />
          </Card>
        </Col>

        {/* Recent Activity & Stats */}
        <Col xs={24} lg={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Quick Stats */}
            <Card bordered={false}>
              <div style={{ textAlign: 'center' }}>
                <Medal size={48} color="#3b82f6" style={{ marginBottom: 16 }} />
                <Title level={3} style={{ margin: 0 }}>42</Title>
                <Text type="secondary">Badges awarded this week</Text>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Engagement Goal</Text>
                  <Text strong>85%</Text>
                </div>
                <Progress percent={85} strokeColor={{ '0%': '#60a5fa', '100%': '#3b82f6' }} trailColor="rgba(255,255,255,0.05)" showInfo={false} />
              </div>
            </Card>

            {/* Recent Unlocks */}
            <Card bordered={false} title={t('gamification.recent_achievements')}>
              <List
                itemLayout="horizontal"
                dataSource={recentAchievements}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>}
                      title={<Text strong>{item.title}</Text>}
                      description={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#60a5fa' }}>Unlocked by {item.user}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Gamification;
