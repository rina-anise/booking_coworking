import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../../api/client'
import type { User } from '../../api/types'

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: getCurrentUser,
    staleTime: Infinity,
  })
}