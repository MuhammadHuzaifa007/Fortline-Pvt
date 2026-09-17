"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  QrCode,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Info,
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

interface SalesChannelQrDialogProps {
  member: FortlineSalesMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: () => void;
}

const COUNTDOWN_SECONDS = 60;
const MAX_POLL_DURATION_MS = 120000; // 2 minutes timeout

export type LinkUiState =
  | 'preparing'
  | 'waiting_for_scan'
  | 'waiting_for_pairing'
  | 'connected'
  | 'error';

export function extractQrImageSrc(qrData: unknown): string | null {
  if (!qrData) return null;
  if (typeof qrData === 'string') {
    if (qrData.startsWith('data:image')) return qrData;
    return `data:image/png;base64,${qrData}`;
  }
  if (typeof qrData === 'object' && qrData !== null) {
    const obj = qrData as Record<string, unknown>;
    const rawBase64 =
      (typeof obj.base64 === 'string' && obj.base64) ||
      (typeof (obj.qrcode as Record<string, unknown>)?.base64 === 'string' &&
        (obj.qrcode as Record<string, unknown>).base64);

    if (typeof rawBase64 === 'string' && rawBase64) {
      if (rawBase64.startsWith('data:image')) return rawBase64;
      return `data:image/png;base64,${rawBase64}`;
    }

    const rawCode =
      (typeof obj.code === 'string' && obj.code) ||
      (typeof (obj.qrcode as Record<string, unknown>)?.code === 'string' &&
        (obj.qrcode as Record<string, unknown>).code);

    if (typeof rawCode === 'string' && rawCode) {
      if (rawCode.startsWith('data:image')) return rawCode;
      if (rawCode.length > 100) return `data:image/png;base64,${rawCode}`;
    }
  }
  return null;
}

export function SalesChannelQrDialog({
  member,
  open,
  onOpenChange,
  onStatusChanged,
}: SalesChannelQrDialogProps) {
  const [activeTab, setActiveTab] = useState<'qrcode' | 'phone_code'>('qrcode')
  const [uiState, setUiState] = useState<LinkUiState>('preparing')
  const [actionLoading, setActionLoading] = useState(false)
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(COUNTDOWN_SECONDS)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollStartRef = useRef<number>(0)
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onStatusChangedRef = useRef(onStatusChanged)
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onStatusChangedRef.current = onStatusChanged
    onOpenChangeRef.current = onOpenChange
  })

  // Prefill phone when member opens
  useEffect(() => {
    if (member) {
      setPhoneInput(member.phone_number || member.whatsapp_phone_number || '')
    }
  }, [member])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Poll connection status
  const startPolling = useCallback((memberId: string) => {
    stopPolling()
    pollStartRef.current = Date.now()

    pollIntervalRef.current = setInterval(async () => {
      // Check 2-minute timeout
      if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
        stopPolling()
        setUiState('error')
        setErrorMsg('Connection session timed out after 2 minutes. Please generate a fresh code to try again.')
        return
      }

      try {
        const res = await fetch(`/api/evolution/link/status?sales_member_id=${memberId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.state === 'connected') {
            stopPolling()
            setUiState('connected')
            setErrorMsg(null)
            toast.success('WhatsApp connected successfully')
            onStatusChangedRef.current?.()

            // Auto-close dialog after 1.5s
            if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
            autoCloseTimeoutRef.current = setTimeout(() => {
              onOpenChangeRef.current?.(false)
            }, 1500)
          }
        }
      } catch {
        // Silent poll error; will retry next interval
      }
    }, 3000)
  }, [stopPolling])

  // Request QR Code
  const requestQrCode = useCallback(async () => {
    if (!member || actionLoading) return
    setActionLoading(true)
    setErrorMsg(null)
    setUiState('preparing')
    setQrcode(null)
    setPairingCode(null)

    try {
      const res = await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: member.id,
          mode: 'qr',
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        const cleanErr = data.error || 'Failed to generate QR code. Evolution API may be unavailable.'
        setErrorMsg(cleanErr)
        setUiState('error')
        toast.error(cleanErr)
        stopPolling()
        return
      }

      const qrImg = extractQrImageSrc(data.qr)
      if (qrImg) {
        setQrcode(qrImg)
        setUiState('waiting_for_scan')
        setSecondsRemaining(COUNTDOWN_SECONDS)
        startPolling(member.id)
      } else {
        const cleanErr = 'Unable to render QR code from WhatsApp gateway response.'
        setErrorMsg(cleanErr)
        setUiState('error')
        toast.error(cleanErr)
        stopPolling()
      }
    } catch {
      const cleanErr = 'Network error contacting WhatsApp gateway.'
      setErrorMsg(cleanErr)
      setUiState('error')
      toast.error(cleanErr)
      stopPolling()
    } finally {
      setActionLoading(false)
    }
  }, [member, actionLoading, startPolling, stopPolling])

  // Request Phone Pairing Code
  const requestPairingCode = useCallback(async () => {
    if (!member || actionLoading) return

    let cleanPhone = phoneInput.replace(/\D/g, '')
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.slice(2)
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '92' + cleanPhone.slice(1)
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error('Please enter a valid phone number (e.g. +92 300 1234567)')
      return
    }

    setActionLoading(true)
    setErrorMsg(null)
    setUiState('preparing')
    setQrcode(null)
    setPairingCode(null)

    try {
      const res = await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: member.id,
          mode: 'pairing',
          phone: cleanPhone,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        const cleanErr = data.error || 'Failed to generate pairing code. Evolution API may be unavailable.'
        setErrorMsg(cleanErr)
        setUiState('error')
        toast.error(cleanErr)
        stopPolling()
        return
      }

      const code = typeof data.pairingCode === 'string' ? data.pairingCode : null
      if (code) {
        setPairingCode(code)
        setUiState('waiting_for_pairing')
        setSecondsRemaining(COUNTDOWN_SECONDS)
        toast.success('WhatsApp device pairing code generated!')
        startPolling(member.id)
      } else {
        const cleanErr = 'WhatsApp gateway did not return a pairing code.'
        setErrorMsg(cleanErr)
        setUiState('error')
        toast.error(cleanErr)
        stopPolling()
      }
    } catch {
      const cleanErr = 'Network error requesting pairing code.'
      setErrorMsg(cleanErr)
      setUiState('error')
      toast.error(cleanErr)
      stopPolling()
    } finally {
      setActionLoading(false)
    }
  }, [member, actionLoading, phoneInput, startPolling, stopPolling])

  // Lifecycle on modal open / close
  useEffect(() => {
    if (open && member) {
      setErrorMsg(null)
      setSecondsRemaining(COUNTDOWN_SECONDS)

      // Start initial QR generation automatically if on QR tab
      if (activeTab === 'qrcode') {
        requestQrCode()
      } else {
        setUiState('preparing')
      }
    } else {
      // Modal closed: stop polling and clear in-memory sensitive data
      stopPolling()
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current)
        autoCloseTimeoutRef.current = null
      }
      setQrcode(null)
      setPairingCode(null)
      setErrorMsg(null)
    }

    return () => {
      stopPolling()
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current)
      }
    }
  }, [open, member?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for active code
  useEffect(() => {
    if (!open || uiState === 'connected' || uiState === 'error') return
    if (!qrcode && !pairingCode) return

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, qrcode, pairingCode, uiState])

  const handleCopyCode = () => {
    if (!pairingCode) return
    const formatted = pairingCode.replace(/[^a-zA-Z0-9]/g, '')
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    toast.success('Pairing code copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
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

          {/* Connection Method Switcher (When not connected) */}
          {uiState !== 'connected' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qrcode')
                  if (!qrcode) requestQrCode()
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
            {uiState === 'connected' ? (
              /* CONNECTED STATE WITH AUTO-CLOSE */
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200 py-2">
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    WhatsApp Connected Successfully!
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    All incoming and outgoing WhatsApp messages from {member.name}'s phone are now securely syncing to your CRM.
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
                </div>
              </div>
            ) : uiState === 'error' ? (
              /* ERROR STATE */
              <div className="space-y-3.5 py-4 animate-in fade-in zoom-in-95 text-center">
                <div className="size-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
                  <AlertTriangle className="size-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-base">
                    Connection Issue
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {errorMsg || 'Failed to establish WhatsApp connection. Please verify Evolution API status.'}
                  </p>
                </div>
                <Button
                  size="default"
                  onClick={activeTab === 'phone_code' ? requestPairingCode : requestQrCode}
                  disabled={actionLoading}
                  className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5"
                >
                  <RefreshCw className={`size-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Try Again</span>
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
                          <span>Generating Pairing Code...</span>
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
                        src={qrcode}
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
                      <span>Waiting for WhatsApp scan...</span>
                    </div>
                  </div>
                ) : actionLoading ? (
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

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 p-3 rounded-lg bg-card border border-border text-xs text-left">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span>
                {activeTab === 'phone_code'
                  ? `How ${member.name} pairs with phone number:`
                  : `How ${member.name} links WhatsApp:`}
              </span>
            </div>

            {activeTab === 'phone_code' ? (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1 leading-relaxed">
                <li>Open WhatsApp on <strong>{member.name}</strong>'s phone.</li>
                <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>.</li>
                <li>
                  Tap <span className="font-semibold text-foreground">"Link with phone number instead"</span> at the bottom of the screen.
                </li>
                <li>Enter the 8-character WhatsApp device pairing code shown above.</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pl-1 leading-relaxed">
                <li>Open WhatsApp on <strong>{member.name}</strong>'s phone.</li>
                <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>.</li>
                <li>Point the phone camera at the QR code above.</li>
              </ol>
            )}
          </div>
        </div>

        <DialogFooter className="p-3 sm:p-4 pt-2.5 border-t border-border/60 shrink-0 bg-background/95 backdrop-blur-xs flex items-center justify-between gap-2">
          <div>
            {activeTab === 'qrcode' && qrcode && uiState !== 'connected' && (
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
            {activeTab === 'phone_code' && pairingCode && uiState !== 'connected' && (
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
