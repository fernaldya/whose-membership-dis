import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { GroupSummary, Membership } from '../types'

export interface MembershipFormValues {
  merchant: string
  country: string
  membership_number: string
  expiry_date: string
  group_ids: string[]
  image?: FileList
}

interface Props {
  groups: GroupSummary[]
  initial?: Membership
  onSubmit: (values: MembershipFormValues) => void
  onCancel: () => void
  isPending: boolean
  error?: string | null
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-400/20'

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-zinc-300'

export function MembershipForm({ groups, initial, onSubmit, onCancel, isPending, error }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MembershipFormValues>({
    defaultValues: {
      merchant: initial?.merchant ?? '',
      country: initial?.country ?? '',
      membership_number: initial?.membership_number ?? '',
      expiry_date: initial?.expiry_date ?? '',
      group_ids: initial?.groups.map((g) => g.id) ?? [],
    },
  })

  const selectedGroups = watch('group_ids') ?? []

  function toggleGroup(id: string) {
    if (selectedGroups.includes(id)) {
      setValue('group_ids', selectedGroups.filter((g) => g !== id))
    } else {
      setValue('group_ids', [...selectedGroups, id])
    }
  }

  const [preview, setPreview] = useState<string | null>(initial?.screenshot_url ?? null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Merchant</label>
          <input
            {...register('merchant', { required: 'Required' })}
            className={inputClass}
            placeholder="e.g. Costco"
          />
          {errors.merchant && <p className="mt-1 text-xs text-red-500">{errors.merchant.message}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Country{' '}
            <span className="font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
          </label>
          <input
            {...register('country')}
            className={inputClass}
            placeholder="e.g. Australia"
          />
        </div>

        <div>
          <label className={labelClass}>Membership Number</label>
          <input
            {...register('membership_number', { required: 'Required' })}
            className={inputClass}
          />
          {errors.membership_number && (
            <p className="mt-1 text-xs text-red-500">{errors.membership_number.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Expiry Date{' '}
            <span className="font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
          </label>
          <input
            {...register('expiry_date')}
            type="date"
            className={inputClass}
          />
        </div>
      </div>

      {groups.length > 0 && (
        <div>
          <label className={labelClass}>Share with groups</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedGroups.includes(g.id)
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>
          Image{' '}
          <span className="font-normal text-slate-400 dark:text-zinc-500">(JPG/PNG, max 5 MB — optional)</span>
        </label>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Choose file
          </button>
          <span className="text-sm text-slate-400 dark:text-zinc-500">
            {fileName ?? 'No file chosen'}
          </span>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png"
          {...register('image')}
          ref={(el) => {
            register('image').ref(el)
            fileRef.current = el
          }}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setPreview(URL.createObjectURL(file))
              setFileName(file.name)
            }
          }}
        />
        {preview && (
          <img src={preview} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        {error ? (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : initial ? 'Save changes' : 'Add membership'}
          </button>
        </div>
      </div>
    </form>
  )
}
