# CLAUDE.md — Simple 2FA Tauri 開発規範

## プロジェクト概要

Simple 2FA Authenticator の Tauri デスクトップアプリ版。  
React (TypeScript) フロントエンド + Rust バックエンド。

## 技術スタック

| 層 | 技術 |
|---|---|
| フレームワーク | Tauri 2 |
| フロントエンド | React 19 + TypeScript + MUI + Vite |
| フロントエンドビルド | Bun |
| バックエンド | Rust |
| データベース | SQLite (rusqlite, bundled) |
| TOTP | totp-rs |
| テスト (Rust) | cargo test |
| テスト (Frontend) | vitest + @testing-library/react |

## ディレクトリ構成

```
simple_2fa/
├── frontend_react/          # フロントエンド + Tauri
│   ├── src/                 # React ソースコード
│   │   ├── components/      # UI コンポーネント
│   │   ├── tauriApi.ts      # Tauri invoke() ラッパー
│   │   ├── types.ts         # TypeScript 型定義
│   │   └── App.tsx          # メインアプリ
│   ├── src-tauri/           # Rust バックエンド
│   │   ├── src/
│   │   │   ├── lib.rs       # Tauri エントリーポイント
│   │   │   ├── commands.rs  # Tauri コマンド
│   │   │   ├── db.rs        # SQLite データベース層
│   │   │   └── totp.rs      # TOTP コア処理
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── package.json
│   └── vite.config.ts
├── backup/                  # (レガシー) Python バックエンド ও Docker 関連 — 参照のみ
└── CLAUDE.md                # このファイル
```

## 開発ルール

### 一般
- **TDD 必須**：テストを先に書いてから実装する
- **テストカバレッジ**: 80% 以上を維持
- **テストコード変更禁止**：作成後のテストコードは、ユーザーレビューなしで削除・変更してはならない
- **コメント**：難解なコードにはコメントを付与する
- **ブランチ**: `feature/tauri-desktop` で作業

### Rust 規範
- エラー処理: `thiserror` で独自エラー型を定義、`Result<T, E>` を返す
- シリアライズ: Tauri コマンドの入出力は `serde::Serialize` / `Deserialize` を実装
- DB 接続: `Mutex<Connection>` を Tauri State で管理
- テスト: 各モジュールに `#[cfg(test)] mod tests` を配置
- フォーマット: `cargo fmt` を使用
- リント: `cargo clippy` を使用

### フロントエンド規範
- `fetch()` は使わない — `@tauri-apps/api/core` の `invoke()` を使用
- API 呼び出しは `tauriApi.ts` に集約
- TypeScript strict mode を有効にする

### コミットメッセージ
```
<type>(<scope>): <description>

type: feat | fix | refactor | test | docs | chore
scope: rust | frontend | config
```

例:
```
feat(rust): implement TOTP generation with totp-rs
test(rust): add unit tests for db module
feat(frontend): replace fetch with Tauri invoke
```

## よく使うコマンド

```bash
# 開発サーバー起動
cd frontend_react && bun run tauri dev

# Rust テスト
cd frontend_react/src-tauri && cargo test

# Rust フォーマット + リント
cd frontend_react/src-tauri && cargo fmt && cargo clippy

# フロントエンドテスト
cd frontend_react && bun run test

# Windows クロスコンパイル
cd frontend_react && bun run tauri build --target x86_64-pc-windows-gnu

# Linux ビルド
cd frontend_react && bun run tauri build
```
