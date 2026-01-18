import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login', () => {
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
