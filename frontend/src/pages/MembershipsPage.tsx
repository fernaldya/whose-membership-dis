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
      await updateMutation.mutateAsync({
        id: editing.id,
        merchant: values.merchant,
        country: values.country,
        membership_number: values.membership_number,
        expiry_date: values.expiry_date || undefined,
        group_ids: values.group_ids,
      })
      // Handle image replacement if a new file was picked.
      if (values.image?.[0]) {
        const form = new FormData()
        form.append('image', values.image[0])
        await membershipsApi.replaceImage(editing.id, form)
      }
      setEditing(null)
    } else {
      const form = new FormData()
      form.append('merchant', values.merchant)
      form.append('country', values.country)
      form.append('membership_number', values.membership_number)
      if (values.expiry_date) form.append('expiry_date', values.expiry_date)
      values.group_ids.forEach((id) => form.append('group_ids', id))
      if (values.image?.[0]) form.append('image', values.image[0])
      await createMutation.mutateAsync(form)
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Memberships</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add
        </button>
      </div>

      {(showForm || editing) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            {editing ? 'Edit membership' : 'New membership'}
          </h3>
          <MembershipForm
            groups={groups}
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search merchant…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
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
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
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
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          {SORT_OPTIONS.flatMap((o) => [
            <option key={`${o.value}:desc`} value={`${o.value}:desc`}>{o.label} ↓</option>,
            <option key={`${o.value}:asc`} value={`${o.value}:asc`}>{o.label} ↑</option>,
          ])}
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => { setShowExpired(e.target.checked); setPage(1) }}
            className="rounded border-gray-300"
          />
          Show expired
        </label>

      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <p className="py-12 text-center text-gray-500">
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
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            {page} / {data.pages}
          </span>
          <button
            disabled={page === data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
