import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'

import {
  buildTimeRange,
  getBookingRangeError,
  getDefaultBookingSelection,
  getDefaultBookingStart,
  isDateSelectable,
  isWithinWorkingHours,
  roundTimeUpToStep,
} from './time'

const TZ = 'Europe/Moscow'

describe('buildTimeRange', () => {
  it('собирает корректный ISO-диапазон из даты, времени и длительности', () => {
    const range = buildTimeRange('2026-09-10', '10:00', 60, TZ)

    expect(range).not.toBeNull()

    expect(
      DateTime.fromISO(range!.startsAt).setZone(TZ).toFormat('HH:mm'),
    ).toBe('10:00')

    expect(
      DateTime.fromISO(range!.endsAt).setZone(TZ).toFormat('HH:mm'),
    ).toBe('11:00')
  })

  it('возвращает null для некорректной даты', () => {
    expect(
      buildTimeRange('not-a-date', '10:00', 60, TZ),
    ).toBeNull()
  })
})

describe('isDateSelectable', () => {
  const now = DateTime.fromISO('2026-09-08T12:00:00', {
    zone: TZ,
  })

  it('разрешает сегодняшнюю дату', () => {
    expect(
      isDateSelectable('2026-09-08', TZ, now),
    ).toBe(true)
  })

  it('разрешает дату ровно через 30 дней', () => {
    expect(
      isDateSelectable('2026-10-08', TZ, now),
    ).toBe(true)
  })

  it('запрещает дату через 31 день', () => {
    expect(
      isDateSelectable('2026-10-09', TZ, now),
    ).toBe(false)
  })

  it('запрещает дату в прошлом', () => {
    expect(
      isDateSelectable('2026-09-07', TZ, now),
    ).toBe(false)
  })
})

describe('isWithinWorkingHours', () => {
  it('разрешает интервал от 09:00 до 20:00', () => {
    const from = DateTime.fromISO('2026-09-10T09:00:00', {
      zone: TZ,
    })

    const to = DateTime.fromISO('2026-09-10T20:00:00', {
      zone: TZ,
    })

    expect(isWithinWorkingHours(from, to)).toBe(true)
  })

  it('запрещает интервал, начинающийся раньше 09:00', () => {
    const from = DateTime.fromISO('2026-09-10T08:45:00', {
      zone: TZ,
    })

    const to = DateTime.fromISO('2026-09-10T09:30:00', {
      zone: TZ,
    })

    expect(isWithinWorkingHours(from, to)).toBe(false)
  })

  it('запрещает интервал, заканчивающийся позже 20:00', () => {
    const from = DateTime.fromISO('2026-09-10T19:30:00', {
      zone: TZ,
    })

    const to = DateTime.fromISO('2026-09-10T20:15:00', {
      zone: TZ,
    })

    expect(isWithinWorkingHours(from, to)).toBe(false)
  })
})

describe('roundTimeUpToStep', () => {
  it('не изменяет время, которое уже кратно 15 минутам', () => {
    const time = DateTime.fromISO('2026-09-08T12:30:00', {
      zone: TZ,
    })

    expect(roundTimeUpToStep(time).toFormat('HH:mm')).toBe('12:30')
  })

  it('округляет время вверх до ближайших 15 минут', () => {
    const time = DateTime.fromISO('2026-09-08T12:31:00', {
      zone: TZ,
    })

    expect(roundTimeUpToStep(time).toFormat('HH:mm')).toBe('12:45')
  })
})

describe('getDefaultBookingSelection', () => {
  it('выбирает ближайшее время с шагом 15 минут', () => {
    const now = DateTime.fromISO('2026-09-08T12:01:00', {
      zone: TZ,
    })

    const result = getDefaultBookingSelection(TZ, now)

    expect(result.date).toBe('2026-09-08')
    expect(result.startTime).toBe('12:15')
  })

  it('переносит выбор на следующий день после окончания рабочего дня', () => {
    const now = DateTime.fromISO('2026-09-08T20:00:00', {
      zone: TZ,
    })

    const result = getDefaultBookingSelection(TZ, now)

    expect(result.date).toBe('2026-09-09')
    expect(result.startTime).toBe('09:00')
  })
})

describe('getDefaultBookingStart', () => {
  it('возвращает ближайшее время для сегодняшней даты', () => {
    const now = DateTime.fromISO('2026-09-08T12:01:00', {
      zone: TZ,
    })

    expect(
      getDefaultBookingStart('2026-09-08', TZ, now),
    ).toBe('12:15')
  })

  it('возвращает 09:00 для будущей даты', () => {
    const now = DateTime.fromISO('2026-09-08T12:00:00', {
      zone: TZ,
    })

    expect(
      getDefaultBookingStart('2026-09-10', TZ, now),
    ).toBe('09:00')
  })

  it('возвращает 09:00, если рабочий день уже закончился', () => {
    const now = DateTime.fromISO('2026-09-08T20:00:00', {
      zone: TZ,
    })

    expect(
      getDefaultBookingStart('2026-09-08', TZ, now),
    ).toBe('09:00')
  })
})

describe('getBookingRangeError', () => {
  const now = DateTime.fromISO('2026-09-08T12:00:00', {
    zone: TZ,
  })

  it('не возвращает ошибку для валидной будущей брони', () => {
    const range = buildTimeRange(
      '2026-09-10',
      '10:00',
      60,
      TZ,
    )!

    const from = DateTime.fromISO(range.startsAt)
    const to = DateTime.fromISO(range.endsAt)

    expect(
      getBookingRangeError(from, to, now),
    ).toBeNull()
  })

  it('возвращает ошибку, если время в прошлом', () => {
    const range = buildTimeRange(
      '2026-09-01',
      '10:00',
      60,
      TZ,
    )!

    const from = DateTime.fromISO(range.startsAt)
    const to = DateTime.fromISO(range.endsAt)

    expect(
      getBookingRangeError(from, to, now),
    ).toMatch(/будущее/)
  })

  it('возвращает ошибку, если бронь дальше 30 дней вперёд', () => {
    const range = buildTimeRange(
      '2026-10-15',
      '10:00',
      60,
      TZ,
    )!

    const from = DateTime.fromISO(range.startsAt)
    const to = DateTime.fromISO(range.endsAt)

    expect(
      getBookingRangeError(from, to, now),
    ).toMatch(/30 дней/)
  })

  it('возвращает ошибку, если бронь выходит за рабочие часы', () => {
    const range = buildTimeRange(
      '2026-09-10',
      '19:30',
      60,
      TZ,
    )!

    const from = DateTime.fromISO(range.startsAt)
    const to = DateTime.fromISO(range.endsAt)

    expect(
      getBookingRangeError(from, to, now),
    ).toMatch(/Рабочие часы/)
  })

  it('возвращает ошибку для null-диапазона', () => {
    expect(
      getBookingRangeError(null, null, now),
    ).not.toBeNull()
  })

  it('возвращает ошибку, если время начала не кратно 15 минутам', () => {
    const from = DateTime.fromISO(
      '2026-09-10T10:01:00',
      { zone: TZ },
    )

    const to = DateTime.fromISO(
      '2026-09-10T11:01:00',
      { zone: TZ },
    )

    expect(
      getBookingRangeError(from, to, now),
    ).toMatch(/кратно 15/)
  })
})

describe('buildTimeRange — edge cases', () => {
  it('корректно создаёт 15-минутный интервал', () => {
    const range = buildTimeRange('2026-09-10', '10:00', 15, TZ)

    expect(range).not.toBeNull()
    expect(range!.startsAt).toBe('2026-09-10T07:00:00.000Z')
    expect(range!.endsAt).toBe('2026-09-10T07:15:00.000Z')
  })

  it('корректно создаёт двухчасовой интервал', () => {
    const range = buildTimeRange('2026-09-10', '18:00', 120, TZ)

    expect(range).not.toBeNull()
    expect(DateTime.fromISO(range!.startsAt).setZone(TZ).toFormat('HH:mm')).toBe('18:00')
    expect(DateTime.fromISO(range!.endsAt).setZone(TZ).toFormat('HH:mm')).toBe('20:00')
  })

  it('сохраняет правильную дату при переходе через полночь', () => {
    const range = buildTimeRange('2026-09-10', '23:00', 60, TZ)

    expect(range).not.toBeNull()
    expect(DateTime.fromISO(range!.endsAt).setZone(TZ).toFormat('yyyy-MM-dd HH:mm'))
      .toBe('2026-09-11 00:00')
  })

  it('возвращает null для некорректного времени', () => {
    expect(
      buildTimeRange('2026-09-10', 'invalid', 60, TZ),
    ).toBeNull()
  })
})

describe('isDateSelectable — edge cases', () => {
  const now = DateTime.fromISO('2026-09-08T12:00:00', { zone: TZ })

  it('разрешает дату на один день вперёд', () => {
    expect(
      isDateSelectable('2026-09-09', TZ, now),
    ).toBe(true)
  })

  it('разрешает дату на 29 дней вперёд', () => {
    expect(
      isDateSelectable('2026-10-07', TZ, now),
    ).toBe(true)
  })

  it('запрещает дату на два дня раньше текущей', () => {
    expect(
      isDateSelectable('2026-09-06', TZ, now),
    ).toBe(false)
  })

  it('возвращает false для некорректной даты', () => {
    expect(
      isDateSelectable('not-a-date', TZ, now),
    ).toBe(false)
  })
})

describe('isWithinWorkingHours — границы рабочего дня', () => {
  it('разрешает начало ровно в 09:00', () => {
    const from = DateTime.fromISO('2026-09-10T09:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T09:15:00', { zone: TZ })

    expect(isWithinWorkingHours(from, to)).toBe(true)
  })

  it('разрешает окончание ровно в 20:00', () => {
    const from = DateTime.fromISO('2026-09-10T19:45:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T20:00:00', { zone: TZ })

    expect(isWithinWorkingHours(from, to)).toBe(true)
  })

  it('запрещает начало ровно в 20:00', () => {
    const from = DateTime.fromISO('2026-09-10T20:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T20:15:00', { zone: TZ })

    expect(isWithinWorkingHours(from, to)).toBe(false)
  })

  it('запрещает окончание раньше начала рабочего дня', () => {
    const from = DateTime.fromISO('2026-09-10T08:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T08:30:00', { zone: TZ })

    expect(isWithinWorkingHours(from, to)).toBe(false)
  })
})

describe('getBookingRangeError — дополнительные бизнес-правила', () => {
  const now = DateTime.fromISO('2026-09-08T12:00:00', { zone: TZ })

  it('возвращает ошибку, если начало не кратно 15 минутам', () => {
    const from = DateTime.fromISO('2026-09-10T10:10:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T11:10:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now))
      .toMatch(/кратно 15/)
  })

  it('разрешает начало в 10:15', () => {
    const from = DateTime.fromISO('2026-09-10T10:15:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T11:15:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now)).toBeNull()
  })

  it('запрещает время начала с секундами', () => {
    const from = DateTime.fromISO('2026-09-10T10:00:01', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T11:00:01', { zone: TZ })

    expect(getBookingRangeError(from, to, now))
      .toMatch(/без секунд/)
  })

  it('запрещает окончание раньше начала', () => {
    const from = DateTime.fromISO('2026-09-10T11:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T10:00:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now))
      .toMatch(/позже/)
  })

  it('запрещает интервал нулевой продолжительности', () => {
    const from = DateTime.fromISO('2026-09-10T10:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-10T10:00:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now))
      .toMatch(/позже/)
  })

  it('разрешает бронирование ровно через 30 дней', () => {
    const from = DateTime.fromISO('2026-10-08T10:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-10-08T11:00:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now)).toBeNull()
  })

  it('запрещает бронирование ровно на 31 день вперёд', () => {
    const from = DateTime.fromISO('2026-10-09T10:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-10-09T11:00:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now))
      .toMatch(/30 дней/)
  })

  it('запрещает бронирование, начинающееся ровно в текущий момент', () => {
    const from = DateTime.fromISO('2026-09-08T12:00:00', { zone: TZ })
    const to = DateTime.fromISO('2026-09-08T13:00:00', { zone: TZ })

    expect(getBookingRangeError(from, to, now))
      .toMatch(/будущее/)
  })
})