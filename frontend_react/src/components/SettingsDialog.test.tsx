import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsDialog from './SettingsDialog'
import type { SupportedLanguage } from '../i18n'

describe('SettingsDialog', () => {
  const onClose = vi.fn()
  const onLanguageChange = vi.fn()
  const onAutostartChange = vi.fn()
  const onCheckUpdates = vi.fn()

  const defaultProps = {
    open: true,
    onClose,
    language: 'en' as SupportedLanguage,
    onLanguageChange,
    isWindows: false,
    autostartEnabled: false,
    autostartLoading: false,
    onAutostartChange,
    onCheckUpdates,
    isCheckingUpdate: false,
    currentVersion: '0.8.0',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders settings items when open=true', () => {
    render(<SettingsDialog {...defaultProps} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Check for Updates')).toBeInTheDocument()
  })

  it('does not render content when open=false', () => {
    render(<SettingsDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('calls onLanguageChange with correct value when language is changed', () => {
    render(<SettingsDialog {...defaultProps} />)
    // Open MUI Select dropdown by clicking the combobox div
    const combobox = screen.getByRole('combobox')
    fireEvent.mouseDown(combobox)
    // The listbox popup should now be open — click the 日本語 option
    const option = screen.getByText('日本語')
    fireEvent.click(option)
    expect(onLanguageChange).toHaveBeenCalledWith('ja')
  })

  it('renders autostart switch when isWindows=true', () => {
    render(<SettingsDialog {...defaultProps} isWindows={true} />)
    expect(screen.getByText('Launch at startup')).toBeInTheDocument()
    // MUI Switch renders with role="switch", not role="checkbox"
    const switchInput = screen.getByRole('switch')
    fireEvent.click(switchInput)
    expect(onAutostartChange).toHaveBeenCalledTimes(1)
  })

  it('does not render autostart switch when isWindows=false', () => {
    render(<SettingsDialog {...defaultProps} isWindows={false} />)
    expect(screen.queryByText('Launch at startup')).not.toBeInTheDocument()
  })

  it('calls onCheckUpdates when Check for Updates button is clicked', () => {
    render(<SettingsDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('Check for Updates'))
    expect(onCheckUpdates).toHaveBeenCalledOnce()
  })

  it('disables Check for Updates button when isCheckingUpdate=true', () => {
    render(<SettingsDialog {...defaultProps} isCheckingUpdate={true} />)
    const button = screen.getByRole('button', { name: /check for updates/i })
    expect(button).toBeDisabled()
  })

  it('calls onClose when Cancel button is clicked', () => {
    render(<SettingsDialog {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
