import { useState, useEffect, useCallback } from 'react'
import {
  Container, Typography, Box, Button, Fab, AppBar, Toolbar, CssBaseline,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  FormControl, MenuItem,
  FormControlLabel, FormLabel, Radio, RadioGroup, Switch,
  Snackbar, Alert,
  IconButton, Tooltip, Menu,
} from '@mui/material'
import { Add, FileDownload, FileUpload, Language } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import AccountList from './components/AccountList'
import AddAccountModal from './components/AddAccountModal'
import PasswordDialog from './components/PasswordDialog'
import AccountSelectDialog from './components/AccountSelectDialog'
import type { Account, DuplicateStrategy, ImportPreviewAccount } from './types'
import {
  getAccounts, deleteAccount,
  exportAccounts, previewImport, importAccounts,
  pickExportPath, pickImportPath,
  getAutostartEnabled, setAutostartEnabled as updateAutostartEnabled,
} from './tauriApi'
import { supportedLanguages, type SupportedLanguage } from './i18n'
import { keyframes } from '@mui/system'
import { SystemUpdateAlt } from '@mui/icons-material'
import { check } from '@tauri-apps/plugin-updater'
import { getVersion } from '@tauri-apps/api/app'
import type { Update } from '@tauri-apps/plugin-updater'
import UpdateDialog from './components/UpdateDialog'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')

function App() {
  const { t, i18n } = useTranslation()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [language, setLanguage] = useState<SupportedLanguage>(
    (supportedLanguages.includes(i18n.resolvedLanguage as SupportedLanguage)
      ? i18n.resolvedLanguage
      : 'zh-CN') as SupportedLanguage
  )
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null)

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)

  // Export flow: AccountSelectDialog → PasswordDialog → file save
  const [exportSelectOpen, setExportSelectOpen] = useState(false)
  const [exportPasswordOpen, setExportPasswordOpen] = useState(false)
  const [selectedExportIds, setSelectedExportIds] = useState<number[]>([])

  // Import flow: file pick → PasswordDialog → AccountSelectDialog → import
  const [importPasswordOpen, setImportPasswordOpen] = useState(false)
  const [importSelectOpen, setImportSelectOpen] = useState(false)
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null)
  const [pendingImportPassword, setPendingImportPassword] = useState<string>('')
  const [importPreviewAccounts, setImportPreviewAccounts] = useState<ImportPreviewAccount[]>([])
  const [importStrategy, setImportStrategy] = useState<DuplicateStrategy>('Skip')
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [autostartLoading, setAutostartLoading] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [currentAppVersion, setCurrentAppVersion] = useState('')
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity })
  }, [])

  const checkForUpdates = useCallback(async (showNoUpdateSnackbar = false) => {
    if (showNoUpdateSnackbar) setIsCheckingUpdate(true)
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
      if (showNoUpdateSnackbar) {
        showSnackbar(t('updater.checkFailed'), 'error')
      }
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [showSnackbar, t])

  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }))

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await getAccounts()
      setAccounts(data)
    } catch (error) {
      console.error('Failed to fetch accounts', error)
      showSnackbar(String(error), 'error')
    }
  }, [])

  // --- Delete ---
  const confirmDelete = (account: Account) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }
  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return
    try {
      await deleteAccount(accountToDelete.id)
      fetchAccounts()
      showSnackbar(t('app.snackbar.accountDeleted'))
    } catch (error) {
      showSnackbar(String(error), 'error')
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setAccountToDelete(null)
  }

  // --- Edit ---
  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setModalOpen(true)
  }
  const handleModalClose = () => {
    setModalOpen(false)
    setEditingAccount(null)
  }
  const handleAccountAdded = () => {
    fetchAccounts()
    showSnackbar(editingAccount ? t('app.snackbar.accountUpdated') : t('app.snackbar.accountAdded'))
  }

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage)
    setLangMenuAnchor(null)
    await i18n.changeLanguage(newLanguage)
  }

  const loadAutostartStatus = useCallback(async () => {
    if (!isWindows) return
    try {
      const enabled = await getAutostartEnabled()
      setAutostartEnabled(enabled)
    } catch (error) {
      showSnackbar(String(error), 'error')
    }
  }, [showSnackbar])

  const handleAutostartChange = async (enabled: boolean) => {
    setAutostartLoading(true)
    try {
      await updateAutostartEnabled(enabled)
      setAutostartEnabled(enabled)
      showSnackbar(
        enabled ? t('app.snackbar.autostartEnabled') : t('app.snackbar.autostartDisabled')
      )
    } catch (error) {
      showSnackbar(String(error), 'error')
    } finally {
      setAutostartLoading(false)
    }
  }

  // --- Export flow ---
  // Step 1: open account selection dialog
  const handleExportClick = () => setExportSelectOpen(true)

  // Step 2: user selected accounts → store ids, open password dialog
  const handleExportSelectConfirm = (selectedIndices: number[]) => {
    setSelectedExportIds(selectedIndices.map(i => accounts[i].id))
    setExportSelectOpen(false)
    setExportPasswordOpen(true)
  }

  // Step 3: user entered password → pick file and export
  const handleExportPasswordConfirm = async (password: string) => {
    setExportPasswordOpen(false)
    try {
      const filePath = await pickExportPath()
      if (!filePath) return
      const count = await exportAccounts(password, filePath, selectedExportIds)
      showSnackbar(t('app.snackbar.exportSuccess', { count }))
    } catch (error) {
      showSnackbar(String(error), 'error')
    }
  }

  // --- Import flow ---
  // Step 1: pick file → open password dialog
  const handleImportClick = async () => {
    try {
      const filePath = await pickImportPath()
      if (!filePath) return
      setPendingImportPath(filePath)
      setImportPasswordOpen(true)
    } catch (error) {
      showSnackbar(String(error), 'error')
    }
  }

  // Step 2: user entered password → decrypt preview → open selection dialog
  const handleImportPasswordConfirm = async (password: string) => {
    if (!pendingImportPath) return
    try {
      const preview = await previewImport(password, pendingImportPath)
      setPendingImportPassword(password)
      setImportPreviewAccounts(preview)
      setImportPasswordOpen(false)
      setImportSelectOpen(true)
    } catch (error) {
      showSnackbar(String(error), 'error')
    }
  }

  // Step 3: user selected accounts → import
  const handleImportSelectConfirm = async (selectedIndices: number[]) => {
    setImportSelectOpen(false)
    if (!pendingImportPath) return
    try {
      const result = await importAccounts(
        pendingImportPassword,
        pendingImportPath,
        importStrategy,
        selectedIndices
      )
      const msg = t('app.snackbar.importSummary', {
        imported: result.imported,
        skipped: result.skipped,
        overwritten: result.overwritten,
      })
      showSnackbar(
        result.errors.length > 0 ? t('app.snackbar.importSummaryWithErrors', { summary: msg, errors: result.errors.length }) : msg,
        result.errors.length > 0 ? 'error' : 'success'
      )
      fetchAccounts()
    } catch (error) {
      showSnackbar(String(error), 'error')
    } finally {
      setPendingImportPath(null)
      setPendingImportPassword('')
      setImportPreviewAccounts([])
    }
  }

  const resetImportState = () => {
    setImportPasswordOpen(false)
    setImportSelectOpen(false)
    setPendingImportPath(null)
    setPendingImportPassword('')
    setImportPreviewAccounts([])
  }

  useEffect(() => {
    fetchAccounts()
    void loadAutostartStatus()
    const interval = setInterval(fetchAccounts, 5000)
    return () => clearInterval(interval)
  }, [fetchAccounts, loadAutostartStatus])

  // Run once on mount only — intentionally excludes checkForUpdates from deps
  // to prevent re-firing when language changes recreate the t() function reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void checkForUpdates() }, [])

  return (
    <>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {t('app.title')}
            </Typography>
            <Tooltip title={t('app.language')}>
              <IconButton color="inherit" onClick={e => setLangMenuAnchor(e.currentTarget)}>
                <Language />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={() => setLangMenuAnchor(null)}
            >
              <MenuItem selected={language === 'zh-CN'} onClick={() => { void handleLanguageChange('zh-CN') }}>中文</MenuItem>
              <MenuItem selected={language === 'en'} onClick={() => { void handleLanguageChange('en') }}>English</MenuItem>
              <MenuItem selected={language === 'ja'} onClick={() => { void handleLanguageChange('ja') }}>日本語</MenuItem>
            </Menu>
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
            {isWindows && (
              <Tooltip title={t('app.launchAtStartup')}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Switch
                    size="small"
                    color="default"
                    checked={autostartEnabled}
                    disabled={autostartLoading}
                    onChange={(_, checked) => { void handleAutostartChange(checked) }}
                  />
                </Box>
              </Tooltip>
            )}
            <Tooltip title={t('app.import')}>
              <IconButton color="inherit" onClick={handleImportClick}>
                <FileUpload />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('app.export')}>
              <IconButton color="inherit" onClick={handleExportClick}>
                <FileDownload />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <AccountList accounts={accounts} onDelete={confirmDelete} onEdit={handleEdit} onRefresh={fetchAccounts} />
        </Container>

        {/* 右下角悬浮添加按钮 */}
        <Tooltip title={t('app.addAccount')}>
          <Fab
            color="primary"
            aria-label={t('app.addAccount')}
            onClick={() => { setEditingAccount(null); setModalOpen(true) }}
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            <Add />
          </Fab>
        </Tooltip>

        <AddAccountModal
          open={modalOpen}
          onClose={handleModalClose}
          onAccountAdded={handleAccountAdded}
          initialData={editingAccount}
        />

        {/* Export: Step 1 — Select accounts */}
        <AccountSelectDialog
          open={exportSelectOpen}
          title={t('app.exportSelectTitle')}
          items={accounts.map(a => ({ name: a.name, issuer: a.issuer || null }))}
          confirmLabel={t('app.nextStep')}
          onConfirm={handleExportSelectConfirm}
          onClose={() => setExportSelectOpen(false)}
        />

        {/* Export: Step 2 — Enter password */}
        <PasswordDialog
          mode="export"
          open={exportPasswordOpen}
          onConfirm={handleExportPasswordConfirm}
          onClose={() => setExportPasswordOpen(false)}
        />

        {/* Import: Step 1 — Enter password to decrypt */}
        <PasswordDialog
          mode="import"
          open={importPasswordOpen}
          onConfirm={handleImportPasswordConfirm}
          onClose={resetImportState}
        />

        {/* Import: Step 2 — Select accounts from preview */}
        <AccountSelectDialog
          open={importSelectOpen}
          title={t('app.importSelectTitle')}
          items={importPreviewAccounts}
          confirmLabel={t('app.importAction')}
          extra={
            <FormControl size="small">
              <FormLabel>{t('app.duplicateHandling')}</FormLabel>
              <RadioGroup
                row
                value={importStrategy}
                onChange={e => setImportStrategy(e.target.value as DuplicateStrategy)}
              >
                <FormControlLabel value="Skip" control={<Radio size="small" />} label={t('app.duplicateSkip')} />
                <FormControlLabel value="Overwrite" control={<Radio size="small" />} label={t('app.duplicateOverwrite')} />
              </RadioGroup>
            </FormControl>
          }
          onConfirm={handleImportSelectConfirm}
          onClose={resetImportState}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>{t('app.deleteDialogTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('app.deleteDialogPrefix')} <strong>{accountToDelete?.name}</strong>? {t('app.deleteDialogSuffix')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>{t('app.cancel')}</Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              {t('app.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Global Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        {pendingUpdate && (
          <UpdateDialog
            open={updateDialogOpen}
            update={pendingUpdate}
            currentVersion={currentAppVersion}
            onClose={() => setUpdateDialogOpen(false)}
          />
        )}
      </Box>
    </>
  )
}

export default App
