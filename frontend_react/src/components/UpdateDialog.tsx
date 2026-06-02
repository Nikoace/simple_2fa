import { useState, useEffect } from 'react'
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
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPhase('available')
      setProgress(0)
      setError('')
    }
  }, [open])

  const handleInstall = async () => {
    setPhase('downloading')
    setError('')
    let downloaded = 0
    let total = 0
    try {
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
    } catch (err) {
      setPhase('available')
      setProgress(0)
      setError(String(err))
    }
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
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
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
