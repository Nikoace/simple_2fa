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
    resolveDownload()
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

  it('shows error message and re-enables buttons when download fails', async () => {
    const downloadAndInstall = vi.fn().mockRejectedValue(new Error('Network error'))
    const update = makeMockUpdate({ downloadAndInstall })
    render(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Install Update'))
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })
    expect(screen.getByText('Install Update')).toBeInTheDocument()
    expect(screen.getByText('Later')).not.toBeDisabled()
  })

  it('resets state when dialog is reopened', () => {
    const update = makeMockUpdate()
    const { rerender } = render(
      <UpdateDialog open={false} update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    rerender(
      <UpdateDialog open update={update} currentVersion="0.6.0" onClose={onClose} />,
    )
    expect(screen.getByText('Install Update')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
