'use client'

import { useChannel } from '@/hooks/use-channel'
import { MessageSquare, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChannelSwitcher({ className }: { className?: string }) {
  const { activeChannel, setActiveChannel } = useChannel()

  return (
    <div className={cn('p-2', className)}>
      <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/30 border border-border/50 rounded-lg text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveChannel('whatsapp')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all duration-150',
            activeChannel === 'whatsapp'
              ? 'bg-background text-[#008069] dark:text-[#25D366] shadow-sm font-bold border border-border/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
          )}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel('email')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all duration-150',
            activeChannel === 'email'
              ? 'bg-background text-[#0078D4] dark:text-[#2886DE] shadow-sm font-bold border border-border/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
          )}
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Email M365</span>
        </button>
      </div>
    </div>
  )
}
