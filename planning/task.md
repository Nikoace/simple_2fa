# Simple 2FA → Tauri 桌面应用重写

## 前置准备
- [x] 创建 `feature/tauri-desktop` Git 分支
- [x] 创建 `CLAUDE.md` 开发规范

## 项目初始化
- [x] 在 `frontend_react` 中初始化 Tauri（`src-tauri` 目录）
- [x] 配置 `tauri.conf.json`、`Cargo.toml`
- [x] 配置 Vite 与 Tauri 集成

## Rust 后端开发（TDD）
- [x] 编写 TOTP 测试 → 实现 `totp.rs`
- [x] 编写 DB 测试 → 实现 `db.rs`
- [x] 编写 Commands 测试 → 实现 `commands.rs`
- [x] 确认 Rust 测试覆盖率 ≥ 80% (23/23 tests pass)

## 前端适配
- [x] 创建 `tauriApi.ts` 封装 `invoke()` 调用
- [x] 修改 `App.tsx` 替换 `fetch`
- [x] 修改 `AddAccountModal.tsx` 替换 `fetch`
- [x] 移除 Vite proxy 配置
- [x] 添加前端测试 (20/20 pass)
## 问题修复与体验优化
- [x] 修复 Tauri 构建 identifier 冲突 (`com.nikoace.simple-2fa`)
- [x] 解决 128-bit Secret 长度限制，支持 80-bit 等常见长度 (`TOTP::new_unchecked`)
- [x] 允容非标准 Base32 Padding 和特殊字符 (`base32` crate)
- [x] 修复前端验证码过期时进度条“卡顿” 5 秒的问题（增加 `onRefresh` 主动触发）

## 验证与打包
- [x] `cargo test` 全部通过 (23/23)
- [x] `tauri dev` 本地集成验证
- [x] Windows 交叉编译 → GitHub Actions CI (`windows-latest`)
