import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

export function ProfilePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState(user?.name ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) setName(user.name)
  }, [user])

  const update = useMutation({
    mutationFn: (n: string) => authApi.updateProfile(n),
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() && name.trim() !== user?.name) {
      update.mutate(name.trim())
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Profile</h2>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {user?.picture_url && (
          <img
            src={user.picture_url}
            alt=""
            className="mb-4 h-16 w-16 rounded-full"
          />
        )}

        <p className="mb-4 text-sm text-gray-500">{user?.email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false) }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={update.isPending || !name.trim() || name.trim() === user?.name}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved</span>}
            {update.isError && (
              <span className="text-sm text-red-600">{(update.error as Error).message}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
