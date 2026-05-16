import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitesApi } from '../api/invites'

export function usePendingInvites() {
  return useQuery({ queryKey: ['invites'], queryFn: invitesApi.listPending })
}

export function useRespondToInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      action === 'accept' ? invitesApi.accept(id) : invitesApi.decline(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
