# Simple 2FA → Tauri 重写完成

## 已完成的工作

### 前置准备
- 创建 `feature/tauri-desktop` 分支
- 创建 [CLAUDE.md](file:///home/niko/hobby/simple_2fa/CLAUDE.md) 开发规范

### Rust 后端（TDD，23 个测试全部通过）

| 文件 | 用途 | 测试数 |
|-----|------|--------|
| [totp.rs](file:///home/niko/hobby/simple_2fa/frontend_react/src-tauri/src/totp.rs) | TOTP 生成、验证、TTL 计算 | 12 |
| [db.rs](file:///home/niko/hobby/simple_2fa/frontend_react/src-tauri/src/db.rs) | SQLite CRUD (rusqlite) | 10 |
| [commands.rs](file:///home/niko/hobby/simple_2fa/frontend_react/src-tauri/src/commands.rs) | Tauri Command 层 | — |
| [lib.rs](file:///home/niko/hobby/simple_2fa/frontend_react/src-tauri/src/lib.rs) | 入口 + 状态管理 | — |

### 前端适配

| 文件 | 变更 |
|------|------|
| [tauriApi.ts](file:///home/niko/hobby/simple_2fa/frontend_react/src/tauriApi.ts) | 新建 — 封装 `invoke()` 替代 `fetch` |
| [App.tsx](file:///home/niko/hobby/simple_2fa/frontend_react/src/App.tsx) | 改用 `getAccounts()` / `deleteAccount()` |
| [AddAccountModal.tsx](file:///home/niko/hobby/simple_2fa/frontend_react/src/components/AddAccountModal.tsx) | 改用 `addAccount()` / `updateAccount()` |
| [vite.config.ts](file:///home/niko/hobby/simple_2fa/frontend_react/vite.config.ts) | 移除 proxy，添加 Tauri 配置 |
| [package.json](file:///home/niko/hobby/simple_2fa/frontend_react/package.json) | 添加 `@tauri-apps/api`、`@tauri-apps/cli`、`tauri` script |

### 配置文件

| 文件 | 说明 |
|------|------|
| [Cargo.toml](file:///home/niko/hobby/simple_2fa/frontend_react/src-tauri/Cargo.toml) | rusqlite、totp-rs、thiserror 等依赖 |
| [tauri.conf.json](file:///home/niko/hobby/simple_2fa/frontend_react/src-tauri/tauri.conf.json) | 窗口 800x600、标题、图标等 |

### 前端测试 (20 tests pass)

| 文件 | 内容 | 测试数 |
|------|------|--------|
| [tauriApi.test.ts](file:///home/niko/hobby/simple_2fa/frontend_react/src/test/tauriApi.test.ts) | invoke mock 验证 | 11 |
| [AccountCard.test.tsx](file:///home/niko/hobby/simple_2fa/frontend_react/src/test/AccountCard.test.tsx) | 组件渲染测试 | 6 |
| [AccountList.test.tsx](file:///home/niko/hobby/simple_2fa/frontend_react/src/test/AccountList.test.tsx) | 列表 + 空状态 | 3 |

### CI/CD

| 文件 | 说明 |
|------|------|
| [tauri-build.yml](file:///home/niko/hobby/simple_2fa/.github/workflows/tauri-build.yml) | GitHub Actions: test → build linux + windows |

## 验证结果

### Rust 测试
```
cargo test → test result: ok. 23 passed; 0 failed
```

### 前端测试
```
bunx vitest run → 3 files, 20 tests passed
```

### Tauri Dev
```
bun run tauri dev → ✅ 编译成功，应用窗口正常启动
```

## 待完成

- [ ] QR 码扫描在 Tauri webview 中的兼容性验证
- [ ] 推送到远程并触发 CI 构建
