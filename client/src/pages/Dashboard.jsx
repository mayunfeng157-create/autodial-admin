import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { stats } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard({ onLogout }) {
  const location = useLocation();
  const [statsData, setStatsData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [overviewRes, dailyRes] = await Promise.all([
        stats.overview(),
        stats.daily(30)
      ]);
      
      if (overviewRes.success) {
        setStatsData(overviewRes.data);
      }
      if (dailyRes.success) {
        setDailyData(dailyRes.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { path: '/', label: '📊 数据概览', icon: '📊' },
    { path: '/contacts', label: '📋 客户列表', icon: '📋' },
    { path: '/recordings', label: '🎵 通话录音', icon: '🎵' },
    { path: '/tasks', label: '📞 任务管理', icon: '📞' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>自动拨号后台</h2>
        <nav>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              <span>{item.icon}</span>
              <span style={{ marginLeft: '8px' }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <div className="header">
          <h1>数据概览</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#666' }}>欢迎, {user.username}</span>
            <button className="btn btn-secondary" onClick={onLogout}>退出</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>加载中...</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="label">总任务数</div>
                <div className="value">{statsData?.totalTasks || 0}</div>
              </div>
              <div className="stat-card">
                <div className="label">总号码数</div>
                <div className="value">{statsData?.totalContacts || 0}</div>
              </div>
              <div className="stat-card connected">
                <div className="label">已接通</div>
                <div className="value">{statsData?.totalConnected || 0}</div>
              </div>
              <div className="stat-card no-answer">
                <div className="label">未接通</div>
                <div className="value">{statsData?.totalNoAnswer || 0}</div>
              </div>
              <div className="stat-card">
                <div className="label">总接通率</div>
                <div className="value" style={{ color: '#2196F3' }}>
                  {statsData?.connectRate || 0}%
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>📈 近30天拨打趋势</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="connected" 
                      stroke="#4CAF50" 
                      name="已接通"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="no_answer" 
                      stroke="#FF9800" 
                      name="未接通"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
