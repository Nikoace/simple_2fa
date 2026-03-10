# Simple 2FA Authenticator

一个现代化、轻量级的桌面双因子身份验证 (2FA) 器，基于 Tauri 2 和 React 构建。支持 TOTP 算法和桌面级原生体验。

## 🌟 功能特性

- **流畅的 TOTP 动画**：使用前端本地计算和 `requestAnimationFrame` 实现平滑的倒计时效果。
- **本地安全环境**：作为独立的 Tauri 桌面应用运行，不依赖 Web 浏览器环境。
- **安全生成**：TOTP 代码在 Rust 本地安全环境生成，高效且安全。
- **一键复制**：点击代码即可复制到剪贴板。
- **账户管理**：支持账户的添加、编辑和删除。
- **持久化存储**：本地使用 SQLite 安全存储账户数据。
- **跨平台桌面支持**：完美支持 Windows / Linux / macOS。

## 🛠 技术栈

### 桌面端 & 后端 (Rust)
- **框架**：Tauri 2
- **数据库**：SQLite (rusqlite)
- **TOTP 库**：totp-rs
- **测试**：cargo test

### 前端 (React)
- **框架**：React 19 + TypeScript
- **构建工具**：Vite + Bun
- **UI 组件库**：Material UI (MUI)
- **测试**：vitest + @testing-library/react

## 🚀 快速开始

### 1. 环境准备

确保您的系统已安装：
- **Rust Toolchain** (cargo, rustc 等)
- **Bun** (用于前端构建与包管理)
- **系统层构建依赖** (Linux: `webkit2gtk-4.1`, `libappindicator3`, `build-essential` 等，具体参考 Tauri 文档)

### 2. 开发模式

```bash
# 进入前端目录
cd frontend_react

# 安装前端依赖
bun install

# 启动完整的 Tauri 开发环境 (包括前端服务器和 Rust 进程)
bun run tauri dev
```

### 3. 构建发布版本

构建当前平台的安装包/可执行文件：

```bash
cd frontend_react
bun run tauri build
```
构建产物将位于 `frontend_react/src-tauri/target/release` 目录。

如果需要交叉编译（例如 Linux 编 Windows）：
```bash
bun run tauri build --target x86_64-pc-windows-gnu
```

## 📁 项目结构

```text
simple_2fa/
├── frontend_react/     # 前端 React 代码 & Tauri 容器
│   ├── src/            # 前端 TSX 源码
│   │   ├── components/ # React UI 组件
│   │   ├── tauriApi.ts # 与 Tauri Rust 的 IPC 通信层
│   │   └── App.tsx     # 主应用入口
│   ├── src-tauri/      # Tauri Rust 后端代码
│   │   ├── src/        # Rust 源码 (db.rs, totp.rs, commands.rs 等)
│   │   └── Cargo.toml  # Rust 依赖配置
│   ├── vite.config.ts  # Vite 配置文件
│   └── package.json    # npm 依赖 / Tauri Scripts
├── backup/             # 遗留的 Python FastAPI 后端及 Docker 备份
├── planning/           # 规划与开发记录文档 (task.md, walkthrough.md)
└── README.md           # 项目文档
```

## 📝 许可证

MIT License
