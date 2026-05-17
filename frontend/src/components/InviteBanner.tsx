import { usePendingInvites, useRespondToInvite } from '../hooks/useInvites'

export function InviteBanner() {
  const { data: invites } = usePendingInvites()
  const respond = useRespondToInvite()

  if (!invites?.length) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="mx-auto max-w-5xl space-y-2">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          You have {invites.length} pending group invite{invites.length > 1 ? 's' : ''}
        </p>
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-zinc-900"
          >
            <span className="text-sm text-slate-700 dark:text-zinc-300">
              <span className="font-medium">{inv.invited_by_name}</span> invited you to{' '}
              <span className="font-medium">{inv.group_name}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => respond.mutate({ id: inv.id, action: 'accept' })}
                disabled={respond.isPending}
                className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => respond.mutate({ id: inv.id, action: 'decline' })}
                disabled={respond.isPending}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
