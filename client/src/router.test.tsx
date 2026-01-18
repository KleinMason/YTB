import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { AuthProvider } from './contexts/AuthContext'

const routes = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
]

function renderWithProviders(router: ReturnType<typeof createMemoryRouter>) {
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

describe('Router', () => {
  it('renders Home page at root path', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    renderWithProviders(router)
    expect(screen.getByText('Welcome to YTB - Your daily standup tracker')).toBeInTheDocument()
  })

  it('renders Login page at /login path', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    renderWithProviders(router)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Login')
  })

  it('renders Register page at /register path', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/register'] })
    renderWithProviders(router)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Register')
  })

  it('all pages include the Layout component with header', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    renderWithProviders(router)
    expect(screen.getByRole('link', { name: 'YTB' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('navigates from Home to Login when clicking Login link', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    renderWithProviders(router)

    expect(screen.getByText('Welcome to YTB - Your daily standup tracker')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Login' }))

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Login')
  })

  it('navigates from Home to Register when clicking Register link', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    renderWithProviders(router)

    expect(screen.getByText('Welcome to YTB - Your daily standup tracker')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Register' }))

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Register')
  })

  it('navigates back to Home when clicking YTB logo', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    renderWithProviders(router)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Login')

    await user.click(screen.getByRole('link', { name: 'YTB' }))

    expect(screen.getByText('Welcome to YTB - Your daily standup tracker')).toBeInTheDocument()
  })
})
