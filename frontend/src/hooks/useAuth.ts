import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export function useAuth(requireAuth = true) {
  const router = useRouter()
  const { accessToken, hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (requireAuth && !localStorage.getItem('access_token')) {
      router.replace('/login')
    }
  }, [accessToken, requireAuth])

  return useAuthStore()
}