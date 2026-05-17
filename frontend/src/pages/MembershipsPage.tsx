import { useState } from 'react'
import { useCreateMembership, useDeleteMembership, useMemberships, useUpdateMembership } from '../hooks/useMemberships'
import { useGroups } from '../hooks/useGroups'
import { MembershipCard } from '../components/MembershipCard'
import { MembershipForm, type MembershipFormValues } from '../components/MembershipForm'
import type { Membership, SortDir, SortField } from '../types'
import { membershipsApi } from '../api/memberships'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'created_at', label: 'Date added' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'expiry_date', label: 'Expiry' },
  { value: 'country', label: 'Country' },
]

const controlClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-400/20'

export function MembershipsPage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [showExpired, setShowExpired] = useState(false)
  const [personalOnly, setPersonalOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Membership | null>(null)

  const { data, isLoading } = useMemberships({
    page,
    sort_by: sortBy,
    sort_dir: sortDir,
    search: search || undefined,
    group_id: groupFilter || undefined,
    show_expired: showExpired,
    personal_only: personalOnly || undefined,
  })

  const { data: groups = [] } = useGroups()
  const createMutation = useCreateMembership()
  const updateMutation = useUpdateMembership()
  const deleteMutation = useDeleteMembership()

  async function handleSubmit(values: MembershipFormValues) {
    if (editing) {
      try {
        await updateMutation.mutateAsync({
          id: editing.id,
          merchant: values.merchant,
          country: values.country,
          membership_number: values.membership_number,
          expiry_date: values.expiry_date || undefined,
          group_ids: values.group_ids,
        })
        if (values.image?.[0]) {
          const form = new FormData()
          form.append('image', values.image[0])
          await membershipsApi.replaceImage(editing.id, form)
        }
        setEditing(null)
      } catch {
        // error surfaced via updateMutation.error
      }
    } else {
      try {
        const form = new FormData()
        form.append('merchant', values.merchant)
        form.append('country', values.country)
        form.append('membership_number', values.membership_number)
        if (values.expiry_date) form.append('expiry_date', values.expiry_date)
        values.group_ids.forEach((id) => form.append('group_ids', id))
        if (values.image?.[0]) form.append('image', values.image[0])
        await createMutation.mutateAsync(form)
        setShowForm(false)
      } catch {
        // error surfaced via createMutation.error
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Memberships</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          + Add
        </button>
      </div>

      {(showForm || editing) && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-zinc-100">
            {editing ? 'Edit membership' : 'New membership'}
          </h3>
          <MembershipForm
            groups={groups}
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            isPending={createMutation.isPending || updateMutation.isPending}
            error={(createMutation.error ?? updateMutation.error)?.message}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search merchant…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className={`${controlClass} placeholder:text-slate-400 dark:placeholder:text-zinc-500`}
        />

        <select
          value={personalOnly ? '__personal__' : groupFilter}
          onChange={(e) => {
            const val = e.target.value
            if (val === '__personal__') {
              setPersonalOnly(true)
              setGroupFilter('')
            } else {
              setPersonalOnly(false)
              setGroupFilter(val)
            }
            setPage(1)
          }}
          className={controlClass}
        >
          <option value="">All</option>
          <option value="__personal__">Mine</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          value={`${sortBy}:${sortDir}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split(':')
            setSortBy(field as SortField)
            setSortDir(dir as SortDir)
            setPage(1)
          }}
          className={controlClass}
        >
          {SORT_OPTIONS.flatMap((o) => [
            <option key={`${o.value}:desc`} value={`${o.value}:desc`}>{o.label} ↓</option>,
            <option key={`${o.value}:asc`} value={`${o.value}:asc`}>{o.label} ↑</option>,
          ])}
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => { setShowExpired(e.target.checked); setPage(1) }}
            className="rounded border-slate-300 text-violet-600 dark:border-zinc-600"
          />
          Show expired
        </label>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-500 dark:border-zinc-700" />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
          {search || groupFilter ? 'No memberships match your filters.' : 'No memberships yet — add one above.'}
        </p>
      )}

      <div className="space-y-3">
        {data?.items.map((m) => (
          <MembershipCard
            key={m.id}
            membership={m}
            onEdit={setEditing}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500 dark:text-zinc-400">
            {page} / {data.pages}
          </span>
          <button
            disabled={page === data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
