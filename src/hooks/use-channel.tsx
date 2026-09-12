'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type CrmChannel = 'whatsapp' | 'email'

interface ChannelContextType {
  activeChannel: CrmChannel
  setActiveChannel: (channel: CrmChannel) => void
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined)

const CHANNEL_STORAGE_KEY = 'fortline_active_channel'

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [activeChannel, setActiveChannelState] = useState<CrmChannel>('whatsapp')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(CHANNEL_STORAGE_KEY) as CrmChannel | null
    if (stored === 'whatsapp' || stored === 'email') {
      setActiveChannelState(stored)
    } else if (pathname.startsWith('/email')) {
      setActiveChannelState('email')
    }
  }, [pathname])

  // Sync state with current pathname if navigating directly
  useEffect(() => {
    if (!mounted) return
    if (pathname.startsWith('/email') && activeChannel !== 'email') {
      setActiveChannelState('email')
      localStorage.setItem(CHANNEL_STORAGE_KEY, 'email')
    } else if (
      (pathname === '/dashboard' || pathname === '/inbox') &&
      activeChannel !== 'whatsapp'
    ) {
      setActiveChannelState('whatsapp')
      localStorage.setItem(CHANNEL_STORAGE_KEY, 'whatsapp')
    }
  }, [pathname, mounted, activeChannel])

  const setActiveChannel = (channel: CrmChannel) => {
    setActiveChannelState(channel)
    if (typeof window !== 'undefined') {
      localStorage.setItem(CHANNEL_STORAGE_KEY, channel)
    }

    if (channel === 'email') {
      router.push('/email/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <ChannelContext.Provider value={{ activeChannel, setActiveChannel }}>
      {children}
    </ChannelContext.Provider>
  )
}

export function useChannel() {
  const context = useContext(ChannelContext)
  if (!context) {
    throw new Error('useChannel must be used within a ChannelProvider')
  }
  return context
}
