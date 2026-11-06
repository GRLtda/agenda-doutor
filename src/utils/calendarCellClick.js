import { format } from 'date-fns'

/** VueCal emits a Date for cells, { date, split } for split cells, and
 * { date, split: MouseEvent } for weekday headings in version 4.10.2. */
export function getCalendarCellAppointmentData(payload, now = new Date()) {
  if (typeof Event !== 'undefined' && payload?.split instanceof Event) return null

  const date = payload instanceof Date ? payload : payload?.date
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null
  if (date.getTime() < now.getTime()) return null

  return { date: new Date(date.getTime()), startTime: format(date, 'HH:mm') }
}
