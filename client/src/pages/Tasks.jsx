import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tasks } from '../utils/api';

function Tasks() {
  const location = useLocation();
  const [tasksList, setTasksList] = useState([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { path: '/', label: '📊 数据概览', icon: '📊' },
    { path: '/contacts', label: '📋 客户列表', icon: '📋' },
    { path: '/recordings', label: '🎵 通话录音', icon: '🎵' },
    { path: '/tasks', label: '📞 任务管理', icon: '📞' },
  ];

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await tasks.list();
      if (res.success) {
        setTasksList(res.data);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此任务及所有关联数据？')) return;
    try {
      const res = await tasks.delete(id);
      if (res.success) {
        loadTasks();
      }
    } catch (err) {
      alert('删除失败');
    }
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString() : '-';
  };

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
          <h1>任务管理</h1>
        </div>

        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>任务ID</th>
                  <th>任务名称</th>
                  <th>创建时间</th>
                  <th>完成时间</th>
                  <th>总数</th>
                  <th>已接通</th>
                  <th>未接通</th>
                  <th>跳过</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                      加载中...
                    </td>
                  </tr>
                ) : tasksList.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      暂无任务
                    </td>
                  </tr>
                ) : (
                  tasksList.map(task => {
                    const rate = (task.connected_count + task.no_answer_count) > 0
                      ? ((task.connected_count / (task.connected_count + task.no_answer_count)) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <tr key={task.id}>
                        <td>{task.id}</td>
                        <td>{task.name}</td>
                        <td>{formatDate(task.created_at)}</td>
                        <td>{formatDate(task.completed_at)}</td>
                        <td>{task.total_count}</td>
                        <td style={{ color: '#4CAF50' }}>{task.connected_count}</td>
                        <td style={{ color: '#FF9800' }}>{task.no_answer_count}</td>
                        <td style={{ color: '#999' }}>{task.skipped_count}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link 
                              to={`/contacts?taskId=${task.id}`}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px', textDecoration: 'none' }}
                            >
                              查看详情
                            </Link>
                            <button 
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleDelete(task.id)}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Tasks;
