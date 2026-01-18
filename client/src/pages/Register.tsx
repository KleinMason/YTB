import { useState, type FormEvent } from 'react'
import { Layout } from '../components/Layout'

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPassword(password: string): boolean {
  return password.length >= 8
}

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validateEmail = (): boolean => {
    if (email && !isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  const handleEmailBlur = () => {
    validateEmail()
  }

  const validatePassword = (): boolean => {
    if (password && !isValidPassword(password)) {
      setPasswordError('Password must be at least 8 characters')
      return false
    }
    setPasswordError('')
    return true
  }

  const handlePasswordBlur = () => {
    validatePassword()
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const isEmailValid = validateEmail()
    const isPasswordValid = validatePassword()

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    // Form submission will be implemented in a separate feature
  }

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-xl">
            <h2 className="mb-6 text-center text-2xl font-semibold text-white">
              Create Account
            </h2>
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
                  onBlur={handleEmailBlur}
                  className={`w-full rounded-md border ${emailError ? 'border-red-500' : 'border-gray-600'} bg-gray-700 px-4 py-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="you@example.com"
                  required
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {emailError}
                  </p>
                )}
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
                  onBlur={handlePasswordBlur}
                  className={`w-full rounded-md border ${passwordError ? 'border-red-500' : 'border-gray-600'} bg-gray-700 px-4 py-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="••••••••"
                  required
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
