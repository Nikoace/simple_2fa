# Simple 2FA Authenticator

一个现代化、基于 Web 的双因子身份验证 (2FA) 器，支持 TOTP 算法、屏幕 QR 码识别和流畅的动画体验。

## 🌟 功能特性

- **流畅的 TOTP 动画**：使用前端本地计算(进度条)和 `requestAnimationFrame` 实现平滑的倒计时效果。
- **安全生成**：TOTP 代码在后端安全环境生成，避免密钥泄露到前端。
- **一键复制**：点击代码即可复制到剪贴板。
- **账户管理**：支持账户的添加、编辑和删除。
- **QR 码识别**：直接捕获并解析屏幕上的 QR 码，无需手机扫描。
- **MCP 协议支持**：内置 Model Context Protocol (MCP) 服务器，支持 AI 助手获取当前 2FA 代码。
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
- **AI 协议**：Model Context Protocol (MCP)
- **包管理**：uv
- **测试**：Pytest

## 🚀 快速开始

### 一键启动 (推荐)

使用项目根目录下的脚本一键启动后端和前端服务：

```bash
./dev_run.sh
```

### 手动启动

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


## 🔐 Threat Model 对比：后端模式 vs 纯前端模式

### 1) 原后端模式（当前默认）
- **secret 存储位置**：后端 SQLite（服务端）。
- **主要优点**：
  - 浏览器端通常不直接持久化 secret，降低前端被动泄露面。
  - 可结合后端访问控制、审计、备份策略。
- **主要风险**：
  - 后端数据库一旦泄露，所有账户 secret 可能集中暴露。
  - 运维面扩大（服务暴露、依赖漏洞、日志配置不当等）。
- **适用场景**：
  - 有可信服务器环境、需要多端访问或团队协作。
  - 可接受并有能力承担后端安全与运维成本。

### 2) 纯前端模式（浏览器本地存储）
- **secret 存储位置**：localStorage / IndexedDB（用户本机）。
- **主要优点**：
  - 无中心化 secret 数据库，减少“单点集中泄露”风险。
  - 可离线使用，部署轻量。
- **主要风险**：
  - **数据可用性风险高**：清除浏览器数据、重装系统、换设备会丢失账户。
  - **终端风险更直接**：恶意扩展、XSS、被入侵终端可能导致 secret 泄露。
  - 难以统一备份/恢复与审计。
- **适用场景**：
  - 个人离线使用、对部署极简有要求。
  - 用户能自行管理备份与终端安全。

### 3) 实践建议
- 对纯前端模式，建议：
  - 使用强口令对本地存储做密钥派生 + 加密（例如 PBKDF2 + AES-GCM）。
  - 明确提示用户“浏览器数据即账户数据”，并提供导出备份机制。
- 对后端模式，建议：
  - 启用最小权限、数据库加密、访问审计与定期备份恢复演练。

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
