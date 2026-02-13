# Simple 2FA Authenticator

一个现代化、基于 Web 的双因子身份验证 (2FA) 器，当前以 `frontend_react` 为主线进行开发与演进。

## 🌟 功能特性

- **流畅的 TOTP 动画**：使用前端本地计算(进度条)和 `requestAnimationFrame` 实现平滑的倒计时效果。
- **一键复制**：点击代码即可复制到剪贴板。
- **账户管理**：支持账户的添加、编辑和删除。
- **QR 码识别**：直接捕获并解析屏幕上的 QR 码，无需手机扫描。
- **响应式设计**：基于 React 和 Material UI (MUI)，适配各种屏幕尺寸。
- **后端/协议兼容能力（legacy/可选）**：保留 FastAPI + MCP 方案用于兼容旧部署或迁移期。

## 🛠 技术栈

### 主线（推荐）
- **框架**：React 18 + TypeScript
- **构建工具**：Vite + Bun
- **UI 组件库**：Material UI (MUI)
- **TOTP 库**：otpauth
- **QR 码解析**：jsQR

### Legacy / 可选（兼容层）
- **FastAPI 后端（Python）**：用于旧架构兼容，可按需启用。
- **SQLite + SQLModel**：对应后端持久化能力。
- **Model Context Protocol (MCP)**：AI 助手集成能力，建议迁移到单独维护分支。

> 迁移建议见：`docs/migration-to-pure-react.md`。

## 🚀 快速开始

### 默认启动（仅前端，推荐）

```bash
./dev_run.sh
```

默认仅启动 React 开发服务器。

### 可选：同时启动 legacy 后端

```bash
./dev_run.sh --with-backend
```

该模式会额外启动 FastAPI 服务，适合迁移验证或兼容测试。

### 手动启动（前端主线）

#### 1. 环境准备

确保您的系统已安装：
- **Bun** (用于前端构建)

#### 2. 前端设置

```bash
# 进入前端目录
cd frontend_react

# 安装依赖
bun install

# 启动开发服务器
bun run dev
```

前端应用将在 `http://localhost:5173` 启动（具体端口见终端输出）。

#### 3. 构建生产版本

```bash
cd frontend_react
bun run build
```

构建产物将位于 `frontend_react/dist` 目录。

### Legacy 后端（可选）

如需保留后端联调能力，可在迁移期间按需使用：

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```

后端服务将在 `http://localhost:8000` 启动。

## 🐳 Docker 部署

coming soon...

## 📁 项目结构

```text
simple_2fa/
├── frontend_react/                   # React TypeScript 前端（主线）
│   ├── src/                          # 源代码
│   │   ├── components/               # UI 组件
│   │   ├── types.ts                  # 类型定义
│   │   └── App.tsx                   # 主应用组件
│   ├── vite.config.ts                # Vite 配置
│   └── tsconfig.json                 # TypeScript 配置
├── docs/
│   └── migration-to-pure-react.md    # 迁移到纯前端方案的说明
├── backend/                          # Legacy FastAPI 后端（可选）
│   ├── app/                          # 应用核心代码
│   └── tests/                        # Pytest 测试
├── dev_run.sh                        # 开发启动脚本（默认仅前端）
└── README.md                         # 项目文档
```

## 📝 许可证

MIT License
