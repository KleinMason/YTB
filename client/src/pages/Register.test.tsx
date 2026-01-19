import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from './Register'
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

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Register', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('renders register heading', () => {
    renderRegister()
    expect(screen.getByRole('heading', { level: 2, name: 'Create Account' })).toBeInTheDocument()
  })

  it('renders email input field', () => {
    renderRegister()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
  })

  it('renders password input field', () => {
    renderRegister()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('renders submit button', () => {
    renderRegister()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toHaveAttribute('type', 'submit')
  })

  it('updates email input when user types', async () => {
    const user = userEvent.setup()
    renderRegister()

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'newuser@example.com')

    expect(emailInput).toHaveValue('newuser@example.com')
  })

  it('updates password input when user types', async () => {
    const user = userEvent.setup()
    renderRegister()

    const passwordInput = screen.getByLabelText('Password')
    await user.type(passwordInput, 'newsecretpassword')

    expect(passwordInput).toHaveValue('newsecretpassword')
  })

  it('has email input marked as required', () => {
    renderRegister()
    expect(screen.getByLabelText('Email')).toBeRequired()
  })

  it('has password input marked as required', () => {
    renderRegister()
    expect(screen.getByLabelText('Password')).toBeRequired()
  })

  describe('email validation', () => {
    it('shows error when email format is invalid on blur', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'invalidemail')
      await user.tab() // trigger blur

      expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address')
    })

    it('shows error when email format is invalid on submit', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'invalidemail')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address')
    })

    it('does not show error when email format is valid', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'valid@example.com')
      await user.tab() // trigger blur

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('clears error when valid email is entered after invalid', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')

      // First enter invalid email
      await user.type(emailInput, 'invalidemail')
      await user.tab()
      expect(screen.getByRole('alert')).toBeInTheDocument()

      // Clear and enter valid email
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      await user.tab()

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('prevents form submission when email is invalid', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'notanemail')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Error should be displayed, indicating form was not submitted
      expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address')
    })
  })

  describe('password validation', () => {
    it('shows error when password is too short on blur', async () => {
      const user = userEvent.setup()
      renderRegister()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'short')
      await user.tab() // trigger blur

      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters')
    })

    it('shows error when password is too short on submit', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '1234567') // 7 characters
      await user.click(submitButton)

      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters')
    })

    it('does not show error when password meets requirements', async () => {
      const user = userEvent.setup()
      renderRegister()

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'password123') // 11 characters
      await user.tab() // trigger blur

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('clears error when valid password is entered after invalid', async () => {
      const user = userEvent.setup()
      renderRegister()

      const passwordInput = screen.getByLabelText('Password')

      // First enter short password
      await user.type(passwordInput, 'short')
      await user.tab()
      expect(screen.getByRole('alert')).toBeInTheDocument()

      // Clear and enter valid password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'longenoughpassword')
      await user.tab()

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('prevents form submission when password is invalid', async () => {
      const user = userEvent.setup()
      renderRegister()

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '1234567') // Too short
      await user.click(submitButton)

      // Error should be displayed, indicating form was not submitted
      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters')
    })
  })
})

describe('Register - Form submission', () => {
  let apiPostSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
    apiPostSpy = vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: { message: 'User created successfully', user: { id: '1', email: 'test@example.com' }, token: 'token' },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('collects form values and calls register API on submit', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'newuser@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(apiPostSpy).toHaveBeenCalledWith('/auth/register', {
      email: 'newuser@example.com',
      password: 'password123',
    })
  })

  it('calls register API endpoint', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'user@test.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(apiPostSpy).toHaveBeenCalledTimes(1)
    expect(apiPostSpy.mock.calls[0][0]).toBe('/auth/register')
  })

  it('shows loading state while submitting', async () => {
    let resolvePromise: (value: { data: { message: string; user: { id: string; email: string }; token: string } }) => void
    apiPostSpy.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve
        })
    )

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(screen.getByRole('button', { name: 'Creating Account...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Creating Account...' })).toBeDisabled()

    resolvePromise!({
      data: { message: 'User created successfully', user: { id: '1', email: 'test@example.com' }, token: 'token' },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    apiPostSpy.mockImplementation(() => new Promise(() => {}))

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('re-enables submit button after API call completes', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled()
    })
  })
})

describe('Register - Success response handling', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores returned token on successful registration', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        message: 'User created successfully',
        user: { id: '123', email: 'new@example.com' },
        token: 'new-jwt-token',
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('new-jwt-token')
    })
  })

  it('updates auth context with user data on successful registration', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        message: 'User created successfully',
        user: { id: '456', email: 'context@example.com' },
        token: 'context-token',
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'context@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
      expect(storedUser.id).toBe('456')
      expect(storedUser.email).toBe('context@example.com')
    })
  })

  it('redirects to home page on successful registration', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        message: 'User created successfully',
        user: { id: '789', email: 'redirect@example.com' },
        token: 'redirect-token',
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'redirect@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('does not redirect if registration response lacks user data', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        message: 'User created successfully',
        token: 'orphan-token',
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'missing@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not store token if user data is missing from response', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        message: 'User created successfully',
        token: 'orphan-token',
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'missing@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Account' })).not.toBeDisabled()
    })
    expect(localStorage.getItem('auth_token')).toBeNull()
  })
})

describe('Register - Error response handling', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('displays error message when API returns error', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      error: 'Email already exists',
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'existing@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('displays error message from response error object', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {
        error: { message: 'Invalid email domain', statusCode: 400 },
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'invalid@domain.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email domain')).toBeInTheDocument()
    })
  })

  it('displays generic error message when registration fails without specific error', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      data: {},
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument()
    })
  })

  it('keeps form values intact after error', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      error: 'Registration failed',
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'keep@example.com')
    await user.type(screen.getByLabelText('Password'), 'mypassword123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Email')).toHaveValue('keep@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('mypassword123')
  })

  it('allows retry after error', async () => {
    const apiPostSpy = vi.spyOn(api, 'apiPost')
    apiPostSpy.mockResolvedValueOnce({
      error: 'Server error',
    })
    apiPostSpy.mockResolvedValueOnce({
      data: {
        message: 'User created successfully',
        user: { id: '123', email: 'retry@example.com' },
        token: 'success-token',
      },
    })

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'retry@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })

    // Retry submission
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('clears error message on new submission attempt', async () => {
    let resolveSecondCall: (value: { data?: { message: string; user: { id: string; email: string }; token: string } }) => void
    const apiPostSpy = vi.spyOn(api, 'apiPost')
    apiPostSpy.mockResolvedValueOnce({
      error: 'First error',
    })
    apiPostSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecondCall = resolve
        })
    )

    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })

    // Submit again - error should clear while loading
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })

    resolveSecondCall!({
      data: { message: 'User created successfully', user: { id: '1', email: 'test@example.com' }, token: 'token' },
    })
  })
})
