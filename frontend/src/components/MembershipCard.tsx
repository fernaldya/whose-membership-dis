import { useState } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import type { Membership } from '../types'
import { Lightbox } from './Lightbox'

interface Props {
  membership: Membership
  onEdit?: (m: Membership) => void
  onDelete?: (id: string) => void
}

export function MembershipCard({ membership: m, onEdit, onDelete }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const expired = m.is_expired

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${expired ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-4">
        {m.screenshot_url ? (
          <button
            className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200"
            onClick={() => setLightbox(true)}
          >
            <img
              src={m.screenshot_url}
              alt={m.merchant}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-2xl">
            🪪
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{m.merchant}</h3>
              <p className="text-sm text-gray-500">{m.country}</p>
            </div>
            {expired && (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Expired
              </span>
            )}
          </div>

          <p className="mt-1 font-mono text-sm text-gray-700">{m.membership_number}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {m.expiry_date && (
              <span>Expires {format(parseISO(m.expiry_date), 'dd MMM yyyy')}</span>
            )}
            {!m.is_owner && m.groups.length > 0 && (
              <span className="text-gray-400">by {m.owner_name}</span>
            )}
            {m.groups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.groups.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700"
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
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Edit"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(m.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete"
              >
                🗑️
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
