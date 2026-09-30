import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateTime } from 'luxon'

import { BookingModal } from './BookingModal'
import { useCreateBooking, isConflictError } from './hooks'
import type { Office, Room } from '../../api/types'

afterEach(() => {
  cleanup()
})

vi.mock('./hooks', () => ({
  useCreateBooking: vi.fn(),
  isConflictError: vi.fn(),
}))

const mockedUseCreateBooking = vi.mocked(useCreateBooking)
const mockedIsConflictError = vi.mocked(isConflictError)

const office: Office = {
  id: 'office-1',
  name: 'Москва',
  address: 'ул. Тестовая, 1',
  timezone: 'Europe/Moscow',
}

const room: Room = {
  id: 'room-1',
  officeId: 'office-1',
  name: 'Переговорная №1',
  capacity: 6,
  floor: 1,
  features: [],
}

function getFutureDate() {
  return DateTime.now()
    .setZone(office.timezone)
    .plus({ days: 7 })
    .toFormat('yyyy-MM-dd')
}

function createMutationMock(
  overrides: Record<string, unknown> = {},
) {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useCreateBooking>
}

function renderModal(
  overrides: Partial<React.ComponentProps<typeof BookingModal>> = {},
) {
  const props: React.ComponentProps<typeof BookingModal> = {
    room,
    office,
    initialDate: getFutureDate(),
    initialStartTime: '10:00',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  }

  render(<BookingModal {...props} />)

  return props
}

beforeEach(() => {
  vi.clearAllMocks()

  mockedUseCreateBooking.mockReturnValue(
    createMutationMock(),
  )

  mockedIsConflictError.mockReturnValue(false)
})

describe('BookingModal', () => {
  it('отображает форму создания бронирования', () => {
    renderModal()

    expect(
      screen.getByText('Новое бронирование'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Переговорная:'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('textbox', {
        name: /Комментарий/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Отмена',
      }),
    ).toBeInTheDocument()
  })

  it('отображает название выбранной переговорной', () => {
    renderModal()

    expect(
      screen.getByText(room.name),
    ).toBeInTheDocument()
  })

  it('отображает начальные дату, время и продолжительность', () => {
    const date = getFutureDate()

    renderModal({
      initialDate: date,
      initialStartTime: '10:00',
    })

    expect(
      screen.getByLabelText('Дата'),
    ).toHaveValue(date)

    expect(
      screen.getByLabelText('Время начала'),
    ).toHaveValue('10:00')

    expect(
      screen.getByLabelText('Продолжительность'),
    ).toHaveValue('60')
  })

  it('кнопка бронирования заблокирована без названия встречи', () => {
    renderModal()

    expect(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    ).toBeDisabled()
  })

  it('кнопка бронирования становится активной после ввода названия', async () => {
    const user = userEvent.setup()

    renderModal()

    await user.type(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
      'Планирование спринта',
    )

    expect(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    ).toBeEnabled()
  })

  it('передаёт корректные данные в mutation', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()

    mockedUseCreateBooking.mockReturnValue(
      createMutationMock({ mutate }),
    )

    renderModal({
      initialStartTime: '10:00',
    })

    await user.type(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
      'Планирование спринта',
    )

    await user.type(
      screen.getByRole('textbox', {
        name: /Комментарий/i,
      }),
      'Обсудить задачи на неделю',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    )

    expect(mutate).toHaveBeenCalledTimes(1)

    const [payload] = mutate.mock.calls[0]

    expect(payload).toMatchObject({
      roomId: room.id,
      title: 'Планирование спринта',
      comment: 'Обсудить задачи на неделю',
    })

    expect(payload.startsAt).toBeDefined()
    expect(payload.endsAt).toBeDefined()

    expect(payload.startsAt).toContain('T07:00:00.000Z')
    expect(payload.endsAt).toContain('T08:00:00.000Z')
  })

  it('обрезает пробелы в названии и комментарии', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()

    mockedUseCreateBooking.mockReturnValue(
      createMutationMock({ mutate }),
    )

    renderModal()

    await user.type(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
      '   Встреча команды   ',
    )

    await user.type(
      screen.getByRole('textbox', {
        name: /Комментарий/i,
      }),
      '   Обсуждение задач   ',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    )

    expect(mutate).toHaveBeenCalledTimes(1)

    const [payload] = mutate.mock.calls[0]

    expect(payload.title).toBe('Встреча команды')
    expect(payload.comment).toBe('Обсуждение задач')
  })

  it('передаёт null для пустого комментария', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()

    mockedUseCreateBooking.mockReturnValue(
      createMutationMock({ mutate }),
    )

    renderModal()

    await user.type(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
      'Встреча',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    )

    expect(mutate).toHaveBeenCalledTimes(1)

    const [payload] = mutate.mock.calls[0]

    expect(payload.comment).toBeNull()
  })

  it('вызывает onSuccess после успешного создания', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    const onSuccess = vi.fn()

    mockedUseCreateBooking.mockReturnValue(
      createMutationMock({ mutate }),
    )

    renderModal({ onSuccess })

    await user.type(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
      'Встреча',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    )

    expect(mutate).toHaveBeenCalledTimes(1)

    const [, options] = mutate.mock.calls[0]

    options.onSuccess()

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

    it('показывает сообщение о конфликте при 409', async () => {
      const user = userEvent.setup()

      const mutate = vi.fn((_, options) => {
        options?.onError?.(new Error('BOOKING_CONFLICT'))
      })

      mockedUseCreateBooking.mockReturnValue(
        createMutationMock({ mutate }),
      )

      mockedIsConflictError.mockReturnValue(true)

      renderModal()

      await user.type(
        screen.getByRole('textbox', {
          name: /Тема встречи/i,
        }),
        'Встреча',
      )

      await user.click(
        screen.getByRole('button', {
          name: 'Забронировать',
        }),
      )

      expect(mutate).toHaveBeenCalledTimes(1)

      expect(
        screen.getByText('Время уже занято'),
      ).toBeInTheDocument()

      expect(
        screen.getByText(
          /Выбранный интервал был забронирован другим сотрудником/i,
        ),
      ).toBeInTheDocument()
    })

    it('после конфликта возвращается к форме бронирования', async () => {
      const user = userEvent.setup()

      const mutate = vi.fn((_, options) => {
        options?.onError?.(new Error('BOOKING_CONFLICT'))
      })

      mockedUseCreateBooking.mockReturnValue(
        createMutationMock({ mutate }),
      )

      mockedIsConflictError.mockReturnValue(true)

      renderModal()

      await user.type(
        screen.getByRole('textbox', {
          name: /Тема встречи/i,
        }),
        'Встреча',
      )

      await user.click(
        screen.getByRole('button', {
          name: 'Забронировать',
        }),
      )

      expect(
        screen.getByText('Время уже занято'),
      ).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', {
          name: 'Выбрать другое время',
        }),
      )

      expect(
        screen.getByText('Новое бронирование'),
      ).toBeInTheDocument()

      expect(
        screen.getByRole('button', {
          name: 'Забронировать',
        }),
      ).toBeInTheDocument()
    })

  it('показывает обычную ошибку создания бронирования', () => {
    const error = new Error(
      'Не удалось создать бронирование',
    )

    mockedUseCreateBooking.mockReturnValue(
      createMutationMock({
        isError: true,
        error,
      }),
    )

    mockedIsConflictError.mockReturnValue(false)

    renderModal()

    expect(
      screen.getByText(
        'Не удалось создать бронирование',
      ),
    ).toBeInTheDocument()
  })

  it('не отправляет форму при невалидном времени', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()

    mockedUseCreateBooking.mockReturnValue(
      createMutationMock({ mutate }),
    )

    renderModal()

    await user.type(
      screen.getByRole('textbox', {
        name: /Тема встречи/i,
      }),
      'Встреча',
    )

    const timeInput = screen.getByLabelText(
      'Время начала',
    )

    await user.clear(timeInput)
    await user.type(timeInput, '20:00')

    expect(
      screen.getByText(/Рабочие часы/i),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Забронировать',
      }),
    ).toBeDisabled()

    expect(mutate).not.toHaveBeenCalled()
  })

  it('вызывает onClose при нажатии «Отмена»', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderModal({ onClose })

    await user.click(
      screen.getByRole('button', {
        name: 'Отмена',
      }),
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})