"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [activeTab, setActiveTab] = useState<'qrcode' | 'phone_code'>('qrcode')
  const [loading, setLoading] = useState(false)
  const [pairingState, setPairingState] = useState<'connected' | 'connecting' | 'qrcode' | 'pairing_code' | 'disconnected'>('disconnected')
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [instanceName, setInstanceName] = useState<string>('')
  const [isGatewayReachable, setIsGatewayReachable] = useState(true)
  const [justConnected, setJustConnected] = useState(false)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevPairingStateRef = useRef<string>('disconnected')

  // Sync phone input when member changes
  useEffect(() => {
    if (member) {
      setPhoneInput(member.phone_number || member.whatsapp_phone_number || '')
    }
  }, [member])

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

          // If transitioning to connected from an active pairing flow (scanning or connecting or pairing_code)
          if (
            prevPairingStateRef.current === 'qrcode' ||
            prevPairingStateRef.current === 'pairing_code' ||
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

  // Request QR Code
  const requestQrCode = async () => {
    if (!member) return
    setLoading(true)
    setJustConnected(false)
    try {
      const res = await fetch('/api/gateway/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesMemberId: member.id, method: 'qrcode' }),
      })
      if (res.ok) {
        const data = await res.json()
        const state = data.pairingState || (data.qrcode ? 'qrcode' : 'connecting')
        setPairingState(state)
        prevPairingStateRef.current = state
        setQrcode(data.qrcode)
        setPairingCode(null)
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

  // Normalize phone number for WhatsApp
  const getNormalizedPhone = (raw: string) => {
    let digits = raw.replace(/[^0-9]/g, '')
    if (digits.startsWith('00')) digits = digits.slice(2)
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '92' + digits.slice(1)
    }
    return digits
  }

  // Request Phone Pairing Code
  const requestPairingCode = async () => {
    if (!member) return
    const cleanPhone = getNormalizedPhone(phoneInput)
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error('Please enter a valid phone number (e.g. 0300 1234567 or +92 300 1234567)')
      return
    }

    setLoading(true)
    setJustConnected(false)
    try {
      const res = await fetch('/api/gateway/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesMemberId: member.id,
          method: 'pairing_code',
          phoneNumber: cleanPhone,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const code = data.pairingCode
        setPairingCode(code)
        setPairingState('pairing_code')
        prevPairingStateRef.current = 'pairing_code'
        setInstanceName(data.instanceName)
        onStatusChanged?.()
        if (code) {
          toast.success('8-Digit Pairing Code Generated! Enter it on WhatsApp.')
        } else {
          toast.info('Connecting to WhatsApp pairing server. Fetching code...')
          setTimeout(() => fetchStatus(false), 2000)
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to request pairing code')
      }
    } catch {
      toast.error('Network error requesting pairing code')
    } finally {
      setLoading(false)
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
        setPairingCode(null)
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

  // Format 8-char code for display e.g. "AB12 - CD34"
  const rawCode = (pairingCode || '').replace(/[^a-zA-Z0-9]/g, '')
  const displayCodePart1 = rawCode.slice(0, 4)
  const displayCodePart2 = rawCode.slice(4, 8)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-5 text-primary" />
            <span>Connect WhatsApp: {member.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Link {member.name}'s phone line to Fortline CRM using QR Code or 8-digit Pairing Code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Member info banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border border-border text-xs">
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
                onClick={() => setActiveTab('qrcode')}
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
                onClick={() => setActiveTab('phone_code')}
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
          <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-muted/30 text-center min-h-[260px]">
            {loading ? (
              <div className="space-y-2 text-muted-foreground py-8">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs">Communicating with WhatsApp Gateway...</p>
              </div>
            ) : pairingState === 'connected' ? (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 py-2">
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="size-8" />
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
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    <span>Unlink Device</span>
                  </Button>
                </div>
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

                    {/* Large Code Display */}
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex gap-1">
                        {displayCodePart1.split('').map((char, i) => (
                          <span
                            key={`p1-${i}`}
                            className="size-10 rounded-lg bg-background border-2 border-emerald-500/60 font-mono font-bold text-lg text-foreground flex items-center justify-center shadow-xs"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                      <span className="text-xl font-bold text-muted-foreground px-1">-</span>
                      <div className="flex gap-1">
                        {displayCodePart2.split('').map((char, i) => (
                          <span
                            key={`p2-${i}`}
                            className="size-10 rounded-lg bg-background border-2 border-emerald-500/60 font-mono font-bold text-lg text-foreground flex items-center justify-center shadow-xs"
                          >
                            {char}
                          </span>
                        ))}
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
                        className="text-xs gap-1.5 h-8 text-muted-foreground"
                      >
                        <RefreshCw className="size-3.5" />
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
                      <Label htmlFor="phone-pair-input" className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                        <span>WhatsApp Phone Number:</span>
                        {phoneInput.trim() && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                            Pairs as: +{getNormalizedPhone(phoneInput)}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Phone className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="phone-pair-input"
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="0300 1234567 or +92 300 1234567"
                          className="pl-8 text-xs font-mono h-9"
                        />
                      </div>

                      {/* Quick country code chips */}
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                        <span className="text-[10px]">Quick:</span>
                        <button
                          type="button"
                          onClick={() => setPhoneInput((p) => (p.startsWith('+92') ? p : `+92 ${p.replace(/^0/, '')}`.trim()))}
                          className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-mono border border-border"
                        >
                          🇵🇰 +92 (PK)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhoneInput((p) => (p.startsWith('+971') ? p : `+971 ${p.replace(/^0/, '')}`.trim()))}
                          className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-mono border border-border"
                        >
                          🇦🇪 +971 (UAE)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhoneInput((p) => (p.startsWith('+1') ? p : `+1 ${p}`.trim()))}
                          className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-mono border border-border"
                        >
                          🇺🇸 +1 (US)
                        </button>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={requestPairingCode}
                      className="w-full gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs mt-2"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Generate 8-Digit Pairing Code</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 1: SCAN QR CODE */
              <div className="space-y-3">
                {qrcode ? (
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
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Generate QR Code</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 p-3 rounded-lg bg-card border border-border text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span>
                {activeTab === 'phone_code'
                  ? `How ${member.name} pairs using phone number:`
                  : `How ${member.name} scans QR code in 10 seconds:`}
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
                <li>Type the 8-character code shown above into WhatsApp.</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1 leading-relaxed">
                <li>Open WhatsApp on <strong>{member.name}</strong>'s phone.</li>
                <li>Tap <strong>Settings</strong> (iPhone) or <strong>Three Dots (⋮)</strong> (Android).</li>
                <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>.</li>
                <li>Point the phone's camera at the QR code above.</li>
              </ol>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
          <div>
            {activeTab === 'qrcode' && qrcode && pairingState !== 'connected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestQrCode}
                disabled={loading}
                className="text-xs gap-1"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh QR</span>
              </Button>
            )}
            {activeTab === 'phone_code' && pairingCode && pairingState !== 'connected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestPairingCode}
                disabled={loading}
                className="text-xs gap-1"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>New Pairing Code</span>
              </Button>
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

