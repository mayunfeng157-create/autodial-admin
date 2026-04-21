import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { recordings } from '../utils/api';

function Recordings() {
  const location = useLocation();
  const [recordingsList, setRecordingsList] = useState([]);
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
    loadRecordings();
  }, [page]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const res = await recordings.list({ page, limit: 20 });
      if (res.success) {
        setRecordingsList(res.data.recordings);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条录音？')) return;
    try {
      const res = await recordings.delete(id);
      if (res.success) {
        loadRecordings();
      }
    } catch (err) {
      alert('删除失败');
    }
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
          <h1>通话录音</h1>
        </div>

        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>电话号码</th>
                  <th>任务ID</th>
                  <th>时长</th>
                  <th>上传时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                      加载中...
                    </td>
                  </tr>
                ) : recordingsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      暂无录音
                    </td>
                  </tr>
                ) : (
                  recordingsList.map((rec, index) => (
                    <tr key={rec.id}>
                      <td>{(page - 1) * 20 + index + 1}</td>
                      <td>{rec.phone}</td>
                      <td>{rec.task_id}</td>
                      <td>{rec.duration ? `${rec.duration}秒` : '-'}</td>
                      <td>{new Date(rec.created_at).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a href={rec.file_url} target="_blank" rel="noopener noreferrer">
                            ▶️ 播放
                          </a>
                          <button 
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleDelete(rec.id)}
                          >
                            删除
                          </button>
                        </div>
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

export default Recordings;
