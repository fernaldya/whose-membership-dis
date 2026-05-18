import type { Membership, PaginatedMemberships, SortDir, SortField } from '../types'
import { api } from './client'

export interface ListParams {
  page?: number
  page_size?: number
  sort_by?: SortField
  sort_dir?: SortDir
  search?: string
  group_ids?: string[]
  show_expired?: boolean
  personal_only?: boolean
}

export const membershipsApi = {
  list: (params: ListParams = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === '') return
      if (Array.isArray(v)) {
        v.forEach((item) => q.append(k, String(item)))
      } else {
        q.set(k, String(v))
      }
    })
    return api.get<PaginatedMemberships>(`/memberships?${q}`)
  },

  get: (id: string) => api.get<Membership>(`/memberships/${id}`),

  create: (form: FormData) => api.postForm<Membership>('/memberships', form),

  update: (id: string, body: Partial<{
    merchant: string
    country: string
    membership_number: string
    expiry_date?: string
    group_ids: string[]
  }>) => api.put<Membership>(`/memberships/${id}`, body),

  replaceImage: (id: string, form: FormData) =>
    api.patchForm<Membership>(`/memberships/${id}/image`, form),

  removeImage: (id: string) => api.delete<Membership>(`/memberships/${id}/image`),

  delete: (id: string) => api.delete<void>(`/memberships/${id}`),
}
