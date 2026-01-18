import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'
import * as api from '../lib/api'
import { AuthProvider } from '../contexts/AuthContext'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('renders login heading', () => {
    renderLogin()
    expect(screen.getByRole('heading', { level: 2, name: 'Login' })).toBeInTheDocument()
  })

  it('renders email input field', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
  })

  it('renders password input field', () => {
    renderLogin()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('renders submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toHaveAttribute('type', 'submit')
  })

  it('updates email input when user types', async () => {
    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'test@example.com')

    expect(emailInput).toHaveValue('test@example.com')
  })

  it('updates password input when user types', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByLabelText('Password')
    await user.type(passwordInput, 'secretpassword')

    expect(passwordInput).toHaveValue('secretpassword')
  })

  it('has email input marked as required', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeRequired()
  })

  it('has password input marked as required', () => {
    renderLogin()
    expect(screen.getByLabelText('Password')).toBeRequired()
  })
})

describe('Login - Form submission', () => {
  let apiPostSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
    apiPostSpy = vi.spyOn(api, 'apiPost').mockResolvedValue({ data: { success: true } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('collects form values and calls login API on submit', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'mypassword123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(apiPostSpy).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'mypassword123',
    })
  })

  it('calls login API endpoint', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'user@test.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(apiPostSpy).toHaveBeenCalledTimes(1)
    expect(apiPostSpy.mock.calls[0][0]).toBe('/auth/login')
  })

  it('shows loading state while submitting', async () => {
    let resolvePromise: (value: { data: { success: boolean } }) => void
    apiPostSpy.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve
        })
    )

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()

    resolvePromise!({ data: { success: true } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    apiPostSpy.mockImplementation(() => new Promise(() => {}))

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('re-enables submit button after API call completes', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).not.toBeDisabled()
    })
  })
})

describe('Login - Success response handling', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores returned token on successful login', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        success: true,
        user: { id: '123', email: 'test@example.com' },
        token: 'test-jwt-token',
      },
    })

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('test-jwt-token')
    })
  })

  it('updates auth context with user data on successful login', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        success: true,
        user: { id: '456', email: 'user@example.com' },
        token: 'another-token',
      },
    })

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
      expect(storedUser.id).toBe('456')
      expect(storedUser.email).toBe('user@example.com')
    })
  })

  it('redirects to home page on successful login', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        success: true,
        user: { id: '789', email: 'redirect@example.com' },
        token: 'redirect-token',
      },
    })

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'redirect@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('does not redirect if login response is unsuccessful', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: { success: false },
    })

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'fail@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).not.toBeDisabled()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not store token if user data is missing from response', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        success: true,
        token: 'orphan-token',
      },
    })

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'missing@example.com')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).not.toBeDisabled()
    })
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
