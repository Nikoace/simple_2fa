# Auto Updater Design — Simple 2FA

**Date:** 2026-05-29  
**Status:** Approved

## Overview

Add `tauri-plugin-updater` to Simple 2FA so the app automatically checks for new versions on startup and prompts the user to install them. Distribution is via GitHub Releases; signing and `latest.json` generation are handled by `tauri-apps/tauri-action` in CI.

---

## Architecture

| Layer | Change |
|---|---|
| Rust | Add `tauri-plugin-updater` dep; register in `lib.rs` |
| Frontend | `UpdateDialog` component + startup check in `App.tsx` |
| Config | `tauri.conf.json`: updater endpoint + public key |
| CI | Replace manual build steps with `tauri-apps/tauri-action` |

---

## Rust

### `Cargo.toml`
```toml
tauri-plugin-updater = "2"
```

### `lib.rs`
Register the plugin alongside the existing ones:
```rust
.plugin(tauri_plugin_updater::Builder::new().build())
```

No new Tauri commands needed — the frontend drives the update flow directly via `@tauri-apps/plugin-updater`.

---

## Frontend

### New component: `src/components/UpdateDialog.tsx`

Three internal states driven by a `phase` enum:

| Phase | UI |
|---|---|
| `available` | Version badge (current → new), scrollable release notes, "稍後" + "立即更新" |
| `downloading` | LinearProgress with percentage, buttons disabled |
| `ready` | "下載完成" message, "稍後" + "重啟並安裝" |

Version badge shows `v{currentVersion} → v{newVersion}` using MUI `Chip` or `Typography`.  
Release notes rendered in a `Box` with `maxHeight: 160px, overflow: auto`.

Props:
```ts
import type { Update } from '@tauri-apps/plugin-updater'

interface UpdateDialogProps {
  open: boolean;
  update: Update;           // returned by check(), stored in App.tsx state
  currentVersion: string;
  onClose: () => void;
}
```

The component calls `update.downloadAndInstall(progress => ...)` internally and tracks download progress in local state. `update.version` and `update.body` provide the new version string and release notes.

### Changes to `App.tsx`

1. On mount (inside existing `useEffect`), call `check()` from `@tauri-apps/plugin-updater`.
2. If an update is found, store the `Update` object in state and open `UpdateDialog`.
3. Toolbar: add `SystemUpdateAlt` `IconButton` next to the Language button for manual check. Icon rotates while checking. If no update found, show existing Snackbar with "已是最新版本".

```ts
import { check } from '@tauri-apps/plugin-updater'
import { getVersion } from '@tauri-apps/api/app'
```

### i18n keys to add (all three locale files)

```json
"updater": {
  "dialogTitle": "发现新版本",
  "versionLabel": "{{current}} → {{next}}",
  "downloadingLabel": "正在下载更新... {{percent}}%",
  "readyLabel": "下载完成，重启后生效",
  "installButton": "立即更新",
  "restartButton": "重启并安装",
  "laterButton": "稍后",
  "checkButton": "检查更新",
  "upToDate": "已是最新版本"
}
```

---

## Configuration

### `tauri.conf.json` — add `plugins` block

```json
"plugins": {
  "updater": {
    "pubkey": "<BASE64_PUBLIC_KEY>",
    "endpoints": [
      "https://github.com/{owner}/{repo}/releases/latest/download/latest.json"
    ]
  }
}
```

The `{owner}/{repo}` placeholder is replaced with the actual GitHub repo path before merging.

### One-time local key generation

```bash
cd frontend_react
bunx tauri signer generate -w ~/.tauri/simple-2fa.key
```

- Output **public key** → paste into `tauri.conf.json` `pubkey` field
- Output **private key** content → add to GitHub Secrets:
  - `TAURI_SIGNING_PRIVATE_KEY` — the private key content
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — passphrase (can be empty)

---

## CI — `release.yml`

Replace the manual `bunx tauri build` + `softprops/action-gh-release` steps in **both** `build-linux` and `build-windows` jobs with `tauri-apps/tauri-action@v0`.

The action handles: build → sign → upload artifacts → generate and upload `latest.json`.

```yaml
- uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
  with:
    tagName: ${{ needs.release-please.outputs.tag_name }}
    releaseName: "Simple 2FA __VERSION__"
    updaterJsonKeepUniversal: true
```

Windows job retains the certificate import steps before the action call. The `TAURI_CONFIG` env for certificate thumbprint remains unchanged.

`build-linux` job also needs to retain `apt-get` system dependency install steps before the action.

---

## Testing

### Rust
No new Rust logic — plugin registration only. Existing `cargo test` suite unchanged.

### Frontend
New `UpdateDialog.test.tsx` covering:
- Renders version badge and release notes when `open=true`
- "立即更新" button triggers `onInstall`
- "稍后" button triggers `onClose`
- Progress bar visible during `downloading` phase
- "重启并安装" visible during `ready` phase

Manual end-to-end test: bump version in a test branch, build, verify the running older version detects and downloads the update.

---

## Out of Scope

- macOS builds (not in current CI)
- Rollback / downgrade
- Delta/incremental updates
- Update channel selection (stable/beta)
