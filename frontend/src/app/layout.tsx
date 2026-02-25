import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nexus Crypto Wallet',
  description: 'Sua carteira cripto segura',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
          }}
        />
      </body>
    </html>
  )
}