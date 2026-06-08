import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '../i18n'

interface SettingsDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly language: SupportedLanguage
  readonly onLanguageChange: (lang: SupportedLanguage) => void
  readonly isWindows: boolean
  readonly autostartEnabled: boolean
  readonly autostartLoading: boolean
  readonly onAutostartChange: (enabled: boolean) => void
  readonly onCheckUpdates: () => void
  readonly isCheckingUpdate: boolean
  readonly currentVersion: string
}

/** Maps language code to display name shown in the language selector. */
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'zh-CN': '中文',
  en: 'English',
  ja: '日本語',
}

export default function SettingsDialog({
  open,
  onClose,
  language,
  onLanguageChange,
  isWindows,
  autostartEnabled,
  autostartLoading,
  onAutostartChange,
  onCheckUpdates,
  isCheckingUpdate,
  currentVersion,
}: SettingsDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('app.settings')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Language row */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography>{t('app.language')}</Typography>
            <Select
              value={language}
              size="small"
              onChange={e => onLanguageChange(e.target.value as SupportedLanguage)}
            >
              {supportedLanguages.map(lang => (
                <MenuItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </MenuItem>
              ))}
            </Select>
          </Stack>

          {/* Autostart row — Windows only */}
          {isWindows && (
            <FormControlLabel
              label={t('app.launchAtStartup')}
              control={
                <Switch
                  checked={autostartEnabled}
                  disabled={autostartLoading}
                  onChange={e => onAutostartChange(e.target.checked)}
                />
              }
            />
          )}

          {/* Check for updates row */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {currentVersion && (
              <Typography variant="body2" color="text.secondary">
                {currentVersion}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              disabled={isCheckingUpdate}
              onClick={onCheckUpdates}
              startIcon={isCheckingUpdate ? <CircularProgress size={20} /> : undefined}
            >
              {t('updater.checkButton')}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('app.cancel')}</Button>
      </DialogActions>
    </Dialog>
  )
}
