'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { email, logout, hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
    if (!localStorage.getItem('access_token')) {
      router.replace('/login')
    }
  }, [])

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {})
    }
    logout()
    toast.success('Até logo!')
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">₿ Nexus Wallet</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}