import * as OTPAuth from 'otpauth'

const DEFAULT_PERIOD = 30
const DEFAULT_DIGITS = 6

export interface TotpState {
  code: string
  ttl: number
  period: number
}

function formatCode(code: string): string {
  return code.replace(/(\d{3})(\d{3})/, '$1 $2')
}

export function getTotpState(secret: string, now = Date.now()): TotpState | null {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'local',
      label: 'local',
      algorithm: 'SHA1',
      digits: DEFAULT_DIGITS,
      period: DEFAULT_PERIOD,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    const code = totp.generate({ timestamp: now })
    const epochSeconds = Math.floor(now / 1000)
    const ttl = totp.period - (epochSeconds % totp.period)

    return {
      code: formatCode(code),
      ttl,
      period: totp.period,
    }
  } catch {
    return null
  }
}
