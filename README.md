# 自动拨号系统 - 管理后台

## 项目概述

本项目包含两个部分：
1. **Android App** (`autodial-app/`) - 自动拨号客户端
2. **管理后台** (`autodial-admin/`) - Web管理界面 + API服务

## 快速开始

### 1. 管理后台部署

```bash
cd autodial-admin/server
npm install
npm start
```

访问 http://localhost:3000

默认账号: `admin` / `admin123`

### 2. React前端开发

```bash
cd autodial-admin/client
npm install
npm run dev
```

### 3. Android App

在Android Studio中打开 `autodial-app` 文件夹，编译安装。

## 功能特性

### App端
- 剪贴板导入号码
- 双卡自动拨号
- 随机间隔控制
- 悬浮窗显示
- 通话状态追踪
- 录音自动上传

### 后台管理
- 客户数据管理
- 通话录音管理
- 数据统计报表
- CSV导出

## 技术栈

- **后端**: Node.js + Express + SQLite
- **前端**: React + Vite + Recharts
- **App**: Kotlin + MVVM + Room

## 目录结构

```
autodial-admin/
├── server/           # 后端服务
│   ├── routes/       # API路由
│   ├── models/       # 数据模型
│   ├── middleware/   # 中间件
│   └── uploads/      # 录音文件
├── client/           # React前端
│   ├── src/
│   │   ├── pages/    # 页面组件
│   │   ├── components/
│   │   └── utils/    # 工具函数
│   └── package.json
└── README.md
```

## API接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/sync/contacts | 同步联系人 |
| GET | /api/sync/contacts | 获取联系人列表 |
| POST | /api/upload/recording | 上传录音 |
| GET | /api/stats/overview | 获取统计数据 |

## 部署说明

### Railway.app 部署

1. 创建新项目，选择Node.js
2. 上传代码或连接GitHub
3. 设置启动命令: `cd server && npm start`
4. 绑定自定义域名（可选）

### 数据库

使用SQLite，无需额外配置。生产环境建议迁移到PostgreSQL。

---

**版本**: 1.0.0  
**更新**: 2026-04-21
