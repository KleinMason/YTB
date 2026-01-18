import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from './Register'
import { AuthProvider } from '../contexts/AuthContext'

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
})
