import { useState, useEffect } from 'react'
import { Container, Typography, Box, Button, AppBar, Toolbar, CssBaseline } from '@mui/material'
import { Add } from '@mui/icons-material'
import AccountList from './components/AccountList'
import AddAccountModal from './components/AddAccountModal'
import { Account } from './types'


function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error)
    }
  }

  const handleDelete = async (account: Account) => {
    if (!confirm(`Are you sure you want to delete ${account.name}?`)) return

    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchAccounts()
      } else {
        alert('Failed to delete')
      }
    } catch (e) {
      alert('Error deleting account')
    }
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingAccount(null)
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

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
          <AccountList accounts={accounts} onDelete={handleDelete} onEdit={handleEdit} />
        </Container>

        <AddAccountModal
          open={modalOpen}
          onClose={handleModalClose}
          onAccountAdded={fetchAccounts}
          initialData={editingAccount}
        />
      </Box>
    </>
  )
}

export default App
