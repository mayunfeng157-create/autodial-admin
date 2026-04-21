import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { contacts, tasks, stats } from '../utils/api';

function Contacts() {
  const location = useLocation();
  const [contactsList, setContactsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
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

  useEffect(() => {
    loadContacts();
  }, [selectedTask, statusFilter, page]);

  const loadTasks = async () => {
    try {
      const res = await tasks.list();
      if (res.success) {
        setTasksList(res.data);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (selectedTask) params.taskId = selectedTask;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await contacts.list(params);
      if (res.success) {
        setContactsList(res.data.contacts);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await stats.export(selectedTask || undefined);
      const blob = new Blob([res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${Date.now()}.csv`;
      a.click();
    } catch (err) {
      alert('导出失败');
    }
  };

  const getStatusClass = (status) => {
    const map = {
      'CONNECTED': 'connected',
      'NO_ANSWER': 'no-answer',
      'PENDING': 'pending',
      'SKIPPED': 'skipped'
    };
    return map[status] || '';
  };

  const getStatusText = (status) => {
    const map = {
      'CONNECTED': '已接通',
      'NO_ANSWER': '未接通',
      'PENDING': '未拨打',
      'SKIPPED': '已跳过'
    };
    return map[status] || status;
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
          <h1>客户列表</h1>
          <button className="btn btn-primary" onClick={handleExport}>📥 导出CSV</button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select 
              value={selectedTask} 
              onChange={(e) => { setSelectedTask(e.target.value); setPage(1); }}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="">全部任务</option>
              {tasksList.map(task => (
                <option key={task.id} value={task.id}>{task.name}</option>
              ))}
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="">全部状态</option>
              <option value="CONNECTED">已接通</option>
              <option value="NO_ANSWER">未接通</option>
              <option value="PENDING">未拨打</option>
              <option value="SKIPPED">已跳过</option>
            </select>

            <input
              type="text"
              placeholder="搜索姓名或电话..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ flex: 1, padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd' }}
            />

            <button className="btn btn-secondary" onClick={loadContacts}>🔍 搜索</button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>电话</th>
                  <th>状态</th>
                  <th>拨打时间</th>
                  <th>通话时长</th>
                  <th>录音</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                      加载中...
                    </td>
                  </tr>
                ) : contactsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  contactsList.map(contact => (
                    <tr key={contact.id}>
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td>
                        <span className={`status ${getStatusClass(contact.status)}`}>
                          {getStatusText(contact.status)}
                        </span>
                      </td>
                      <td>{contact.call_time ? new Date(contact.call_time).toLocaleString() : '-'}</td>
                      <td>{contact.duration ? `${contact.duration}秒` : '-'}</td>
                      <td>
                        {contact.recording_url && (
                          <a href={contact.recording_url} target="_blank" rel="noopener noreferrer">
                            ▶️ 播放
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </button>
              <span style={{ padding: '8px 16px' }}>
                第 {page} / {pagination.totalPages} 页
              </span>
              <button 
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Contacts;
