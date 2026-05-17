import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { InviteBanner } from './InviteBanner'

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { theme, toggle } = useTheme()

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear()
      navigate('/login')
    },
  })

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-base font-semibold text-violet-600 dark:text-violet-400">
            whose membership is dis?
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>Memberships</NavLink>
            <NavLink to="/groups" className={navLinkClass}>Groups</NavLink>

            <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-zinc-700" />

            <button
              onClick={toggle}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {user && (
              <>
                <Link
                  to="/profile"
                  className="ml-1 rounded-md p-0.5 transition-opacity hover:opacity-80"
                  aria-label="Profile"
                >
                  {user.picture_url ? (
                    <img
                      src={user.picture_url}
                      alt=""
                      className="h-7 w-7 rounded-full ring-2 ring-slate-200 dark:ring-zinc-700"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                      {user.name[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => logout.mutate()}
                  className="rounded-md px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <InviteBanner />

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
