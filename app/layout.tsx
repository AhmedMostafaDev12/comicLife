import type { Metadata } from 'next'
import './globals.css'
import Navbar from '../components/layout/Navbar'
import SessionProvider from '../components/layout/SessionProvider'

export const metadata: Metadata = {
  title: 'ComicLife',
  description: 'Turn your life into comics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
