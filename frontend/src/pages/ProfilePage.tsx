import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

export function ProfilePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
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

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear()
      navigate('/login')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() && name.trim() !== user?.name) {
      update.mutate(name.trim())
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Profile</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {user?.picture_url && (
          <img
            src={user.picture_url}
            alt=""
            className="mb-4 h-16 w-16 rounded-full ring-4 ring-slate-100 dark:ring-zinc-800"
          />
        )}

        <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">{user?.email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false) }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-400/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={update.isPending || !name.trim() || name.trim() === user?.name}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
            {update.isError && (
              <span className="text-sm text-red-500">{(update.error as Error).message}</span>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-sm text-red-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
        >
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
