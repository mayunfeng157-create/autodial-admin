const express = require('express');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取总体统计
router.get('/overview', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get(`
        SELECT 
            COUNT(DISTINCT t.id) as total_tasks,
            SUM(t.total_count) as total_contacts,
            SUM(t.connected_count) as total_connected,
            SUM(t.no_answer_count) as total_no_answer,
            SUM(t.skipped_count) as total_skipped
        FROM tasks t WHERE t.user_id = ?
    `, [userId], (err, stats) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        const total = stats.total_connected + stats.total_no_answer;
        const connectRate = total > 0 ? ((stats.total_connected / total) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                totalTasks: stats.total_tasks || 0,
                totalContacts: stats.total_contacts || 0,
                totalConnected: stats.total_connected || 0,
                totalNoAnswer: stats.total_no_answer || 0,
                totalSkipped: stats.total_skipped || 0,
                connectRate: parseFloat(connectRate)
            }
        });
    });
});

// 获取每日统计
router.get('/daily', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    db.all(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
            SUM(CASE WHEN status = 'NO_ANSWER' THEN 1 ELSE 0 END) as no_answer
        FROM contacts 
        WHERE user_id = ? AND created_at >= DATE('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// 获取任务详情统计
router.get('/task/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const taskId = req.params.id;

    db.get(`SELECT * FROM tasks WHERE id = ? AND user_id = ?`, [taskId, userId], (err, task) => {
        if (err || !task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        db.all(`
            SELECT status, COUNT(*) as count 
            FROM contacts 
            WHERE task_id = ? 
            GROUP BY status
        `, [taskId], (err, statusStats) => {
            const stats = {};
            statusStats.forEach(s => { stats[s.status] = s.count; });

            res.json({
                success: true,
                data: {
                    ...task,
                    statusStats: stats
                }
            });
        });
    });
});

// 导出数据
router.get('/export', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { taskId } = req.query;

    let sql = `
        SELECT c.*, t.name as task_name 
        FROM contacts c 
        LEFT JOIN tasks t ON c.task_id = t.id 
        WHERE c.user_id = ?
    `;
    let params = [userId];

    if (taskId) {
        sql += ` AND c.task_id = ?`;
        params.push(taskId);
    }

    sql += ` ORDER BY c.task_id, c.id`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        // 生成CSV
        const headers = ['任务', '姓名', '电话', '状态', '拨打时间', '通话时长', '录音'];
        const csv = [
            headers.join(','),
            ...rows.map(r => [
                `"${r.task_name || ''}"`,
                `"${r.name}"`,
                `"${r.phone}"`,
                `"${r.status}"`,
                `"${r.call_time || ''}"`,
                r.duration || 0,
                `"${r.recording_url || ''}"`
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=contacts-${Date.now()}.csv`);
        res.send(csv);
    });
});

module.exports = router;
