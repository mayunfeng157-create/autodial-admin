const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 配置上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `recording-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/amr', 'audio/3gpp', 'audio/wav'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(m4a|mp3|wav|amr|3gpp)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
});

// 上传录音
router.post('/recording', authenticateToken, upload.single('file'), (req, res) => {
    const userId = req.user.id;
    const { phone, taskId, duration } = req.body;

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const contactId = null; // 可以后续关联

    db.run(`
        INSERT INTO recordings (contact_id, task_id, user_id, phone, duration, file_path, file_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [contactId, taskId || 0, userId, phone || 'unknown', duration || 0, req.file.path, fileUrl], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to save recording' });
        }

        // 同时更新对应联系人的录音URL
        if (phone && taskId) {
            db.run(`UPDATE contacts SET recording_url = ? WHERE phone = ? AND task_id = ?`,
                [fileUrl, phone, taskId]);
        }

        res.json({
            success: true,
            message: 'Recording uploaded',
            data: {
                id: this.lastID,
                url: fileUrl,
                filename: req.file.filename,
                size: req.file.size
            }
        });
    });
});

// 获取录音列表
router.get('/recordings', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { taskId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM recordings WHERE user_id = ?`;
    let countSql = `SELECT COUNT(*) as total FROM recordings WHERE user_id = ?`;
    let params = [userId];
    let countParams = [userId];

    if (taskId) {
        sql += ` AND task_id = ?`;
        countSql += ` AND task_id = ?`;
        params.push(taskId);
        countParams.push(taskId);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
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
                    recordings: rows,
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

// 获取单个录音
router.get('/recordings/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const recordingId = req.params.id;

    db.get(`SELECT * FROM recordings WHERE id = ? AND user_id = ?`, [recordingId, userId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Recording not found' });
        }

        res.json({ success: true, data: row });
    });
});

// 删除录音
router.delete('/recordings/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const recordingId = req.params.id;

    db.get(`SELECT * FROM recordings WHERE id = ? AND user_id = ?`, [recordingId, userId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ success: false, message: 'Recording not found' });
        }

        // 删除文件
        const fs = require('fs');
        if (fs.existsSync(row.file_path)) {
            fs.unlinkSync(row.file_path);
        }

        db.run(`DELETE FROM recordings WHERE id = ?`, [recordingId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to delete' });
            }
            res.json({ success: true, message: 'Recording deleted' });
        });
    });
});

module.exports = router;
