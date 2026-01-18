import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { apiPost } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface LoginResponse {
  success: boolean
  user?: { id: string; email: string }
  token?: string
  error?: { message: string; statusCode: number }
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await apiPost<LoginResponse>('/auth/login', { email, password })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.data?.success && result.data.user && result.data.token) {
        login(result.data.user, result.data.token)
        navigate('/')
      } else if (result.data?.error?.message) {
        setError(result.data.error.message)
      } else if (!result.data?.success) {
        setError('Login failed. Please check your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-xl">
            <h2 className="mb-6 text-center text-2xl font-semibold text-white">
              Login
            </h2>
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-red-600 bg-red-900/50 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
