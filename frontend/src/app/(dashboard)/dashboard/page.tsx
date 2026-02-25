'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const TOKEN_ICONS: Record<string, string> = {
  BRL: '🇧🇷', BTC: '₿', ETH: 'Ξ', USDT: '₮', USDC: '$',
}

type Balance = { token: string; amount: string }
type LedgerEntry = {
  id: string; type: string; token: string; amount: string
  balanceBefore: string; balanceAfter: string; createdAt: string
}

const swapSchema = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  amount: z.string().min(1),
})
const withdrawSchema = z.object({
  token: z.string(),
  amount: z.string().min(1),
  destination: z.string().min(1),
})

type SwapForm = z.infer<typeof swapSchema>
type WithdrawForm = z.infer<typeof withdrawSchema>

const TOKENS = ['BRL', 'BTC', 'ETH', 'USDT', 'USDC']

export default function DashboardPage() {
  const { userId } = useAuthStore()
  const [balances, setBalances] = useState<Balance[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [activeTab, setActiveTab] = useState<'swap' | 'withdraw' | 'ledger'>('swap')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [balRes, ledRes] = await Promise.all([
        api.get('/wallet/balances'),
        api.get('/ledger?limit=10'),
      ])
      setBalances(balRes.data.balances)
      setLedger(ledRes.data.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const swapForm = useForm<SwapForm>({
    resolver: zodResolver(swapSchema),
    defaultValues: { fromToken: 'BRL', toToken: 'USDT', amount: '' },
  })

  const withdrawForm = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { token: 'BRL', amount: '', destination: '' },
  })

  const onSwap = async (data: SwapForm) => {
    if (data.fromToken === data.toToken) return toast.error('Tokens devem ser diferentes')
    try {
      const res = await api.post('/swap', data)
      toast.success(`Swap realizado! Recebido: ${Number(res.data.toAmount).toFixed(6)} ${data.toToken}`)
      swapForm.reset({ fromToken: 'BRL', toToken: 'USDT', amount: '' })
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro no swap')
    }
  }

  const onWithdraw = async (data: WithdrawForm) => {
    try {
      await api.post('/withdrawal', data)
      toast.success('Saque realizado com sucesso!')
      withdrawForm.reset({ token: 'BRL', amount: '', destination: '' })
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro no saque')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Saldos */}
      <section>
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Saldos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {balances.map((b) => (
            <div key={b.token} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl mb-1">{TOKEN_ICONS[b.token]}</div>
              <div className="text-xs text-gray-400">{b.token}</div>
              <div className="text-sm font-semibold text-white mt-1">
                {Number(b.amount).toFixed(b.token === 'BTC' || b.token === 'ETH' ? 8 : 2)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-800">
          {(['swap', 'withdraw', 'ledger'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab === 'swap' ? '🔄 Swap' : tab === 'withdraw' ? '💸 Saque' : '📋 Extrato'}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* Swap */}
          {activeTab === 'swap' && (
            <form onSubmit={swapForm.handleSubmit(onSwap)} className="space-y-4 max-w-md">
              <p className="text-xs text-gray-400">Taxa de 1% aplicada em todos os swaps.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">De</label>
                  <select {...swapForm.register('fromToken')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    {TOKENS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Para</label>
                  <select {...swapForm.register('toToken')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    {TOKENS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                <input
                  {...swapForm.register('amount')}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" disabled={swapForm.formState.isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
                {swapForm.formState.isSubmitting ? 'Processando...' : 'Realizar Swap'}
              </button>
            </form>
          )}

          {/* Saque */}
          {activeTab === 'withdraw' && (
            <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} className="space-y-4 max-w-md">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token</label>
                  <select {...withdrawForm.register('token')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    {TOKENS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                  <input
                    {...withdrawForm.register('amount')}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Endereço de destino</label>
                <input
                  {...withdrawForm.register('destination')}
                  placeholder="0x... ou endereço da carteira"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" disabled={withdrawForm.formState.isSubmitting} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
                {withdrawForm.formState.isSubmitting ? 'Processando...' : 'Realizar Saque'}
              </button>
            </form>
          )}

          {/* Extrato */}
          {activeTab === 'ledger' && (
            <div className="space-y-2">
              {ledger.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação ainda.</p>
              )}
              {ledger.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                  <div>
                    <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      {e.type}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(e.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {Number(e.amount).toFixed(6)} {e.token}
                    </div>
                    <div className="text-xs text-gray-500">
                      → {Number(e.balanceAfter).toFixed(6)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>
    </div>
  )
}