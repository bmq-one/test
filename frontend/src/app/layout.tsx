import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Newsletter - Dein persönlicher KI-Newsletter',
  description: 'Automatisch kuratierte Newsletter über künstliche Intelligenz mit persönlichem Stil',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="bg-white border-t mt-16">
            <div className="container mx-auto px-4 py-6 text-center text-gray-600">
              <p>&copy; {new Date().getFullYear()} AI Newsletter Tool. Powered by AI.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
