import type { GroupDetail, GroupSummary } from '../types'
import { api } from './client'

export const groupsApi = {
  list: () => api.get<GroupSummary[]>('/groups'),
  get: (id: string) => api.get<GroupDetail>(`/groups/${id}`),
  create: (name: string) => api.post<GroupSummary>('/groups', { name }),
  update: (id: string, name: string) => api.put<GroupSummary>(`/groups/${id}`, { name }),
  leave: (id: string) => api.post<void>(`/groups/${id}/leave`),
  removeMember: (groupId: string, userId: string) =>
    api.delete<void>(`/groups/${groupId}/members/${userId}`),
  invite: (groupId: string, email: string) =>
    api.post(`/groups/${groupId}/invites`, { email }),
}
