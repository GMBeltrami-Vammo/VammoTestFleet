import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Vammo — Dev Fleet',
  description: 'Fleet management dashboard for development parts tracking',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        {user && (
          <header className="flex items-center justify-end gap-3 border-b border-border px-4 py-2 text-sm text-muted-foreground">
            <span>{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Sair
              </button>
            </form>
          </header>
        )}
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
