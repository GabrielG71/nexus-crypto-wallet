export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">₿ Nexus Wallet</h1>
          <p className="text-gray-400 mt-1">Sua carteira cripto segura</p>
        </div>
        {children}
      </div>
    </main>
  )
}