# 🚀 Kanban Pro — 全栈团队协作看板

一个功能完整的企业级团队协作看板工具，支持拖拽操作、实时协作、数据统计等功能。

## ✨ 功能一览

### 📋 核心功能
- **看板拖拽** — 卡片自由拖拽，跨列移动，流畅动画
- **用户认证** — JWT 注册/登录，安全可靠
- **项目看板** — 多项目看板管理，每个看板独立设置
- **任务卡片** — 标题、描述、优先级、截止日期、标签、颜色标记
- **评论讨论** — 卡片内评论互动，实时显示
- **文件附件** — 支持上传图片、文档等附件

### 🚀 高级功能
- **实时协作** — WebSocket (Socket.IO) 多人实时同步
- **权限管理** — 四层角色：拥有者/管理员/成员/访客
- **数据仪表盘** — ECharts 图表（饼图、柱状图、雷达图）
- **日历视图** — 按月查看所有任务截止日期
- **全局搜索** — 跨看板全文搜索
- **模板市场** — Scrum、Bug追踪、OKR 等预设模板
- **深色模式** — 一键切换亮色/暗色主题
- **响应式设计** — 适配桌面和平板

## 🛠 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18, TypeScript, Vite, Tailwind CSS | 现代化组件开发 |
| 拖拽 | @dnd-kit | 高性能拖拽库 |
| 图表 | ECharts | 数据可视化 |
| 状态管理 | Zustand, React Query | 客户端/服务端状态分离 |
| 后端 | Node.js, Express, TypeScript | RESTful API |
| 数据库 | SQLite + Prisma ORM | 可轻松迁移至 PostgreSQL |
| 实时通信 | Socket.IO | WebSocket 双向通信 |
| 认证 | JWT + bcryptjs | 无状态认证 |
| 容器化 | Docker + Nginx | 生产级部署 |

## 📁 项目结构

```
kanban-pro/
├── client/                # 前端 React 应用
│   ├── src/
│   │   ├── components/    # 通用组件（Modal、Avatar 等）
│   │   ├── pages/         # 页面（Board、Calendar、Stats 等）
│   │   ├── stores/        # Zustand 状态
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── api/           # Axios 封装
│   │   └── types/         # TypeScript 类型
│   └── ...
├── server/                # 后端 Express 应用
│   ├── src/
│   │   ├── controllers/   # 请求处理器
│   │   ├── routes/        # API 路由
│   │   ├── middleware/     # 中间件
│   │   ├── socket/        # WebSocket 事件
│   │   └── utils/         # 工具函数
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── ...
├── docker-compose.yml     # Docker 编排
├── nginx.conf            # Nginx 配置
└── README.md
```

## 🚀 快速启动

### 前置要求
- Node.js 18+
- npm 9+

### 1. 克隆项目
```bash
cd kanban-pro
```

### 2. 启动后端
```bash
cd server
cp .env.example .env    # 编辑配置（默认即可运行）
npm install
npx prisma generate
npx prisma db push
npm run dev              # 启动在 http://localhost:3001
```

### 3. 启动前端
```bash
cd client
npm install
npm run dev              # 启动在 http://localhost:5173
```

### 4. 打开浏览器
访问 **http://localhost:5173**

### 5. Docker 部署（生产环境）
```bash
# 构建前端
cd client && npm run build

# 启动全部服务
docker-compose up -d

# 访问 http://localhost
```

## 📡 API 概览

### 认证
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录
- `GET /api/auth/me` — 获取当前用户

### 看板
- `GET /api/boards` — 获取我的看板
- `POST /api/boards` — 创建看板
- `GET /api/boards/:id` — 看板详情
- `PUT /api/boards/:id` — 更新看板
- `DELETE /api/boards/:id` — 删除看板
- `POST /api/boards/:id/members` — 邀请成员
- `GET /api/boards/:id/stats` — 统计数据

### 列表
- `POST /api/lists` — 创建列表
- `PUT /api/lists/:id` — 更新列表
- `DELETE /api/lists/:id` — 删除列表

### 卡片
- `POST /api/cards` — 创建卡片
- `GET /api/cards/:id` — 卡片详情
- `PUT /api/cards/:id` — 更新卡片
- `DELETE /api/cards/:id` — 删除卡片
- `PUT /api/cards/reorder` — 拖拽排序
- `POST /api/cards/:id/comments` — 添加评论
- `POST /api/cards/:id/attachments` — 上传附件

### 其他
- `GET /api/search?q=` — 全局搜索
- `GET /api/templates` — 模板列表
- `GET /api/notifications` — 通知列表

## 🎯 面试展示路线

1. 注册一个账号，登录进入首页
2. 从模板创建一个 Scrum 看板
3. 在不同列表间拖拽卡片
4. 打开一个卡片，编辑描述、设置优先级、指派成员
5. 添加评论，上传附件
6. 切换到数据统计页面，展示 ECharts 图表
7. 切换到日历视图，查看任务时间分布
8. 在设置页面邀请成员、查看权限管理
9. 打开全局搜索，演示跨看板搜索
10. 切换深色模式

## 📝 后续扩展方向

- AI 任务分解（接入大模型 API）
- 甘特图视图
- 时间追踪（番茄钟）
- 邮件/企业微信通知
- PostgreSQL + Redis 高可用部署
- Kubernetes 编排
- CI/CD 流水线（GitHub Actions）

## 📄 License
MIT
