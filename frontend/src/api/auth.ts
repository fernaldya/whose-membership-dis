import type { User } from '../types'
import { api } from './client'

export const authApi = {
  me: () => api.get<User>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  updateProfile: (name: string) => api.patch<User>('/auth/me', { name }),
}
