const express = require('express');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 同步联系人
router.post('/contacts', authenticateToken, (req, res) => {
    const { contacts, taskId } = req.body;
    const userId = req.user.id;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ success: false, message: 'No contacts provided' });
    }

    // 确保任务存在
    if (taskId) {
        db.get(`SELECT * FROM tasks WHERE id = ? AND user_id = ?`, [taskId, userId], (err, task) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!task) {
                // 创建新任务
                db.run(`INSERT INTO tasks (id, user_id, name) VALUES (?, ?, ?)`, 
                    [taskId, userId, `Task ${taskId}`], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Failed to create task' });
                    }
                    insertContacts(contacts, taskId, userId, res);
                });
            } else {
                insertContacts(contacts, taskId, userId, res);
            }
        });
    } else {
        // 创建新任务
        const newTaskId = Date.now();
        db.run(`INSERT INTO tasks (id, user_id, name) VALUES (?, ?, ?)`, 
            [newTaskId, userId, `Task ${newTaskId}`], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to create task' });
            }
            insertContacts(contacts, newTaskId, userId, res);
        });
    }
});

function insertContacts(contacts, taskId, userId, res) {
    const stmt = db.prepare(`
        INSERT INTO contacts (task_id, user_id, name, phone, status, call_time, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    contacts.forEach((contact, index) => {
        stmt.run(taskId, userId, contact.name || contact.phone, contact.phone, 
            contact.status || 'PENDING', contact.callTime, contact.duration || 0, (err) => {
            if (!err) inserted++;
            if (index === contacts.length - 1) {
                stmt.finalize();
                
                // 更新任务统计
                updateTaskStats(taskId, userId);
                
                res.json({
                    success: true,
                    message: `Synced ${inserted} contacts`,
                    data: { taskId, inserted }
                });
            }
        });
    });
}

function updateTaskStats(taskId, userId) {
    db.get(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
            SUM(CASE WHEN status = 'NO_ANSWER' THEN 1 ELSE 0 END) as no_answer,
            SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped
        FROM contacts WHERE task_id = ? AND user_id = ?
    `, [taskId, userId], (err, row) => {
        if (row) {
            db.run(`UPDATE tasks SET 
                total_count = ?, connected_count = ?, no_answer_count = ?, skipped_count = ?
                WHERE id = ? AND user_id = ?`,
                [row.total, row.connected, row.no_answer, row.skipped, taskId, userId]);
        }
    });
}

// 获取联系人列表
router.get('/contacts', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { taskId, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM contacts WHERE user_id = ?`;
    let countSql = `SELECT COUNT(*) as total FROM contacts WHERE user_id = ?`;
    let params = [userId];
    let countParams = [userId];

    if (taskId) {
        sql += ` AND task_id = ?`;
        countSql += ` AND task_id = ?`;
        params.push(taskId);
        countParams.push(taskId);
    }

    if (status) {
        sql += ` AND status = ?`;
        countSql += ` AND status = ?`;
        params.push(status);
        countParams.push(status);
    }

    if (search) {
        sql += ` AND (name LIKE ? OR phone LIKE ?)`;
        countSql += ` AND (name LIKE ? OR phone LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
        countParams.push(searchPattern, searchPattern);
    }

    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.get(countSql, countParams, (err, countResult) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            res.json({
                success: true,
                data: {
                    contacts: rows,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: countResult.total,
                        totalPages: Math.ceil(countResult.total / limit)
                    }
                }
            });
        });
    });
});

// 获取任务列表
router.get('/tasks', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// 获取单个任务
router.get('/tasks/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const taskId = req.params.id;

    db.get(`SELECT * FROM tasks WHERE id = ? AND user_id = ?`, [taskId, userId], (err, task) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // 获取联系人统计
        db.all(`SELECT status, COUNT(*) as count FROM contacts WHERE task_id = ? GROUP BY status`, 
            [taskId], (err, stats) => {
            const statusStats = {};
            stats.forEach(s => { statusStats[s.status] = s.count; });

            res.json({
                success: true,
                data: { ...task, statusStats }
            });
        });
    });
});

// 删除任务
router.delete('/tasks/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const taskId = req.params.id;

    db.run(`DELETE FROM contacts WHERE task_id = ? AND user_id = ?`, [taskId, userId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete contacts' });
        }

        db.run(`DELETE FROM tasks WHERE id = ? AND user_id = ?`, [taskId, userId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to delete task' });
            }

            res.json({ success: true, message: 'Task deleted' });
        });
    });
});

module.exports = router;
