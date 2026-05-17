import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'

export function useAuth() {
  const query = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    retry: (_, err) => !(err instanceof ApiError && err.status === 401),
    staleTime: 5 * 60 * 1000,
  })

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  }
}
