import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { InviteBanner } from './InviteBanner'

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear()
      navigate('/login')
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-indigo-600">
            whose membership is dis?
          </Link>
          <nav className="flex items-center gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`
              }
            >
              Memberships
            </NavLink>
            <NavLink
              to="/groups"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`
              }
            >
              Groups
            </NavLink>
            {user && (
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <Link to="/profile" className="flex items-center gap-2 hover:opacity-80">
                  {user.picture_url && (
                    <img src={user.picture_url} alt="" className="h-7 w-7 rounded-full" />
                  )}
                  <span className="text-sm text-gray-700">{user.name}</span>
                </Link>
                <button
                  onClick={() => logout.mutate()}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <InviteBanner />

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
