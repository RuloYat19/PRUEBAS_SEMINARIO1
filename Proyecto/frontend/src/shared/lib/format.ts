const LOCALE = 'es-GT'

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
const timeFormat = new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short' })
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['minute', 60],
  ['hour', 60 * 60],
  ['day', 60 * 60 * 24],
  ['week', 60 * 60 * 24 * 7],
]

export function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date)
}

export function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : timeFormat.format(date)
}

export function formatRelative(value: string, now = Date.now()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const seconds = Math.round((date.getTime() - now) / 1000)
  if (Math.abs(seconds) < 60) return 'ahora'

  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [unit, size] = UNITS[i]
    if (Math.abs(seconds) >= size) {
      return Math.abs(seconds) > 60 * 60 * 24 * 30
        ? formatDateTime(value)
        : relativeFormat.format(Math.round(seconds / size), unit)
    }
  }
  return formatDateTime(value)
}
