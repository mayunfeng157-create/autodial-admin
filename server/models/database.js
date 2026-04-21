const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'autodial.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('📦 Database connected:', dbPath);
    }
});

function initDatabase() {
    // 用户表
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 任务表
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            total_count INTEGER DEFAULT 0,
            connected_count INTEGER DEFAULT 0,
            no_answer_count INTEGER DEFAULT 0,
            skipped_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // 联系人表
    db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            call_time DATETIME,
            duration INTEGER DEFAULT 0,
            recording_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // 录音表
    db.run(`
        CREATE TABLE IF NOT EXISTS recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER NOT NULL,
            task_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            phone TEXT NOT NULL,
            duration INTEGER DEFAULT 0,
            file_path TEXT NOT NULL,
            file_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contact_id) REFERENCES contacts(id),
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // 创建索引
    db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_task ON contacts(task_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_recordings_user ON recordings(user_id)`);

    // 创建默认管理员账号
    const bcrypt = require('bcryptjs');
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    
    db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO users (id, username, password) VALUES (?, ?, ?)`, 
                ['admin', 'admin', defaultPassword], (err) => {
                if (err) {
                    console.log('Default admin user already exists or error:', err.message);
                } else {
                    console.log('✅ Default admin user created: admin / admin123');
                }
            });
        }
    });

    console.log('✅ Database tables initialized');
}

module.exports = { db, initDatabase };
