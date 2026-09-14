'use client'

import { useChannel } from '@/hooks/use-channel'
import { MessageCircle, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChannelSwitcher({ className }: { className?: string }) {
  const { activeChannel, setActiveChannel } = useChannel()

  return (
    <div className={cn('p-2', className)}>
      <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/30 border border-border/50 rounded-full text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveChannel('whatsapp')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full transition-all duration-150',
            activeChannel === 'whatsapp'
              ? 'bg-background text-[#008069] dark:text-[#25D366] shadow-sm font-bold border border-emerald-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
          )}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('email')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full transition-all duration-150',
            activeChannel === 'email'
              ? 'bg-background text-[#2B60DE] dark:text-[#2B60DE] shadow-sm font-bold border border-blue-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
          )}
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Email</span>
        </button>
      </div>
    </div>
  )
}
