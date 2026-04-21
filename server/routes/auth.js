const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                userId: user.id,
                username: user.username,
                token: token
            }
        });
    });
});

// 注册（仅管理员可用）
router.post('/register', authenticateToken, (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = 'user_' + Date.now();

    db.run(`INSERT INTO users (id, username, password) VALUES (?, ?, ?)`, 
        [userId, username, hashedPassword], (err) => {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }
            return res.status(500).json({ success: false, message: 'Registration failed' });
        }

        res.json({
            success: true,
            message: 'User registered successfully',
            data: { userId, username }
        });
    });
});

// 获取当前用户信息
router.get('/me', authenticateToken, (