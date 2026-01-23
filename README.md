# Simple 2FA Authenticator

一个现代化、基于 Web 的双因子身份验证 (2FA) 器，支持 TOTP 算法、屏幕 QR 码识别和流畅的动画体验。

## 🌟 功能特性

- **流畅的 TOTP 动画**：使用前端本地计算和 `requestAnimationFrame` 实现平滑的倒计时进度条。
- **离线生成**：TOTP 代码在本地生成，减少网络请求，保护隐私。
- **一键复制**：点击代码即可复制到剪贴板。
- **账户管理**：支持账户的添加、编辑和删除。
- **QR 码识别**：直接捕获并解析屏幕上的 QR 码，无需手机扫描。
- **持久化存储**：后端使用 SQLite 安全存储账户密钥。
- **响应式设计**：基于 React 和 Material UI (MUI)，适配各种屏幕尺寸。

## 🛠 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **构建工具**：Vite + Bun
- **UI 组件库**：Material UI (MUI)
- **TOTP 库**：otpauth
- **QR 码解析**：jsQR

### 后端
- **框架**：FastAPI (Python)
- **数据库**：SQLite + SQLModel
- **包管理**：uv
- **测试**：Pytest

## 🚀 快速开始

### 1. 环境准备

确保您的系统已安装：
- **Python 3.13** 和 **uv**
- **Bun** (用于前端构建)

### 2. 后端设置

```bash
# 进入后端目录
cd backend

# 创建虚拟环境并安装依赖
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# 启动后端服务
uvicorn app.main:app --reload
```

后端服务将在 `http://localhost:8000` 启动。

### 3. 前端设置

```bash
# 进入前端目录
cd frontend_react

# 安装依赖
bun install

# 启动开发服务器
bun run dev
```

前端应用将在 `http://localhost:5173` 启动（具体端口见终端输出）。

### 4. 构建生产版本

```bash
cd frontend_react
bun run build
```

构建产物将位于 `frontend_react/dist` 目录。

## 🐳 Docker 部署

coming soon...

## 📁 项目结构

```text
simple_2fa/
├── backend/            # Python FastAPI 后端
│   ├── app/            # 应用核心代码
│   │   ├── api/        # API 路由
│   │   ├── core/       # 核心逻辑 (TOTP 等)
│   │   └── main.py     # 入口文件
│   └── tests/          # Pytest 测试
├── frontend_react/     # React TypeScript 前端
│   ├── src/            # 源代码
│   │   ├── components/ # UI 组件
│   │   ├── types.ts    # 类型定义
│   │   └── App.tsx     # 主应用组件
│   ├── vite.config.ts  # Vite 配置
│   └── tsconfig.json   # TypeScript 配置
└── README.md           # 项目文档
```

## 📝 许可证

MIT License
