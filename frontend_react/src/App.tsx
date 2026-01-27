import { useState, useEffect, useCallback } from 'react'
import {
  Container, Typography, Box, Button, AppBar, Toolbar, CssBaseline,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Snackbar, Alert
} from '@mui/material'
import { Add } from '@mui/icons-material'
import AccountList from './components/AccountList'
import AddAccountModal from './components/AddAccountModal'
import { Account } from './types'


function App() {

  const [accounts, setAccounts] = useState<Account[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  // UX State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      } else {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.detail || 'Failed to fetch accounts'
        console.error('Failed to fetch accounts', msg)
        showSnackbar(msg, 'error')
      }
    } catch (error) {
      console.error('Network error fetching accounts', error)
      showSnackbar('Network error fetching accounts', 'error')
    }
  }, [])

  const confirmDelete = (account: Account) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return

    try {
      const res = await fetch(`/api/accounts/${accountToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchAccounts()
        showSnackbar('Account deleted successfully')
      } else {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.detail || 'Failed to delete account'
        showSnackbar(msg, 'error')
      }
    } catch {
      showSnackbar('Error deleting account', 'error')
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setAccountToDelete(null)
  }

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
    showSnackbar(editingAccount ? 'Account updated' : 'Account added')
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts()

    // Poll every 5 seconds to keep codes fresh
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
              Authenticator
            </Typography>
            <Button
              color="inherit"
              startIcon={<Add />}
              onClick={() => {
                setEditingAccount(null)
                setModalOpen(true)
              }}
            >
              Add Account
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <AccountList accounts={accounts} onDelete={confirmDelete} onEdit={handleEdit} />
        </Container>

        <AddAccountModal
          open={modalOpen}
          onClose={handleModalClose}
          onAccountAdded={handleAccountAdded}
          initialData={editingAccount}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>Delete Account?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{accountToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              Delete
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
