"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  QrCode,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Info,
  LogOut,
  AlertTriangle,
  KeyRound,
  Copy,
  Check,
  Phone,
  Sparkles,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { FortlineSalesMember } from '@/types/fortline'
import { purgeClientChatSession } from '@/lib/auth/session-purge'

interface SalesChannelQrDialogProps {
  member: FortlineSalesMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: () => void;
}

const COUNTDOWN_SECONDS = 60;

export function SalesChannelQrDialog({
  member,
  open,
  onOpenChange,
  onStatusChanged,
}: SalesChannelQrDialogProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'qrcode' | 'phone_code'>('qrcode')
  const [initialLoading, setInitialLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [pairingState, setPairingState] = useState<
    'connected' | 'connecting' | 'qrcode' | 'pairing_code' | 'disconnected' | 'expired'
  >('disconnected')
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [instanceName, setInstanceName] = useState<string>('')
  const [isGatewayReachable, setIsGatewayReachable] = useState(true)
  const [justConnected, setJustConnected] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(COUNTDOWN_SECONDS)

  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevPairingStateRef = useRef<string>('disconnected')
  const onStatusChangedRef = useRef(onStatusChanged)
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onStatusChangedRef.current = onStatusChanged
    onOpenChangeRef.current = onOpenChange
  })

  // Sync phone input when member changes
  useEffect(() => {
    if (member) {
      setPhoneInput(member.phone_number || member.whatsapp_phone_number || '')
    }
  }, [member])

  const memberId = member?.id
  const memberName = member?.name

  // Stable status check function - does NOT depend on secondsRemaining
  const fetchStatus = useCallback(async (isInitial = false) => {
    if (!memberId) return
    if (isInitial) setInitialLoading(true)

    try {
      const res = await fetch(`/api/gateway/instance?salesMemberId=${memberId}`)
      if (res.ok) {
        const data = await res.json()
        const nextState = data.pairingState

        setPairingState((current) => {
          if (nextState === 'connected') return 'connected'
          if (current === 'expired') return 'expired'
          return nextState || current
        })

        if (data.qrcode) {
          setQrcode((prev) => {
            if (prev !== data.qrcode) {
              setSecondsRemaining(COUNTDOWN_SECONDS)
            }
            return data.qrcode
          })
        }
        if (data.pairingCode) {
          setPairingCode((prev) => {
            if (prev !== data.pairingCode) {
              setSecondsRemaining(COUNTDOWN_SECONDS)
            }
            return data.pairingCode
          })
        }
        setInstanceName(data.instanceName)
        setIsGatewayReachable(data.isGatewayReachable ?? true)

        if (nextState === 'connected') {
          onStatusChangedRef.current?.()

          // Celebration & auto-close when transitioning to connected
          if (
            prevPairingStateRef.current === 'qrcode' ||
            prevPairingStateRef.current === 'pairing_code' ||
            prevPairingStateRef.current === 'connecting'
          ) {
            setJustConnected(true)
            toast.success(`🎉 ${memberName || 'Sales Member'}'s WhatsApp connected successfully!`, {
              description: 'Syncing live chats into CRM...',
            })

            // Immediately set sales member to active and online in CRM
            fetch('/api/fortline/presence', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ salesMemberId: memberId, status: 'online' }),
            }).catch(() => {})

            // Trigger background chat sync into CRM
            fetch('/api/gateway/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ salesMemberId: memberId }),
            }).catch(() => {})

            // Auto-close dialog after 1.2 seconds
            if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
            autoCloseTimeoutRef.current = setTimeout(() => {
              onOpenChangeRef.current?.(false)
            }, 1200)
          }
        }
        prevPairingStateRef.current = nextState
      }
    } catch {
      // Network error
    } finally {
      if (isInitial) setInitialLoading(false)
    }
  }, [memberId, memberName])

  // Independent 60s countdown timer - isolated to prevent modal re-renders
  useEffect(() => {
    if (!open) {
      setSecondsRemaining(COUNTDOWN_SECONDS)
      setQrcode(null)
      setPairingCode(null)
      setPairingState('disconnected')
      return
    }

    if (pairingState === 'connected' || pairingState === 'expired') return
    if (!qrcode && !pairingCode) return

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setPairingState('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, qrcode, pairingCode, pairingState])

  // Dialog open & background polling effect - stable and runs once per open
  useEffect(() => {
    if (open && memberId) {
      setJustConnected(false)
      prevPairingStateRef.current = 'disconnected'
      setSecondsRemaining(COUNTDOWN_SECONDS)

      // Initial fetch on modal open
      fetchStatus(true)

      // Poll every 2.5s in the background to detect phone camera scan or OTP approval
      const pollTimer = setInterval(() => {
        fetchStatus(false)
      }, 2500)

      return () => {
        clearInterval(pollTimer)
        if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
      }
    }
  }, [open, memberId, fetchStatus])

  // Request / Refresh QR Code (in-place without page reload or full spinner)
  const requestQrCode = async () => {
    if (!member) return
    setActionLoading(true)
    setJustConnected(false)
    setPairingState('connecting')
    try {
      const res = await fetch('/api/gateway/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesMemberId: member.id, method: 'qrcode', refresh: true }),
      })
      if (res.ok) {
        const data = await res.json()
        const state = data.pairingState || (data.qrcode ? 'qrcode' : 'connecting')
        setPairingState(state)
        prevPairingStateRef.current = state
        setQrcode(data.qrcode)
        setPairingCode(null)
        setInstanceName(data.instanceName)
        setSecondsRemaining(COUNTDOWN_SECONDS)
        if (data.qrcode) {
          toast.success('Generated fresh WhatsApp QR code! Valid for 60s.')
        } else {
          toast.info('Starting WhatsApp gateway session. QR code incoming...')
          setTimeout(() => fetchStatus(false), 1200)
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to generate QR code')
        setPairingState('expired')
      }
    } catch {
      toast.error('Network error requesting QR code')
      setPairingState('expired')
    } finally {
      setActionLoading(false)
    }
  }

  // Request Phone Pairing Code (8-digit OTP)
  const requestPairingCode = async () => {
    if (!member) return
    let cleanPhone = phoneInput.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.slice(2)
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '92' + cleanPhone.slice(1)
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error('Please enter a valid phone number (e.g. +92 331 3081859 or 03313081859)')
      return
    }

    setActionLoading(true)
    setJustConnected(false)
    setPairingState('connecting')
    try {
      const res = await fetch('/api/gateway/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesMemberId: member.id,
          method: 'pairing_code',
          phoneNumber: cleanPhone,
          refresh: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const code = data.pairingCode
        if (code) {
          setPairingCode(code)
          setPairingState('pairing_code')
          prevPairingStateRef.current = 'pairing_code'
          setSecondsRemaining(COUNTDOWN_SECONDS)
          toast.success('Fresh 8-Digit Pairing Code Generated! Valid for 60s.')
        } else {
          setPairingState('connecting')
          toast.info('Generating WhatsApp pairing code... Please wait 2 seconds')
          setTimeout(() => fetchStatus(false), 1500)
        }
        setInstanceName(data.instanceName)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to request pairing code')
        setPairingState('expired')
      }
    } catch {
      toast.error('Network error requesting pairing code')
      setPairingState('expired')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (!pairingCode) return
    const formatted = pairingCode.replace(/[^a-zA-Z0-9]/g, '')
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    toast.success('Pairing code copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Disconnect & strictly purge client-side session cache
  const handleDisconnect = async () => {
    if (!member) return
    if (!confirm(`Disconnect WhatsApp session for ${member.name}?`)) return
    setActionLoading(true)
    setJustConnected(false)
    try {
      // 1. Purge client storage for this line
      purgeClientChatSession(member.id)

      // 2. Instruct backend & Evolution API to log out session
      const res = await fetch(`/api/gateway/instance?salesMemberId=${member.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Disconnected ${member.name} & purged local chat cache`)
        setPairingState('disconnected')
        prevPairingStateRef.current = 'disconnected'
        setQrcode(null)
        setPairingCode(null)
        onStatusChangedRef.current?.()
      } else {
        toast.error('Failed to disconnect')
      }
    } catch {
      toast.error('Network error during disconnect')
    } finally {
      setActionLoading(false)
    }
  }

  if (!member) return null

  // Format 8-char code for display e.g. "AB12 - CD34"
  const rawCode = (pairingCode || '').replace(/[^a-zA-Z0-9]/g, '')
  const displayCodePart1 = rawCode.slice(0, 4)
  const displayCodePart2 = rawCode.slice(4, 8)
  const countdownProgress = Math.max(0, Math.min(100, (secondsRemaining / COUNTDOWN_SECONDS) * 100))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92dvh] sm:max-h-[88dvh] flex flex-col p-0 overflow-hidden shadow-2xl border-border bg-card">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 shrink-0 bg-background/95 backdrop-blur-xs pr-10 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-5 text-primary" />
            <span>Connect WhatsApp: {member.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Link {member.name}'s phone line to Fortline CRM using live QR Code or 8-digit Pairing Code.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-5 py-3.5 overflow-y-auto flex-1 space-y-3.5 overscroll-contain">
          {/* Member info banner */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/60 border border-border text-xs">
            <div>
              <div className="font-semibold text-foreground">{member.name}</div>
              <div className="text-muted-foreground font-mono">{member.phone_number || 'No default number'}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] px-2 py-0.5 rounded bg-background border border-border font-medium text-foreground">
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
                The WhatsApp Gateway is not responding. If running locally, start it via:
                <br />
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">docker compose -f docker-compose.gateway.yml up -d</code>
              </p>
            </div>
          )}

          {/* Connection Method Switcher (When not connected) */}
          {pairingState !== 'connected' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qrcode')
                  if (pairingState === 'expired') requestQrCode()
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all ${
                  activeTab === 'qrcode'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <QrCode className="size-3.5 text-primary" />
                <span>Scan QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('phone_code')
                  if (pairingState === 'expired') requestPairingCode()
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all ${
                  activeTab === 'phone_code'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <KeyRound className="size-3.5 text-emerald-500" />
                <span>Pair with Phone Number</span>
              </button>
            </div>
          )}

          {/* Main Display Area */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border border-border bg-muted/30 text-center min-h-[260px]">
            {initialLoading && !qrcode && !pairingCode ? (
              <div className="space-y-2 text-muted-foreground py-8">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs">Initializing WhatsApp session...</p>
              </div>
            ) : pairingState === 'connected' ? (
              /* CONNECTED STATE WITH AUTO-CLOSE */
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 py-2">
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {justConnected ? '🎉 WhatsApp Connected Successfully!' : 'Device Connected & Monitoring'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
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
                    disabled={actionLoading}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    <span>Unlink Device</span>
                  </Button>
                </div>
              </div>
            ) : pairingState === 'expired' ? (
              /* EXPIRED STATE (60S TIMEOUT REACHED) */
              <div className="space-y-3.5 py-6 animate-in fade-in zoom-in-95 text-center">
                <div className="size-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-xs animate-pulse">
                  <Clock className="size-7" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold border border-amber-500/20 mb-1">
                    <AlertTriangle className="size-3" />
                    <span>60-Second Window Expired</span>
                  </div>
                  <h4 className="font-bold text-foreground text-base">
                    {activeTab === 'phone_code' ? 'Pairing Code Expired' : 'QR Code Expired'}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {activeTab === 'phone_code'
                      ? 'The 8-character pairing code has expired. WhatsApp pairing codes are valid for only 60 seconds. Click below to generate a fresh new code.'
                      : 'The WhatsApp QR code has expired. WhatsApp QR codes refresh periodically for security. Click below to generate a fresh QR code.'}
                  </p>
                </div>
                <Button
                  size="default"
                  onClick={activeTab === 'phone_code' ? requestPairingCode : requestQrCode}
                  disabled={actionLoading}
                  className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5"
                >
                  <RefreshCw className={`size-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {actionLoading
                      ? 'Generating New Code...'
                      : activeTab === 'phone_code'
                        ? 'Generate New Pairing Code'
                        : 'Generate New QR Code'}
                  </span>
                </Button>
              </div>
            ) : activeTab === 'phone_code' ? (
              /* TAB 2: PAIR WITH PHONE NUMBER */
              <div className="w-full space-y-4 py-1">
                {rawCode ? (
                  /* Display Generated 8-Digit Pairing Code */
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-xs text-muted-foreground">
                      Enter this 8-character code on <span className="font-semibold text-foreground">{member.name}'s WhatsApp</span>:
                    </div>

                    {/* Responsive Code Display */}
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <div className="flex gap-1 sm:gap-1.5">
                        {displayCodePart1.split('').map((char, i) => (
                          <span
                            key={`p1-${i}`}
                            className="w-7 h-9 sm:w-9 sm:h-11 rounded-lg bg-background border-2 border-emerald-500/60 font-mono font-bold text-base sm:text-lg text-foreground flex items-center justify-center shadow-xs"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                      <span className="text-xl font-bold text-muted-foreground px-0.5 sm:px-1">-</span>
                      <div className="flex gap-1 sm:gap-1.5">
                        {displayCodePart2.split('').map((char, i) => (
                          <span
                            key={`p2-${i}`}
                            className="w-7 h-9 sm:w-9 sm:h-11 rounded-lg bg-background border-2 border-emerald-500/60 font-mono font-bold text-base sm:text-lg text-foreground flex items-center justify-center shadow-xs"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 60-Second Timer Progress */}
                    <div className="max-w-xs mx-auto space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3 text-emerald-500" />
                          <span>Code expires in: {secondsRemaining}s</span>
                        </span>
                        <span className="text-[10px] font-mono">{Math.round(countdownProgress)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-1000 rounded-full"
                          style={{ width: `${countdownProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCopyCode}
                        className="text-xs gap-1.5 h-8 font-medium"
                      >
                        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={requestPairingCode}
                        disabled={actionLoading}
                        className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className={`size-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                        <span>New Code</span>
                      </Button>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                      <Loader2 className="size-3 animate-spin text-emerald-500" />
                      <span>Waiting for code confirmation on phone...</span>
                    </div>
                  </div>
                ) : (
                  /* Request Pairing Code Form */
                  <div className="space-y-3 max-w-sm mx-auto">
                    <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <KeyRound className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">Pair via 8-Digit Code</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        No camera required. Enter sales member's WhatsApp number to get an instant pairing code.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="phone-pair-input" className="text-xs text-muted-foreground font-medium">
                        WhatsApp Phone Number (with Country Code):
                      </Label>
                      <div className="relative">
                        <Phone className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="phone-pair-input"
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+92 300 1234567"
                          className="pl-8 text-xs font-mono h-9"
                        />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={requestPairingCode}
                      disabled={actionLoading}
                      className="w-full gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Negotiating Pairing Code...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          <span>Generate 8-Digit Pairing Code</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 1: SCAN QR CODE */
              <div className="space-y-3">
                {qrcode ? (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-md inline-block relative group">
                      <img
                        src={qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`}
                        alt="WhatsApp QR Code"
                        className="size-48 sm:size-52 rounded-lg object-contain"
                      />
                      {actionLoading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                          <Loader2 className="size-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>

                    {/* 60-Second Timer Progress */}
                    <div className="max-w-xs mx-auto space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3 text-primary" />
                          <span>QR valid for: {secondsRemaining}s</span>
                        </span>
                        <span className="text-[10px] font-mono">{Math.round(countdownProgress)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border">
                        <div
                          className="h-full bg-primary transition-all duration-1000 rounded-full"
                          style={{ width: `${countdownProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin text-primary" />
                      <span>Waiting for camera scan on phone...</span>
                    </div>
                  </div>
                ) : pairingState === 'connecting' ? (
                  <div className="space-y-3 py-6">
                    <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">Initializing WhatsApp Session...</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        Connecting to WhatsApp for {member.name}. The QR code will appear in seconds...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="size-12 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center mx-auto">
                      <QrCode className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">Scan QR Code</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        Generate a secure WhatsApp QR code for {member.name} to scan with their camera.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={requestQrCode}
                      disabled={actionLoading}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <RefreshCw className={`size-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                      <span>Generate QR Code</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions (With 60-Second Window Reference) */}
          <div className="space-y-2 p-3 rounded-lg bg-card border border-border text-xs text-left">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span>
                {activeTab === 'phone_code'
                  ? `How ${member.name} pairs using phone number (within 60 seconds):`
                  : `How ${member.name} links WhatsApp (within 60 seconds / 1 min):`}
              </span>
            </div>

            {activeTab === 'phone_code' ? (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1 leading-relaxed">
                <li>Open WhatsApp on <strong>{member.name}</strong>'s phone.</li>
                <li>Tap <strong>Settings</strong> (iPhone) or <strong>Three Dots (⋮)</strong> (Android).</li>
                <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>.</li>
                <li>
                  Tap <span className="font-semibold text-foreground">"Link with phone number instead"</span> at the bottom of the phone screen.
                </li>
                <li>Type the 8-character code shown above into WhatsApp before the 60-second timer expires.</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1 leading-relaxed">
                <li>Open WhatsApp on <strong>{member.name}</strong>'s phone.</li>
                <li>Tap <strong>Settings</strong> (iPhone) or <strong>Three Dots (⋮)</strong> (Android).</li>
                <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>.</li>
                <li>Point the phone's camera at the QR code above before the 60-second timer expires.</li>
              </ol>
            )}
          </div>
        </div>

        <DialogFooter className="p-3 sm:p-4 pt-2.5 border-t border-border/60 shrink-0 bg-background/95 backdrop-blur-xs flex items-center justify-between gap-2">
          <div>
            {pairingState === 'expired' ? (
              <Button
                size="sm"
                onClick={activeTab === 'phone_code' ? requestPairingCode : requestQrCode}
                disabled={actionLoading}
                className="text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <RefreshCw className={`size-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>
                  {activeTab === 'phone_code' ? 'Generate New Code' : 'Generate New QR Code'}
                </span>
              </Button>
            ) : (
              <>
                {activeTab === 'qrcode' && qrcode && pairingState !== 'connected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestQrCode}
                    disabled={actionLoading}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className={`size-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh QR</span>
                  </Button>
                )}
                {activeTab === 'phone_code' && pairingCode && pairingState !== 'connected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestPairingCode}
                    disabled={actionLoading}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className={`size-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>New Pairing Code</span>
                  </Button>
                )}
              </>
            )}
          </div>
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
