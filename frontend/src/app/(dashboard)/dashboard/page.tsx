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
const TOKENS = ['BRL', 'BTC', 'ETH', 'USDT', 'USDC']

type Balance = { token: string; amount: string }
type LedgerEntry = {
  id: string; type: string; token: string; amount: string
  balanceBefore: string; balanceAfter: string; createdAt: string
}
type Transaction = {
  id: string; type: string; fromToken: string | null; toToken: string | null
  fromAmount: string | null; toAmount: string | null; feeAmount: string | null
  createdAt: string
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
const depositSchema = z.object({
  token: z.string(),
  amount: z.string().min(1),
})

type SwapForm = z.infer<typeof swapSchema>
type WithdrawForm = z.infer<typeof withdrawSchema>
type DepositForm = z.infer<typeof depositSchema>

type QuoteResult = {
  fromToken: string; toToken: string; fromAmount: string
  toAmount: string; fee: string; feePercent: string; rate: string
}

export default function DashboardPage() {
  const { userId } = useAuthStore()
  const [balances, setBalances] = useState<Balance[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<'swap' | 'withdraw' | 'deposit' | 'ledger' | 'transactions'>('swap')
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [quoting, setQuoting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [balRes, ledRes, txRes] = await Promise.all([
        api.get('/wallet/balances'),
        api.get('/ledger?limit=10'),
        api.get('/transactions?limit=10'),
      ])
      setBalances(balRes.data.balances)
      setLedger(ledRes.data.data)
      setTransactions(txRes.data.data)
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
  const depositForm = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: { token: 'BRL', amount: '' },
  })

  // Cotação em tempo real ao digitar
  const watchFrom = swapForm.watch('fromToken')
  const watchTo = swapForm.watch('toToken')
  const watchAmount = swapForm.watch('amount')

  useEffect(() => {
    if (!watchAmount || isNaN(Number(watchAmount)) || Number(watchAmount) <= 0) {
      setQuote(null)
      return
    }
    const timeout = setTimeout(async () => {
      try {
        setQuoting(true)
        const res = await api.get('/swap/quote', {
          params: { fromToken: watchFrom, toToken: watchTo, amount: watchAmount },
        })
        setQuote(res.data)
      } catch {
        setQuote(null)
      } finally {
        setQuoting(false)
      }
    }, 600)
    return () => clearTimeout(timeout)
  }, [watchFrom, watchTo, watchAmount])

  const onSwap = async (data: SwapForm) => {
    if (data.fromToken === data.toToken) return toast.error('Tokens devem ser diferentes')
    try {
      const res = await api.post('/swap', data)
      toast.success(`Swap realizado! Recebido: ${Number(res.data.toAmount).toFixed(6)} ${data.toToken}`)
      swapForm.reset({ fromToken: 'BRL', toToken: 'USDT', amount: '' })
      setQuote(null)
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

  const onDeposit = async (data: DepositForm) => {
    if (!userId) return toast.error('Usuário não identificado')
    try {
      await api.post('/webhook/deposit', {
        idempotencyKey: `sim-${userId}-${Date.now()}`,
        userId,
        token: data.token,
        amount: data.amount,
      })
      toast.success(`Depósito de ${data.amount} ${data.token} simulado com sucesso!`)
      depositForm.reset({ token: 'BRL', amount: '' })
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao simular depósito')
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
        <div className="flex border-b border-gray-800 overflow-x-auto">
          {([
            { key: 'swap', label: '🔄 Swap' },
            { key: 'withdraw', label: '💸 Saque' },
            { key: 'deposit', label: '🧪 Simular Depósito' },
            { key: 'ledger', label: '📋 Extrato' },
            { key: 'transactions', label: '🔁 Transações' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* Swap */}
          {activeTab === 'swap' && (
            <form onSubmit={swapForm.handleSubmit(onSwap)} className="space-y-4 max-w-md">
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

              {/* Preview da cotação */}
              {quoting && (
                <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-400">
                  Buscando cotação na CoinGecko...
                </div>
              )}
              {quote && !quoting && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Você recebe</span>
                    <span className="text-white font-semibold">{Number(quote.toAmount).toFixed(6)} {quote.toToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa (1.5%)</span>
                    <span className="text-red-400">- {Number(quote.fee).toFixed(6)} {quote.fromToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cotação</span>
                    <span className="text-gray-300">1 {quote.fromToken} = {Number(quote.rate).toFixed(6)} {quote.toToken}</span>
                  </div>
                  <p className="text-xs text-gray-500 pt-1">Cotação via CoinGecko · Cache de 60s</p>
                </div>
              )}

              <button
                type="submit"
                disabled={swapForm.formState.isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
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
              <button
                type="submit"
                disabled={withdrawForm.formState.isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {withdrawForm.formState.isSubmitting ? 'Processando...' : 'Realizar Saque'}
              </button>
            </form>
          )}

          {/* Simular Depósito */}
          {activeTab === 'deposit' && (
            <div className="max-w-md space-y-4">
              {/* Banner explicativo */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-1">
                <p className="text-yellow-400 text-sm font-medium">🧪 Ambiente de demonstração</p>
                <p className="text-yellow-300/70 text-xs leading-relaxed">
                  Em produção, depósitos são notificados automaticamente por um serviço externo via
                  webhook (<code className="bg-yellow-500/10 px-1 rounded">POST /api/webhook/deposit</code>).
                  Este painel simula essa notificação para fins de teste, chamando o mesmo endpoint
                  com uma <strong>idempotencyKey</strong> única gerada automaticamente.
                </p>
              </div>

              <form onSubmit={depositForm.handleSubmit(onDeposit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Token</label>
                    <select {...depositForm.register('token')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                      {TOKENS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                    <input
                      {...depositForm.register('amount')}
                      placeholder="0.00"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={depositForm.formState.isSubmitting}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  {depositForm.formState.isSubmitting ? 'Simulando...' : 'Simular Depósito via Webhook'}
                </button>
              </form>
            </div>
          )}

          {/* Extrato */}
          {activeTab === 'ledger' && (
            <div className="space-y-2">
              {ledger.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Nenhuma movimentação ainda.</p>
              )}
              {ledger.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                  <div>
                    <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{e.type}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(e.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{Number(e.amount).toFixed(6)} {e.token}</div>
                    <div className="text-xs text-gray-500">saldo → {Number(e.balanceAfter).toFixed(6)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transações */}
          {activeTab === 'transactions' && (
            <div className="space-y-2">
              {transactions.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação ainda.</p>
              )}
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                  <div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      t.type === 'DEPOSIT' ? 'bg-green-900 text-green-300' :
                      t.type === 'SWAP' ? 'bg-blue-900 text-blue-300' :
                      'bg-red-900 text-red-300'
                    }`}>{t.type}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="text-right text-sm">
                    {t.type === 'DEPOSIT' && (
                      <span className="text-green-400">+{Number(t.toAmount).toFixed(6)} {t.toToken}</span>
                    )}
                    {t.type === 'SWAP' && (
                      <span className="text-blue-400">
                        {Number(t.fromAmount).toFixed(6)} {t.fromToken} → {Number(t.toAmount).toFixed(6)} {t.toToken}
                      </span>
                    )}
                    {t.type === 'WITHDRAWAL' && (
                      <span className="text-red-400">-{Number(t.fromAmount).toFixed(6)} {t.fromToken}</span>
                    )}
                    {t.feeAmount && Number(t.feeAmount) > 0 && (
                      <div className="text-xs text-gray-500">taxa: {Number(t.feeAmount).toFixed(6)}</div>
                    )}
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