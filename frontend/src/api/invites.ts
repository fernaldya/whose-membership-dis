import type { Invite } from '../types'
import { api } from './client'

export const invitesApi = {
  listPending: () => api.get<Invite[]>('/invites'),
  accept: (id: string) => api.post<void>(`/invites/${id}/accept`),
  decline: (id: string) => api.post<void>(`/invites/${id}/decline`),
}
