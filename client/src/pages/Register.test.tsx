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
})
