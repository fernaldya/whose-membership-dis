import { usePendingInvites, useRespondToInvite } from '../hooks/useInvites'

export function InviteBanner() {
  const { data: invites } = usePendingInvites()
  const respond = useRespondToInvite()

  if (!invites?.length) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto max-w-5xl space-y-2">
        <p className="text-sm font-medium text-amber-800">
          You have {invites.length} pending group invite{invites.length > 1 ? 's' : ''}
        </p>
        {invites.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
            <span className="text-sm text-gray-700">
              <span className="font-medium">{inv.invited_by_name}</span> invited you to{' '}
              <span className="font-medium">{inv.group_name}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => respond.mutate({ id: inv.id, action: 'accept' })}
                disabled={respond.isPending}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => respond.mutate({ id: inv.id, action: 'decline' })}
                disabled={respond.isPending}
                className="rounded bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
