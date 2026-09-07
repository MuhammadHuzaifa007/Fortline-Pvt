export type GatewayPairingState = 'connected' | 'connecting' | 'qrcode' | 'disconnected';

export interface GatewayConfig {
  id?: string;
  account_id?: string;
  gateway_url: string;
  api_key: string;
  webhook_secret?: string;
  is_enabled: boolean;
}

export interface GatewayInstanceStatus {
  instanceName: string;
  state: 'open' | 'connecting' | 'close';
  pairingState: GatewayPairingState;
  qrcode?: string | null;
  pairingCode?: string | null;
  ownerJid?: string | null;
  profileName?: string | null;
}

export interface GatewayWebhookMessage {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string; // e.g. "923001234567@s.whatsapp.net"
      fromMe: boolean;   // true = rep sent it from phone, false = customer sent it
      id: string;        // message ID
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      imageMessage?: {
        caption?: string;
        url?: string;
        mimetype?: string;
      };
      audioMessage?: {
        url?: string;
        mimetype?: string;
        seconds?: number;
      };
      documentMessage?: {
        fileName?: string;
        mimetype?: string;
        url?: string;
      };
    };
    messageTimestamp?: number | string;
    status?: string;
  };
}

export interface GatewayConnectionUpdate {
  event: 'connection.update' | 'CONNECTION_UPDATE' | 'qrcode.updated' | 'QRCODE_UPDATED';
  instance: string;
  data: {
    state?: 'open' | 'connecting' | 'close';
    statusReason?: number;
    qrcode?: {
      base64?: string;
      code?: string;
    };
  };
}
