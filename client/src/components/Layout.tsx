import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-700 bg-gray-800 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-semibold text-white">YTB</h1>
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
