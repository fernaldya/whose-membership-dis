import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ListParams, membershipsApi } from '../api/memberships'

export function useMemberships(params: ListParams) {
  return useQuery({
    queryKey: ['memberships', params],
    queryFn: () => membershipsApi.list(params),
  })
}

export function useDeleteMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: membershipsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

export function useCreateMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: membershipsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

export function useUpdateMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof membershipsApi.update>[1] & { id: string }) =>
      membershipsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}
