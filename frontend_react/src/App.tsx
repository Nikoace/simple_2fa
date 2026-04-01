import { useState, useEffect, useCallback } from 'react'
import {
  Container, Typography, Box, Button, AppBar, Toolbar, CssBaseline,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  MenuItem, Select,
  SelectChangeEvent,
  FormControlLabel, FormLabel, Radio, RadioGroup,
  Snackbar, Alert
} from '@mui/material'
import { Add, FileDownload, FileUpload } from '@mui/icons-material'
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
} from './tauriApi'
import { supportedLanguages, type SupportedLanguage } from './i18n'

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

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

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
    await i18n.changeLanguage(newLanguage)
  }

  const onLanguageSelectChange = (event: SelectChangeEvent<SupportedLanguage>) => {
    void handleLanguageChange(event.target.value)
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
    const interval = setInterval(fetchAccounts, 5000)
    return () => clearInterval(interval)
  }, [fetchAccounts])

  return (
    <>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {t('app.title')}
            </Typography>
            <Select
              value={language}
              variant="standard"
              disableUnderline
              onChange={onLanguageSelectChange}
              sx={{
                mr: 2,
                minWidth: 140,
                color: 'common.white',
                borderRadius: 1,
                px: 1,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                '.MuiSvgIcon-root': { color: 'common.white' },
              }}
              inputProps={{ 'aria-label': t('app.language') }}
            >
              <MenuItem value="zh-CN">中文</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ja">日本語</MenuItem>
            </Select>
            <Button color="inherit" startIcon={<FileUpload />} onClick={handleImportClick}>
              {t('app.import')}
            </Button>
            <Button color="inherit" startIcon={<FileDownload />} onClick={handleExportClick}>
              {t('app.export')}
            </Button>
            <Button
              color="inherit"
              startIcon={<Add />}
              onClick={() => { setEditingAccount(null); setModalOpen(true) }}
            >
              {t('app.addAccount')}
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <AccountList accounts={accounts} onDelete={confirmDelete} onEdit={handleEdit} onRefresh={fetchAccounts} />
        </Container>

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
      </Box>
    </>
  )
}

export default App
