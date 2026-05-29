# Auto Updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `tauri-plugin-updater` to Simple 2FA so the app checks for new GitHub releases on startup and prompts the user to install updates via a progress-aware dialog.

**Architecture:** The Rust backend registers `tauri-plugin-updater` and `tauri-plugin-process`. The frontend calls `check()` on startup and on manual toolbar tap, displays `UpdateDialog` (available → downloading → ready phases) when a new version is found, and relaunches after installation. CI uses `tauri-apps/tauri-action@v0` to sign builds and auto-generate `latest.json` on each GitHub Release.

**Tech Stack:** Tauri 2, `tauri-plugin-updater 2`, `tauri-plugin-process 2`, `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`, React 19 + MUI v7, Vitest + Testing Library, GitHub Actions `tauri-apps/tauri-action@v0`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `frontend_react/src-tauri/Cargo.toml` | Modify | Add updater + process plugins |
| `frontend_react/src-tauri/src/lib.rs` | Modify | Register both plugins |
| `frontend_react/src-tauri/capabilities/default.json` | Modify | Grant updater + process permissions |
| `frontend_react/src-tauri/tauri.conf.json` | Modify | Updater endpoint + pubkey |
| `frontend_react/package.json` | Modify | Add JS plugin packages |
| `frontend_react/src/locales/zh-CN.json` | Modify | Add `updater` i18n keys |
| `frontend_react/src/locales/en.json` | Modify | Add `updater` i18n keys |
| `frontend_react/src/locales/ja.json` | Modify | Add `updater` i18n keys |
| `frontend_react/src/components/UpdateDialog.tsx` | Create | Update dialog (3 phases) |
| `frontend_react/src/components/UpdateDialog.test.tsx` | Create | Component tests |
| `frontend_react/src/App.tsx` | Modify | Startup check + toolbar button + dialog |
| `.github/workflows/release.yml` | Modify | Replace build steps with tauri-action |

---

## Task 1: Add Rust plugin dependencies and capabilities

**Files:**
- Modify: `frontend_react/src-tauri/Cargo.toml`
- Modify: `frontend_react/src-tauri/src/lib.rs`
- Modify: `frontend_react/src-tauri/capabilities/default.json`

- [ ] **Step 1: Add dependencies to Cargo.toml**

In `frontend_react/src-tauri/Cargo.toml`, add two lines after the existing `tauri-plugin-autostart` line:

```toml
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

The `[dependencies]` block should now end with:
```toml
tauri-plugin-dialog = "2"
tauri-plugin-autostart = "2.5.1"
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

- [ ] **Step 2: Register plugins in lib.rs**

In `frontend_react/src-tauri/src/lib.rs`, add two `.plugin()` calls after the existing `tauri_plugin_autostart` line:

```rust
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
```

- [ ] **Step 3: Grant capabilities**

Replace the contents of `frontend_react/src-tauri/capabilities/default.json` with:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": [
    "main"
  ],
  "permissions": [
    "core:default",
    "dialog:default",
    "autostart:default",
    "updater:default",
    "process:default"
  ]
}
```

- [ ] **Step 4: Verify Rust compiles**

```bash
cd frontend_react/src-tauri && cargo test
```

Expected: all tests pass, no compilation errors.

- [ ] **Step 5: Commit**

```bash
git add frontend_react/src-tauri/Cargo.toml frontend_react/src-tauri/Cargo.lock frontend_react/src-tauri/src/lib.rs frontend_react/src-tauri/capabilities/default.json
git commit -m "feat(rust): add tauri-plugin-updater and tauri-plugin-process"
```

---

## Task 2: Generate signing keypair and configure updater endpoint

**Files:**
- Modify: `frontend_react/src-tauri/tauri.conf.json`

> **Note:** This task generates a one-time signing keypair. The private key is NEVER committed — it goes into GitHub Secrets only.

- [ ] **Step 1: Generate the keypair**

```bash
cd frontend_react && bunx tauri signer generate -w ~/.tauri/simple-2fa.key
```

The command will print two values:
- `Public key: <base64 string>` — copy this
- The private key is written to `~/.tauri/simple-2fa.key`

- [ ] **Step 2: Add updater config to tauri.conf.json**

Open `frontend_react/src-tauri/tauri.conf.json` and add a `"plugins"` block at the top level, after `"bundle"`. Replace `<PASTE_PUBLIC_KEY_HERE>` with the public key string from Step 1:

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "Simple 2FA",
  "version": "0.6.0",
  "identifier": "com.nikoace.simple-2fa",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build"
  },
  "app": {
    "windows": [
      {
        "title": "Simple 2FA Authenticator",
        "width": 800,
        "height": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' asset: https://asset.localhost; media-src 'self' mediastream:; connect-src ipc: http://ipc.localhost"
    }
  },
  "bundle": {
    "active": true,
    "targets": [
      "deb",
      "appimage",
      "msi"
    ],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "pubkey": "<PASTE_PUBLIC_KEY_HERE>",
      "endpoints": [
        "https://github.com/Nikoace/simple_2fa/releases/latest/download/latest.json"
      ]
    }
  }
}
```

- [ ] **Step 3: Store the private key in GitHub Secrets**

Go to https://github.com/Nikoace/simple_2fa/settings/secrets/actions and add two secrets:
- `TAURI_SIGNING_PRIVATE_KEY` — contents of `~/.tauri/simple-2fa.key` (the whole file text)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the passphrase you used (leave empty if you pressed Enter)

- [ ] **Step 4: Commit only tauri.conf.json (never the key file)**

```bash
git add frontend_react/src-tauri/tauri.conf.json
git commit -m "feat(config): add updater endpoint and pubkey"
```

---

## Task 3: Add npm dependencies

**Files:**
- Modify: `frontend_react/package.json`

- [ ] **Step 1: Add packages to package.json**

In `frontend_react/package.json`, add to `"dependencies"`:

```json
"@tauri-apps/plugin-updater": "^2",
"@tauri-apps/plugin-process": "^2",
```

- [ ] **Step 2: Install**

```bash
cd frontend_react && bun install
```

Expected: `bun.lock` updated, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend_react/package.json frontend_react/bun.lock
git commit -m "feat(frontend): add updater and process plugin npm packages"
```

---

## Task 4: Add i18n keys

**Files:**
- Modify: `frontend_react/src/locales/zh-CN.json`
- Modify: `frontend_react/src/locales/en.json`
- Modify: `frontend_react/src/locales/ja.json`

- [ ] **Step 1: Add keys to zh-CN.json**

Add an `"updater"` block at the end of the root JSON object in `frontend_react/src/locales/zh-CN.json` (before the closing `}`):

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

- [ ] **Step 2: Add keys to en.json**

Add an `"updater"` block at the end of the root JSON object in `frontend_react/src/locales/en.json`:

```json
  "updater": {
    "dialogTitle": "Update Available",
    "versionLabel": "{{current}} → {{next}}",
    "downloadingLabel": "Downloading update... {{percent}}%",
    "readyLabel": "Download complete. Restart to apply.",
    "installButton": "Install Update",
    "restartButton": "Restart & Install",
    "laterButton": "Later",
    "checkButton": "Check for Updates",
    "upToDate": "You are on the latest version"
  }
```

- [ ] **Step 3: Add keys to ja.json**

Add an `"updater"` block at the end of the root JSON object in `frontend_react/src/locales/ja.json`:

```json
  "updater": {
    "dialogTitle": "アップデートが見つかりました",
    "versionLabel": "{{current}} → {{next}}",
    "downloadingLabel": "アップデートをダウンロード中... {{percent}}%",
    "readyLabel": "ダウンロード完了。再起動して適用します。",
    "installButton": "今すぐ更新",
    "restartButton": "再起動してインストール",
    "laterButton": "後で",
    "checkButton": "アップデートを確認",
    "upToDate": "最新バージョンです"
  }
```

- [ ] **Step 4: Commit**

```bash
git add frontend_react/src/locales/zh-CN.json frontend_react/src/locales/en.json frontend_react/src/locales/ja.json
git commit -m "feat(frontend): add updater i18n keys for zh-CN, en, ja"
```

---

## Task 5: Create UpdateDialog component (TDD)

**Files:**
- Create: `frontend_react/src/components/UpdateDialog.test.tsx`
- Create: `frontend_react/src/components/UpdateDialog.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend_react/src/components/UpdateDialog.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UpdateDialog from './UpdateDialog'
import type { Update } from '@tauri-apps/plugin-updater'

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn().mockResolvedValue(undefined),
}))

function makeMockUpdate(overrides?: {
  version?: string
  body?: string
  downloadAndInstall?: ReturnType<typeof vi.fn>
}): Update {
  return {
    version: overrides?.version ?? '0.7.0',
    body: overrides?.body ?? '- Bug fixes',
    date: undefined,
    rawJson: {},
    downloadAndInstall:
      overrides?.downloadAndInstall ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as Update
}

describe('UpdateDialog', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders version badge and release notes when open', () => {
    const update = makeMockUpdate({ version: '0.7.0', body: 'Bug fixes' })
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    expect(screen.getByText(/0\.6\.0.*0\.7\.0/)).toBeInTheDocument()
    expect(screen.getByText('Bug fixes')).toBeInTheDocument()
    expect(screen.getByText('Install Update')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('calls onClose when Later is clicked in available phase', () => {
    const update = makeMockUpdate()
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Later'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows progress bar while downloading', async () => {
    const downloadAndInstall = vi.fn().mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (onEvent: (e: any) => void) => {
        onEvent({ event: 'Started', data: { contentLength: 1000 } })
        onEvent({ event: 'Progress', data: { chunkLength: 500 } })
        onEvent({ event: 'Progress', data: { chunkLength: 500 } })
        onEvent({ event: 'Finished' })
      },
    )
    const update = makeMockUpdate({ downloadAndInstall })
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Install Update'))
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  it('shows Restart button after download finishes', async () => {
    const downloadAndInstall = vi.fn().mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (onEvent: (e: any) => void) => {
        onEvent({ event: 'Started', data: { contentLength: 100 } })
        onEvent({ event: 'Progress', data: { chunkLength: 100 } })
        onEvent({ event: 'Finished' })
      },
    )
    const update = makeMockUpdate({ downloadAndInstall })
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Install Update'))
    await waitFor(() => {
      expect(screen.getByText('Restart & Install')).toBeInTheDocument()
    })
  })

  it('calls relaunch when Restart & Install is clicked', async () => {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    const downloadAndInstall = vi.fn().mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (onEvent: (e: any) => void) => {
        onEvent({ event: 'Finished' })
      },
    )
    const update = makeMockUpdate({ downloadAndInstall })
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Install Update'))
    await waitFor(() => {
      expect(screen.getByText('Restart & Install')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Restart & Install'))
    await waitFor(() => {
      expect(relaunch).toHaveBeenCalledOnce()
    })
  })

  it('does not close dialog when Later clicked during download', async () => {
    let resolveDownload!: () => void
    const downloadAndInstall = vi.fn().mockImplementation(
      () => new Promise<void>(resolve => { resolveDownload = resolve }),
    )
    const update = makeMockUpdate({ downloadAndInstall })
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Install Update'))
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Later'))
    expect(onClose).not.toHaveBeenCalled()
    resolveDownload()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend_react && bun run test -- UpdateDialog
```

Expected: FAIL — `UpdateDialog` module not found.

- [ ] **Step 3: Implement UpdateDialog component**

Create `frontend_react/src/components/UpdateDialog.tsx`:

```tsx
import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

type Phase = 'available' | 'downloading' | 'ready'

interface UpdateDialogProps {
  readonly open: boolean
  readonly update: Update
  readonly currentVersion: string
  readonly onClose: () => void
}

export default function UpdateDialog({ open, update, currentVersion, onClose }: UpdateDialogProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('available')
  const [progress, setProgress] = useState(0)

  const handleInstall = async () => {
    setPhase('downloading')
    let downloaded = 0
    let total = 0
    await update.downloadAndInstall(event => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength
        if (total > 0) setProgress(Math.round((downloaded / total) * 100))
      } else if (event.event === 'Finished') {
        setPhase('ready')
      }
    })
  }

  const handleClose = () => {
    if (phase !== 'downloading') onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('updater.dialogTitle')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {phase !== 'ready' && (
          <>
            <Typography variant="body2" color="text.secondary">
              {t('updater.versionLabel', { current: currentVersion, next: update.version })}
            </Typography>
            {update.body && (
              <Box
                sx={{
                  maxHeight: 160,
                  overflow: 'auto',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}
                >
                  {update.body}
                </Typography>
              </Box>
            )}
          </>
        )}
        {phase === 'downloading' && (
          <>
            <Typography variant="body2">
              {t('updater.downloadingLabel', { percent: progress })}
            </Typography>
            <LinearProgress
              variant={progress > 0 ? 'determinate' : 'indeterminate'}
              value={progress}
            />
          </>
        )}
        {phase === 'ready' && (
          <Typography variant="body2">{t('updater.readyLabel')}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={phase === 'downloading'}>
          {t('updater.laterButton')}
        </Button>
        {phase === 'available' && (
          <Button onClick={() => { void handleInstall() }} variant="contained">
            {t('updater.installButton')}
          </Button>
        )}
        {phase === 'ready' && (
          <Button onClick={() => { void relaunch() }} variant="contained">
            {t('updater.restartButton')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd frontend_react && bun run test -- UpdateDialog
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend_react/src/components/UpdateDialog.tsx frontend_react/src/components/UpdateDialog.test.tsx
git commit -m "feat(frontend): add UpdateDialog component with TDD"
```

---

## Task 6: Integrate update check into App.tsx

**Files:**
- Modify: `frontend_react/src/App.tsx`

- [ ] **Step 1: Add imports to App.tsx**

Add these imports at the top of `frontend_react/src/App.tsx`, after the existing imports:

```tsx
import { keyframes } from '@mui/system'
import { SystemUpdateAlt } from '@mui/icons-material'
import { check } from '@tauri-apps/plugin-updater'
import { getVersion } from '@tauri-apps/api/app'
import type { Update } from '@tauri-apps/plugin-updater'
import UpdateDialog from './components/UpdateDialog'
```

- [ ] **Step 2: Add spin animation constant (module level, before the App function)**

Add this line before `const isWindows = ...`:

```tsx
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`
```

- [ ] **Step 3: Add update-related state inside the App function**

Add after the existing `autostartLoading` state declaration:

```tsx
const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null)
const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
const [currentAppVersion, setCurrentAppVersion] = useState('')
const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
```

- [ ] **Step 4: Add checkForUpdates callback**

Add after the `showSnackbar` declaration:

```tsx
const checkForUpdates = useCallback(async (showNoUpdateSnackbar = false) => {
  setIsCheckingUpdate(true)
  try {
    const [version, update] = await Promise.all([getVersion(), check()])
    setCurrentAppVersion(version)
    if (update) {
      setPendingUpdate(update)
      setUpdateDialogOpen(true)
    } else if (showNoUpdateSnackbar) {
      showSnackbar(t('updater.upToDate'))
    }
  } catch (error) {
    console.error('Update check failed', error)
  } finally {
    setIsCheckingUpdate(false)
  }
}, [showSnackbar, t])
```

- [ ] **Step 5: Call checkForUpdates on startup**

In the existing `useEffect` at the bottom of the component, add `void checkForUpdates()` and include `checkForUpdates` in the dependency array:

```tsx
useEffect(() => {
  fetchAccounts()
  void loadAutostartStatus()
  void checkForUpdates()
  const interval = setInterval(fetchAccounts, 5000)
  return () => clearInterval(interval)
}, [fetchAccounts, loadAutostartStatus, checkForUpdates])
```

- [ ] **Step 6: Add toolbar button**

In the `<Toolbar>` JSX, add the update check button after the `<Language />` `IconButton` and before the autostart `Switch`:

```tsx
<Tooltip title={t('updater.checkButton')}>
  <IconButton
    color="inherit"
    onClick={() => { void checkForUpdates(true) }}
    disabled={isCheckingUpdate}
  >
    <SystemUpdateAlt
      sx={isCheckingUpdate ? { animation: `${spin} 1s linear infinite` } : {}}
    />
  </IconButton>
</Tooltip>
```

- [ ] **Step 7: Add UpdateDialog to JSX**

Add before the closing `</Box>` tag (after the existing Snackbar):

```tsx
{pendingUpdate && (
  <UpdateDialog
    open={updateDialogOpen}
    update={pendingUpdate}
    currentVersion={currentAppVersion}
    onClose={() => setUpdateDialogOpen(false)}
  />
)}
```

- [ ] **Step 8: Run tests**

```bash
cd frontend_react && bun run test
```

Expected: all tests pass including UpdateDialog tests.

- [ ] **Step 9: Commit**

```bash
git add frontend_react/src/App.tsx
git commit -m "feat(frontend): integrate auto-update check on startup with UpdateDialog"
```

---

## Task 7: Update CI workflow to use tauri-apps/tauri-action

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Replace build-linux job's last two steps**

In `.github/workflows/release.yml`, find and replace the `build-linux` job's last two steps:

**Remove:**
```yaml
      - name: Build Tauri (Linux)
        working-directory: frontend_react
        run: bunx tauri build

      - name: Upload to GitHub Release
        uses: softprops/action-gh-release@v3.0.0
        with:
          tag_name: ${{ needs.release-please.outputs.tag_name }}
          files: |
            frontend_react/src-tauri/target/release/bundle/deb/*.deb
            frontend_react/src-tauri/target/release/bundle/appimage/*.AppImage
            frontend_react/src-tauri/target/release/bundle/rpm/*.rpm
```

**Replace with:**
```yaml
      - name: Build and Release (Linux)
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: ${{ needs.release-please.outputs.tag_name }}
          releaseName: "Simple 2FA __VERSION__"
          releaseDraft: false
          prerelease: false
          projectPath: frontend_react
          updaterJsonKeepUniversal: true
```

- [ ] **Step 2: Replace build-windows job's last two steps**

In the `build-windows` job, find and replace:

**Remove:**
```yaml
      - name: Build Tauri (Windows)
        working-directory: frontend_react
        run: bunx tauri build

      - name: Upload to GitHub Release
        uses: softprops/action-gh-release@v3.0.0
        with:
          tag_name: ${{ needs.release-please.outputs.tag_name }}
          files: |
            frontend_react/src-tauri/target/release/bundle/msi/*.msi
            frontend_react/src-tauri/target/release/bundle/nsis/*.exe
```

**Replace with:**
```yaml
      - name: Build and Release (Windows)
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
          TAURI_CONFIG: ${{ env.TAURI_CONFIG }}
        with:
          tagName: ${{ needs.release-please.outputs.tag_name }}
          releaseName: "Simple 2FA __VERSION__"
          releaseDraft: false
          prerelease: false
          projectPath: frontend_react
          updaterJsonKeepUniversal: true
          updaterJsonPreferNsis: true
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "chore(ci): replace manual build steps with tauri-apps/tauri-action for signing and updater JSON"
```

---

## Post-implementation verification checklist

- [ ] `cargo test` passes in `frontend_react/src-tauri`
- [ ] `bun run test` passes in `frontend_react`
- [ ] `tauri.conf.json` has a real (non-placeholder) pubkey
- [ ] GitHub Secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` are set
- [ ] On next release, CI generates `latest.json` and attaches it to the GitHub Release
- [ ] Running older build detects the new version and shows UpdateDialog
