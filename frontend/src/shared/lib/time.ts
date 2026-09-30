import { DateTime } from 'luxon'

export const OFFICE_OPEN_HOUR = 9
export const OFFICE_CLOSE_HOUR = 20
export const SLOT_STEP_MINUTES = 15
export const MAX_DAYS_AHEAD = 30

export function buildTimeRange(
  date: string,
  startTime: string,
  durationMinutes: number,
  timezone: string,
) {
  const start = DateTime.fromISO(`${date}T${startTime}`, {
    zone: timezone,
  })

  if (!start.isValid) {
    return null
  }

  const end = start.plus({ minutes: durationMinutes })

  return {
    startsAt: start.toUTC().toISO()!,
    endsAt: end.toUTC().toISO()!,
  }
}

export function isDateSelectable(
  date: string,
  timezone: string,
  now: DateTime = DateTime.now(),
) {
  const selectedDate = DateTime.fromISO(date, {
    zone: timezone,
  }).startOf('day')

  const today = now.setZone(timezone).startOf('day')

  if (!selectedDate.isValid) {
    return false
  }

  const diff = selectedDate.diff(today, 'days').days

  return diff >= 0 && diff <= MAX_DAYS_AHEAD
}

export function isWithinWorkingHours(
  from: DateTime,
  to: DateTime,
) {
  const open = from.set({
    hour: OFFICE_OPEN_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  })

  const close = from.set({
    hour: OFFICE_CLOSE_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  })

  return from >= open && to <= close
}

export function roundTimeUpToStep(
  time: DateTime,
): DateTime {
  const remainder = time.minute % SLOT_STEP_MINUTES

  if (
    remainder === 0 &&
    time.second === 0 &&
    time.millisecond === 0
  ) {
    return time
  }

  return time
    .plus({
      minutes: SLOT_STEP_MINUTES - remainder,
    })
    .startOf('minute')
}

export function getDefaultBookingSelection(
  timezone: string,
  now: DateTime = DateTime.now(),
) {
  const current = now.setZone(timezone)
  const rounded = roundTimeUpToStep(current)

  const lastStart = current.set({
    hour: OFFICE_CLOSE_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  })

  if (rounded >= lastStart) {
    const nextDay = current.plus({ days: 1 })

    return {
      date: nextDay.toFormat('yyyy-MM-dd'),
      startTime: `${String(OFFICE_OPEN_HOUR).padStart(2, '0')}:00`,
    }
  }

  return {
    date: current.toFormat('yyyy-MM-dd'),
    startTime: rounded.toFormat('HH:mm'),
  }
}

export function getDefaultBookingStart(
  date: string,
  timezone: string,
  now: DateTime = DateTime.now(),
) {
  const current = now.setZone(timezone)
  const selectedDate = DateTime.fromISO(date, {
    zone: timezone,
  })

  if (!selectedDate.isValid) {
    return `${String(OFFICE_OPEN_HOUR).padStart(2, '0')}:00`
  }

  if (!selectedDate.hasSame(current, 'day')) {
    return `${String(OFFICE_OPEN_HOUR).padStart(2, '0')}:00`
  }

  const rounded = roundTimeUpToStep(current)

  const lastStart = current.set({
    hour: OFFICE_CLOSE_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  })

  if (rounded >= lastStart) {
    return `${String(OFFICE_OPEN_HOUR).padStart(2, '0')}:00`
  }

  return rounded.toFormat('HH:mm')
}

export function getBookingRangeError(
  from: DateTime | null,
  to: DateTime | null,
  now: DateTime = DateTime.now(),
) {
  if (!from || !to || !from.isValid || !to.isValid) {
    return 'Некорректное время бронирования'
  }

  if (from.minute % SLOT_STEP_MINUTES !== 0) {
    return `Время начала должно быть кратно ${SLOT_STEP_MINUTES} минутам`
  }

  if (from.second !== 0 || from.millisecond !== 0) {
    return 'Время начала должно быть указано без секунд'
  }

  if (to <= from) {
    return 'Время окончания должно быть позже времени начала'
  }

  const current = now.setZone(from.zoneName ?? 'UTC')

  if (from <= current) {
    return 'Бронирование можно создать только на будущее время'
  }

  const maxDate = current.plus({ days: MAX_DAYS_AHEAD })

  if (from > maxDate) {
    return `Бронирование доступно не более чем на ${MAX_DAYS_AHEAD} дней вперёд`
  }

  if (!isWithinWorkingHours(from, to)) {
    return `Рабочие часы: с ${String(OFFICE_OPEN_HOUR).padStart(2, '0')}:00 до ${String(OFFICE_CLOSE_HOUR).padStart(2, '0')}:00`
  }

  return null
}