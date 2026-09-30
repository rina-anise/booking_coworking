import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'

import {
  render,
  screen,
  fireEvent,
  cleanup,
} from '@testing-library/react'

import { BookingsPage } from './BookingsPage'
import { useMyBookings, useCancelBooking } from './hooks'
import type { BookingView } from '../../api/types'


vi.mock('./hooks', () => ({
  useMyBookings: vi.fn(),
  useCancelBooking: vi.fn(),
}))

const mockedUseMyBookings = vi.mocked(useMyBookings)
const mockedUseCancelBooking = vi.mocked(useCancelBooking)

const office = { id: 'o1', name: 'Офис на Волхонке', address: '', timezone: 'Europe/Moscow' }
const room = { id: 'r1', officeId: 'o1', name: 'Переговорка 1', floor: 2, capacity: 4, features: [] }

function makeBooking(overrides: Partial<BookingView> = {}): BookingView {
  return {
    id: 'b1',
    roomId: 'r1',
    userId: 'u1',
    title: 'Синк по проекту',
    comment: null,
    startsAt: '2026-09-10T10:00:00.000Z',
    endsAt: '2026-09-10T11:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    room,
    office,
    owner: { id: 'u1', login: 'rina', displayName: 'Рина', email: '', avatarUrl: null, initials: 'Р' },
    ...overrides,
  }
}

function mockBookings(data: BookingView[] = []) {
  mockedUseMyBookings.mockReturnValue({
    data: { items: data },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useMyBookings>)
}

function mockCancelBooking(mutate = vi.fn()) {
  mockedUseCancelBooking.mockReturnValue({
    mutate,
    isPending: false,
    variables: undefined,
  } as unknown as ReturnType<typeof useCancelBooking>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BookingsPage', () => {
  it('показывает пустое состояние, когда предстоящих броней нет', () => {
    mockBookings()
    mockCancelBooking()

    render(<BookingsPage />)

    expect(
      screen.getByText(/нет предстоящих бронирований/i),
    ).toBeInTheDocument()
})

  it('рендерит список броней и вызывает отмену по клику', () => {
    const mutate = vi.fn()
    
    mockBookings([makeBooking()])
    mockCancelBooking(mutate)
    
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    
    render(<BookingsPage />)
    
    expect(screen.getByText('Синк по проекту')).toBeInTheDocument()
    
    fireEvent.click(
      screen.getByRole('button', { name: /отменить/i }),
    )
  
    expect(mutate).toHaveBeenCalledWith('b1')
})

      it('переключает вкладку и запрашивает бронирования с новым scope', () => {
      mockBookings()
      mockCancelBooking()

      render(<BookingsPage />)

      fireEvent.click(
        screen.getByRole('button', { name: 'Прошедшие' }),
      )

      expect(mockedUseMyBookings).toHaveBeenLastCalledWith({
        scope: 'past',
      })
    })
})