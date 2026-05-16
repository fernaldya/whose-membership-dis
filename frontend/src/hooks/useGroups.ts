import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups'

export function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: groupsApi.list })
}

export function useGroup(id: string) {
  return useQuery({ queryKey: ['groups', id], queryFn: () => groupsApi.get(id) })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => groupsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useLeaveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.leave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}
