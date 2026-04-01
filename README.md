# Simple 2FA Authenticator

一个现代化、轻量级的桌面双因子身份验证 (2FA) 器，基于 Tauri 2 和 React 构建。支持 TOTP 算法和桌面级原生体验。

## 功能特性

- **TOTP 实时生成**：验证码在 Rust 端安全生成，带倒计时进度条，过期自动刷新
- **一键复制**：点击复制图标即可复制验证码到剪贴板
- **账户管理**：支持手动输入或扫描屏幕二维码添加账户，支持编辑与删除
- **加密备份导出/导入**：将选定账户加密导出为 `.s2fa` 文件，可在不同 PC 间迁移
  - AES-256-GCM 加密 + Argon2id 密码派生，安全可靠
  - 导出/导入时均可勾选具体账户，避免全量操作
  - 导入时支持跳过或覆盖重复账户
- **统一字体**：TOTP 码使用 JetBrains Mono 字体，跨平台显示一致
- **本地持久化**：SQLite 本地存储，不依赖任何网络或云端服务
- **跨平台**：支持 Windows / Linux / macOS

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Tauri 2 |
| 前端 | React 19 + TypeScript + MUI + Vite |
| 包管理 | Bun |
| 后端 | Rust |
| 数据库 | SQLite (rusqlite, bundled) |
| TOTP | totp-rs |
| 加密 | AES-256-GCM (aes-gcm) + Argon2id (argon2) |
| 字体 | JetBrains Mono (@fontsource) |

## 快速开始

### 环境准备

- **Rust Toolchain**（cargo, rustc 等）
- **Bun**（前端包管理与构建）
- **系统构建依赖**（Linux：`webkit2gtk-4.1`, `libappindicator3`, `build-essential` 等，参考 [Tauri 文档](https://v2.tauri.app/start/prerequisites/)）

### 开发模式

```bash
cd frontend_react
bun install
bun run tauri dev
```

### 构建发布版本

```bash
cd frontend_react
bun run tauri build
```

构建产物位于 `frontend_react/src-tauri/target/release`。

交叉编译（如 Linux 编译 Windows 包）：

```bash
cd frontend_react
bun run tauri build --target x86_64-pc-windows-gnu
```

### 运行测试

```bash
# Rust 单元测试
cd frontend_react/src-tauri
cargo test

# 格式化 + Lint
cargo fmt && cargo clippy
```

## 项目结构

```
simple_2fa/
├── frontend_react/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccountCard.tsx        # 单账户卡片（TOTP 码 + 倒计时）
│   │   │   ├── AccountList.tsx        # 账户列表
│   │   │   ├── AddAccountModal.tsx    # 添加/编辑账户对话框
│   │   │   ├── AccountSelectDialog.tsx # 导出/导入账户多选对话框
│   │   │   └── PasswordDialog.tsx     # 备份密码输入对话框
│   │   ├── tauriApi.ts               # Tauri invoke() 封装
│   │   ├── types.ts                  # TypeScript 类型定义
│   │   └── App.tsx                   # 主应用
│   └── src-tauri/
│       └── src/
│           ├── lib.rs                # Tauri 入口
│           ├── commands.rs           # Tauri 命令（IPC 处理）
│           ├── db.rs                 # SQLite 数据库层
│           ├── totp.rs               # TOTP 生成
│           └── crypto.rs             # AES-256-GCM 加密/解密
├── backup/                           # 旧版 Python 后端（仅参考）
└── README.md
```

## 备份文件格式

导出的 `.s2fa` 文件为二进制加密格式：

```
[8B magic "S2FA_ENC"][16B Argon2id salt][12B AES-GCM nonce][加密密文]
```

密文为 JSON 序列化的账户列表（含 TOTP 密钥），通过 AES-256-GCM 认证加密保护。每次导出使用随机 salt 和 nonce，即使相同密码导出结果也不同。

## 许可证

MIT License
