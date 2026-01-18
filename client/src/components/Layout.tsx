import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-700 bg-gray-800 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-white hover:text-gray-300">
            YTB
          </Link>
          <nav className="flex gap-4">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white"
              >
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white">
                  Login
                </Link>
                <Link to="/register" className="text-gray-300 hover:text-white">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
