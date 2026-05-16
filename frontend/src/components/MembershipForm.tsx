import { useEffect, useRef, useState } from 'react'
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
}

export function MembershipForm({ groups, initial, onSubmit, onCancel, isPending }: Props) {
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
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Merchant</label>
          <input
            {...register('merchant', { required: 'Required' })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="e.g. Costco"
          />
          {errors.merchant && <p className="mt-1 text-xs text-red-600">{errors.merchant.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <input
            {...register('country', { required: 'Required' })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="e.g. Australia"
          />
          {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Membership Number</label>
          <input
            {...register('membership_number', { required: 'Required' })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {errors.membership_number && (
            <p className="mt-1 text-xs text-red-600">{errors.membership_number.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Expiry Date <span className="text-gray-400">(optional)</span></label>
          <input
            {...register('expiry_date')}
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {errors.expiry_date && (
            <p className="mt-1 text-xs text-red-600">{errors.expiry_date.message}</p>
          )}
        </div>
      </div>

      {groups.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Share with groups</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedGroups.includes(g.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Image <span className="text-gray-400">(JPG/PNG, max 5 MB — optional)</span>
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png"
          {...register('image')}
          ref={(el) => {
            register('image').ref(el)
            fileRef.current = el
          }}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPreview(URL.createObjectURL(file))
          }}
        />
        {preview && (
          <img src={preview} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : initial ? 'Save changes' : 'Add membership'}
        </button>
      </div>
    </form>
  )
}
