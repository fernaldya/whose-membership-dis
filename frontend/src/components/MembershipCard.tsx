import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { Membership } from '../types'
import { Lightbox } from './Lightbox'

interface Props {
  membership: Membership
  onEdit?: (m: Membership) => void
  onDelete?: (id: string) => void
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg className="h-6 w-6 text-slate-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  )
}

export function MembershipCard({ membership: m, onEdit, onDelete }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const expired = m.is_expired

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-zinc-900 ${
        expired
          ? 'border-slate-200 opacity-60 dark:border-zinc-800'
          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 hover:shadow-md dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-4">
        {m.screenshot_url ? (
          <button
            className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 transition-opacity hover:opacity-90 dark:border-zinc-700"
            onClick={() => setLightbox(true)}
          >
            <img src={m.screenshot_url} alt={m.merchant} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800">
            <CardIcon />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{m.merchant}</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{m.country}</p>
            </div>
            {expired && (
              <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                Expired
              </span>
            )}
          </div>

          <p className="mt-1 font-mono text-sm text-slate-600 dark:text-zinc-300">{m.membership_number}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-zinc-500">
            {m.expiry_date && (
              <span>Expires {format(parseISO(m.expiry_date), 'dd MMM yyyy')}</span>
            )}
            {!m.is_owner && m.groups.length > 0 && (
              <span>by {m.owner_name}</span>
            )}
            {m.groups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.groups.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {m.is_owner && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(m)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Edit"
              >
                <EditIcon />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(m.id)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label="Delete"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>

      {lightbox && m.screenshot_url && (
        <Lightbox src={m.screenshot_url} alt={m.merchant} onClose={() => setLightbox(false)} />
      )}
    </div>
  )
}
