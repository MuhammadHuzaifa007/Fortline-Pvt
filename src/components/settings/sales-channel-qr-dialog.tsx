"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  QrCode,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Smartphone,
  Info,
  LogOut,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { FortlineSalesMember } from '@/types/fortline'

interface SalesChannelQrDialogProps {
  member: FortlineSalesMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: () => void;
}

export function SalesChannelQrDialog({
  member,
  open,
  onOpenChange,
  onStatusChanged,
}: SalesChannelQrDialogProps) {
  const [loading, setLoading] = useState(false)
  const [pairingState, setPairingState] = useState<'connected' | 'connecting' | 'qrcode' | 'disconnected'>('disconnected')
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string>('')
  const [isGatewayReachable, setIsGatewayReachable] = useState(true)
  const [justConnected, setJustConnected] = useState(false)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevPairingStateRef = useRef<string>('disconnected')

  const fetchStatus = useCallback(async (isInitial = false) => {
    if (!member) return
    if (isInitial) setLoading(true)

    try {
      const res = await fetch(`/api/gateway/instance?salesMemberId=${member.id}`)
      if (res.ok) {
        const data = await res.json()
        const nextState = data.pairingState
        setPairingState(nextState)
        setQrcode(data.qrcode)
        setInstanceName(data.instanceName)
        setIsGatewayReachable(data.isGatewayReachable ?? true)

        if (nextState === 'connected') {
          onStatusChanged?.()

          // If transitioning to connected from an active pairing flow (scanning or connecting)
          if (
            prevPairingStateRef.current === 'qrcode' ||
            prevPairingStateRef.current === 'connecting'
          ) {
            setJustConnected(true)
            toast.success(`${member.name}'s WhatsApp connected successfully!`)

            // Trigger background chat sync into CRM
            fetch('/api/gateway/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ salesMemberId: member.id }),
            }).catch(() => {})

            // Auto-close dialog after 1.8 seconds celebration
            if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
            autoCloseTimeoutRef.current = setTimeout(() => {
              onOpenChange(false)
            }, 1800)
          }
        }
        prevPairingStateRef.current = nextState
      }
    } catch {
      // Network error
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [member, onOpenChange, onStatusChanged])

  const requestQrCode = async () => {
    if (!member) return
    setLoading(true)
    setJustConnected(false)
    try {
      const res = await fetch('/api/gateway/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesMemberId: member.id }),
      })
      if (res.ok) {
        const data = await res.json()
        const state = data.pairingState || (data.qrcode ? 'qrcode' : 'connecting')
        setPairingState(state)
        prevPairingStateRef.current = state
        setQrcode(data.qrcode)
        setInstanceName(data.instanceName)
        if (data.qrcode) {
          toast.success('Generated new QR code. Scan with WhatsApp!')
        } else {
          toast.info('Starting WhatsApp gateway session. QR code incoming...')
          setTimeout(() => fetchStatus(false), 1500)
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to generate QR code')
      }
    } catch {
      toast.error('Network error requesting QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!member) return
    if (!confirm(`Disconnect WhatsApp session for ${member.name}?`)) return
    setLoading(true)
    setJustConnected(false)
    try {
      const res = await fetch(`/api/gateway/instance?salesMemberId=${member.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Disconnected ${member.name}`)
        setPairingState('disconnected')
        prevPairingStateRef.current = 'disconnected'
        setQrcode(null)
        onStatusChanged?.()
      } else {
        toast.error('Failed to disconnect')
      }
    } catch {
      toast.error('Network error during disconnect')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && member) {
      setJustConnected(false)
      prevPairingStateRef.current = 'disconnected'
      fetchStatus(true)
      // Start polling every 3.5 seconds
      pollTimerRef.current = setInterval(() => {
        fetchStatus(false)
      }, 3500)
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
    }
  }, [open, member, fetchStatus])

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" />
            <span>Link Phone: {member.name}</span>
          </DialogTitle>
          <DialogDescription>
            Pair {member.name}'s WhatsApp phone with Fortline CRM via Linked Devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Member info banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border border-border text-xs">
            <div>
              <div className="font-semibold text-foreground">{member.name}</div>
              <div className="text-muted-foreground font-mono">{member.phone_number || 'No number configured'}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] px-2 py-0.5 rounded bg-background border border-border font-medium">
                {member.division || 'General Sales'}
              </span>
            </div>
          </div>

          {/* Gateway Warning if offline */}
          {!isGatewayReachable && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-4" />
                <span>Gateway Microservice Offline</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The local/VPS gateway container is not responding. Please start it using:
                <br />
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">docker compose -f docker-compose.gateway.yml up -d</code>
              </p>
            </div>
          )}

          {/* Main Display Area */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-border bg-muted/30 text-center min-h-[260px]">
            {loading ? (
              <div className="space-y-2 text-muted-foreground">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs">Communicating with WhatsApp Gateway...</p>
              </div>
            ) : pairingState === 'connected' ? (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="size-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {justConnected ? '🎉 WhatsApp Connected Successfully!' : 'Device Connected & Monitoring'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {justConnected
                      ? `Chats from ${member.name}'s phone are syncing to Fortline CRM. Closing window...`
                      : `All incoming and outgoing WhatsApp messages from ${member.name}'s phone are securely syncing to your CRM.`}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4"
                  >
                    Done
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    <span>Unlink / Disconnect Device</span>
                  </Button>
                </div>
              </div>
            ) : qrcode ? (
              <div className="space-y-3">
                <div className="p-2.5 bg-white rounded-xl shadow-md inline-block">
                  <img
                    src={qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`}
                    alt="WhatsApp QR Code"
                    className="size-52 rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin text-primary" />
                  <span>Waiting for scan from phone camera...</span>
                </div>
              </div>
            ) : pairingState === 'connecting' ? (
              <div className="space-y-3">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Generating WhatsApp QR Code...</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Connecting to WhatsApp session for {member.name}. The QR code will appear in just a few seconds...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="size-12 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center mx-auto">
                  <Smartphone className="size-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Ready to Connect</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Generate a single-use WhatsApp QR code for {member.name} to scan on their physical phone.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={requestQrCode}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Generate QR Code</span>
                </Button>
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 p-3 rounded-lg bg-card border border-border text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span>How {member.name} connects in 10 seconds:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1 leading-relaxed">
              <li>Open WhatsApp on the sales rep's phone.</li>
              <li>Tap <strong>Settings</strong> (iOS) or <strong>Three Dots (⋮)</strong> (Android).</li>
              <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>.</li>
              <li>Point the phone's camera at the QR code above.</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="pt-2">
          {qrcode && pairingState !== 'connected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestQrCode}
              disabled={loading}
              className="text-xs gap-1 mr-auto"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh QR</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
