'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      setTokens(res.data.accessToken, res.data.refreshToken)
      toast.success('Login realizado!')
      router.replace('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Credenciais inválidas')
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
      <h2 className="text-xl font-semibold mb-6">Entrar na conta</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="seu@email.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Senha</label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="text-center text-gray-400 text-sm mt-6">
        Não tem conta?{' '}
        <Link href="/register" className="text-blue-400 hover:underline">Cadastre-se</Link>
      </p>
    </div>
  )
}