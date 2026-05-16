import { useState } from 'react'
import { useGroups, useCreateGroup, useLeaveGroup, useGroup } from '../hooks/useGroups'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups'
import { membershipsApi } from '../api/memberships'
import { useAuth } from '../hooks/useAuth'
import { format, parseISO } from 'date-fns'

export function GroupsPage() {
  const { data: groups = [], isLoading } = useGroups()
  const { user } = useAuth()
  const createGroup = useCreateGroup()
  const leaveGroup = useLeaveGroup()
  const [newName, setNewName] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [leaveConfirm, setLeaveConfirm] = useState<{ id: string; name: string } | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await createGroup.mutateAsync(newName.trim())
    setNewName('')
  }

  function confirmLeave() {
    if (!leaveConfirm) return
    leaveGroup.mutate(leaveConfirm.id)
    setLeaveConfirm(null)
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
        <span className="text-sm text-gray-500">{groups.length} / 5 owned</span>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New group name…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={createGroup.isPending || !newName.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              onClick={() => setSelected(selected === g.id ? null : g.id)}
            >
              <div>
                <span className="font-medium text-gray-900">{g.name}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {g.your_role}
                </span>
                <span className="text-gray-400">{selected === g.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {selected === g.id && (
              <GroupDetail
                groupId={g.id}
                groupName={g.name}
                currentUserId={user?.id ?? ''}
                isOwner={g.your_role === 'owner'}
                onLeave={() => setLeaveConfirm({ id: g.id, name: g.name })}
              />
            )}
          </div>
        ))}

        {!isLoading && groups.length === 0 && (
          <p className="py-12 text-center text-gray-500">No groups yet — create one above.</p>
        )}
      </div>

      {leaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setLeaveConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900">
              Leave "{leaveConfirm.name}"?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {groups.find((g) => g.id === leaveConfirm.id)?.your_role === 'owner'
                ? 'You are the owner. Ownership will transfer to the next member, or the group will be disbanded if you are the last member.'
                : 'Your memberships will be unlinked from this group.'}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setLeaveConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeave}
                disabled={leaveGroup.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Leave group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupDetail({
  groupId,
  groupName,
  currentUserId,
  isOwner,
  onLeave,
}: {
  groupId: string
  groupName: string
  currentUserId: string
  isOwner: boolean
  onLeave: () => void
}) {
  const { data } = useGroup(groupId)
  const { data: membershipsData } = useQuery({
    queryKey: ['memberships', { group_id: groupId, show_expired: true }],
    queryFn: () => membershipsApi.list({ group_id: groupId, show_expired: true, page_size: 100 }),
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const qc = useQueryClient()

  const removeMember = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  })

  const sendInvite = useMutation({
    mutationFn: (email: string) => groupsApi.invite(groupId, email),
    onSuccess: (res: any) => {
      setInviteResult(res?.status === 'queued' ? 'Not registered yet — logged.' : 'Invite sent!')
      setInviteEmail('')
    },
    onError: (err: any) => setInviteResult(err.message),
  })

  if (!data) return <div className="px-5 pb-4 text-sm text-gray-500">Loading…</div>

  return (
    <div className="border-t border-gray-100 px-5 pb-5">
      {/* Members */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Members</p>
      <div className="mt-2 space-y-2">
        {data.members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {m.picture_url && (
                <img src={m.picture_url} alt="" className="h-6 w-6 rounded-full" />
              )}
              <span className="text-sm text-gray-700">{m.name}</span>
              <span className="text-xs text-gray-400">{m.role}</span>
            </div>
            {isOwner && m.user_id !== currentUserId && (
              <button
                onClick={() => removeMember.mutate(m.user_id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Memberships shared in this group */}
      {membershipsData && membershipsData.items.length > 0 && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Memberships ({membershipsData.total})
          </p>
          <div className="mt-2 space-y-1.5">
            {membershipsData.items.map((ms) => (
              <div
                key={ms.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${ms.is_expired ? 'opacity-50' : 'bg-gray-50'}`}
              >
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{ms.merchant}</span>
                  <span className="ml-2 text-gray-400">{ms.country}</span>
                  {ms.is_expired && (
                    <span className="ml-2 text-xs text-red-500">expired</span>
                  )}
                </div>
                <div className="ml-3 shrink-0 text-right text-xs text-gray-400">
                  {ms.expiry_date && (
                    <div>{format(parseISO(ms.expiry_date), 'dd MMM yyyy')}</div>
                  )}
                  <div className="text-gray-400">
                    {ms.is_owner ? 'you' : ms.owner_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isOwner && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (inviteEmail.trim()) sendInvite.mutate(inviteEmail.trim())
          }}
        >
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteResult(null) }}
            placeholder="Invite by email…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sendInvite.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Invite
          </button>
        </form>
      )}

      {inviteResult && (
        <p className="mt-1 text-xs text-gray-500">{inviteResult}</p>
      )}

      <button
        onClick={onLeave}
        className="mt-4 text-xs text-red-500 hover:text-red-700"
      >
        {isOwner ? 'Leave / Transfer ownership' : 'Leave group'}
      </button>
    </div>
  )
}
