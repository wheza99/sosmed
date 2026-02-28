'use client'

import { useUser } from '@/context/user-context'
import { Button } from '@/components/ui/button'
import { Item, ItemDescription, ItemTitle } from '@/components/ui/item'
import PabrikStartupChip from '@/components/marketing/chip'
import Link from 'next/link'

// X (Twitter) Logo SVG
function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function Home() {
  const { user, loading } = useUser()

  if (loading) {
    return null
  }

  return (
    <Item className="flex flex-col justify-center items-center text-center p-2 h-full max-w-5xl mx-auto">
      <PabrikStartupChip />

      <ItemTitle className="text-4xl md:text-6xl font-bold mt-6">
        Sosmed Online
      </ItemTitle>

      <ItemDescription className="text-lg md:text-xl max-w-xl">
        Schedule and manage your social media posts across multiple platforms with AI-powered content optimization.
      </ItemDescription>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        {user ? (
          <Button asChild size="lg" className="gap-2 bg-black hover:bg-gray-800">
            <Link href="/api/auth/x">
              <XLogo className="w-5 h-5" />
              Add Account
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="gap-2 bg-black hover:bg-gray-800">
            <Link href="/auth/login">
              <XLogo className="w-5 h-5" />
              Add Account
            </Link>
          </Button>
        )}
      </div>
    </Item>
  )
}
