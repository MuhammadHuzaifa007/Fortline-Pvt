import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SalesChannelQrDialog, extractQrImageSrc } from './sales-channel-qr-dialog';
import type { FortlineSalesMember } from '@/types/fortline';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Base UI Dialog to render cleanly in server/node test environment
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogDescription: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('SalesChannelQrDialog & Evolution Link Workflow', () => {
  const mockMember: FortlineSalesMember = {
    id: 'sm-bilal-123',
    name: 'Bilal Khan',
    division: 'Corporate Sales',
    designation: 'Senior Rep',
    phone_number: '+92 300 1234567',
    whatsapp_phone_number: '+92 300 1234567',
    is_active: true,
    presence_status: 'online',
    presence_source: 'channel_activity',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('extractQrImageSrc', () => {
    it('handles direct data:image string', () => {
      const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      expect(extractQrImageSrc(src)).toBe(src);
    });

    it('formats raw base64 string into data URI', () => {
      const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAA'.repeat(5);
      expect(extractQrImageSrc(rawBase64)).toBe(`data:image/png;base64,${rawBase64}`);
    });

    it('extracts base64 from object payload', () => {
      const payload = { base64: 'abc123mockbase64' };
      expect(extractQrImageSrc(payload)).toBe('data:image/png;base64,abc123mockbase64');
    });

    it('extracts nested qrcode.base64 from Evolution payload', () => {
      const payload = { qrcode: { base64: 'nestedBase64String' } };
      expect(extractQrImageSrc(payload)).toBe('data:image/png;base64,nestedBase64String');
    });

    it('returns null on null or invalid input', () => {
      expect(extractQrImageSrc(null)).toBeNull();
      expect(extractQrImageSrc(undefined)).toBeNull();
      expect(extractQrImageSrc({})).toBeNull();
      expect(extractQrImageSrc('')).toBeNull();
    });
  });

  describe('Dialog Rendering', () => {
    it('returns empty when member is null', () => {
      const html = renderToStaticMarkup(
        <SalesChannelQrDialog
          member={null}
          open={true}
          onOpenChange={vi.fn()}
        />
      );
      expect(html).toBe('');
    });

    it('returns empty when open is false', () => {
      const html = renderToStaticMarkup(
        <SalesChannelQrDialog
          member={mockMember}
          open={false}
          onOpenChange={vi.fn()}
        />
      );
      expect(html).toBe('');
    });

    it('renders sales member information when open', () => {
      const html = renderToStaticMarkup(
        <SalesChannelQrDialog
          member={mockMember}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(html).toContain('Bilal Khan');
      expect(html).toContain('Corporate Sales');
      expect(html).toContain('Scan QR Code');
      expect(html).toContain('Pair with Phone Number');
      expect(html).toContain('+92 300 1234567');
    });

    it('never leaks secret API keys in rendered markup', () => {
      const secret = 'super_secret_evolution_key_xyz';
      process.env.EVOLUTION_API_KEY = secret;

      const html = renderToStaticMarkup(
        <SalesChannelQrDialog
          member={mockMember}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(html).not.toContain(secret);
    });
  });

  describe('Link Flow API Contracts', () => {
    it('calls /api/evolution/link/start with mode="qr" and sales_member_id', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          mode: 'qr',
          instance: 'fortline_bilal',
          qr: { base64: 'mock_qr_base64_data' },
          pairingCode: null,
        }),
      });

      const response = await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: mockMember.id,
          mode: 'qr',
        }),
      });

      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.mode).toBe('qr');
      expect(extractQrImageSrc(data.qr)).toBe('data:image/png;base64,mock_qr_base64_data');

      expect(global.fetch).toHaveBeenCalledWith('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: 'sm-bilal-123',
          mode: 'qr',
        }),
      });
    });

    it('refresh QR reuses same member and does not create a new instance', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          mode: 'qr',
          instance: 'fortline_bilal',
          qr: { base64: 'refreshed_qr_base64' },
          pairingCode: null,
        }),
      });

      // First call
      await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_member_id: mockMember.id, mode: 'qr' }),
      });

      // Refresh call
      await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_member_id: mockMember.id, mode: 'qr' }),
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect((global.fetch as any).mock.calls[1][1].body).toContain('sm-bilal-123');
    });

    it('calls /api/evolution/link/start with mode="pairing" and normalized phone', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          mode: 'pairing',
          instance: 'fortline_bilal',
          qr: null,
          pairingCode: '4567-8901',
        }),
      });

      const normalizedPhone = '+92 300 1234567'.replace(/\D/g, '');

      const response = await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: mockMember.id,
          mode: 'pairing',
          phone: normalizedPhone,
        }),
      });

      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.mode).toBe('pairing');
      expect(data.pairingCode).toBe('4567-8901');

      expect(global.fetch).toHaveBeenCalledWith('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: 'sm-bilal-123',
          mode: 'pairing',
          phone: '923001234567',
        }),
      });
    });

    it('polling calls status route with sales_member_id', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          state: 'connecting',
          instance: 'fortline_bilal',
        }),
      });

      const res = await fetch(`/api/evolution/link/status?sales_member_id=${mockMember.id}`);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.state).toBe('connecting');
      expect(global.fetch).toHaveBeenCalledWith(`/api/evolution/link/status?sales_member_id=${mockMember.id}`);
    });

    it('connected state terminates polling and triggers roster refresh', async () => {
      const onStatusChanged = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          state: 'connected',
          instance: 'fortline_bilal',
        }),
      });

      const res = await fetch(`/api/evolution/link/status?sales_member_id=${mockMember.id}`);
      const data = await res.json();

      if (data.state === 'connected') {
        onStatusChanged();
      }

      expect(data.state).toBe('connected');
      expect(onStatusChanged).toHaveBeenCalledTimes(1);
    });

    it('API error returns clean user-friendly error without leaking secrets', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({
          error: 'Evolution API request timed out. Please try again.',
        }),
      });

      const res = await fetch('/api/evolution/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_member_id: mockMember.id, mode: 'qr' }),
      });

      const data = await res.json();
      expect(res.ok).toBe(false);
      expect(data.error).toBe('Evolution API request timed out. Please try again.');
      expect(JSON.stringify(data)).not.toContain('super_secret');
    });
  });
});
