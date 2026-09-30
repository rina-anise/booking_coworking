import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RoomsPage } from '../features/rooms/RoomsPage'
import { RoomDetailPage } from '../features/rooms/RoomDetailPage'
import { BookingsPage } from '../features/bookings/BookingsPage'
import { NotFoundPage } from '../shared/ui/NotFoundPage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/rooms" replace /> },
      { path: 'rooms', element: <RoomsPage /> },
      { path: 'rooms/:roomId', element: <RoomDetailPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])