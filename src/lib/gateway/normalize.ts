export interface NormalizedGatewayMessage {
  messageId: string;
  senderPhone: string;
  customerPhone: string;
  customerName?: string;
  isFromMe: boolean; // true = rep, false = customer
  senderType: 'agent' | 'customer';
  text: string;
  mediaType?: 'text' | 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  timestamp: string;
}

export function normalizeGatewayMessage(payload: any): NormalizedGatewayMessage | null {
  const data = payload?.data;
  if (!data || !data.key) return null;

  const remoteJid = data.key.remoteJid || '';
  // Skip broadcast status updates or newsletter feeds
  if (remoteJid.includes('status@broadcast') || remoteJid.includes('@newsletter')) {
    return null;
  }

  const isFromMe = Boolean(data.key.fromMe);
  const rawNumber = remoteJid.replace(/@.*$/, '');
  const customerPhone = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`;

  const msg = data.message || {};
  let text = '';
  let mediaType: 'text' | 'image' | 'audio' | 'video' | 'document' = 'text';
  let mediaUrl: string | undefined = undefined;

  if (msg.conversation) {
    text = msg.conversation;
  } else if (msg.extendedTextMessage?.text) {
    text = msg.extendedTextMessage.text;
  } else if (msg.imageMessage) {
    mediaType = 'image';
    text = msg.imageMessage.caption || '[Image]';
    mediaUrl = msg.imageMessage.url;
  } else if (msg.audioMessage) {
    mediaType = 'audio';
    text = '[Voice Note]';
    mediaUrl = msg.audioMessage.url;
  } else if (msg.videoMessage) {
    mediaType = 'video';
    text = msg.videoMessage.caption || '[Video]';
    mediaUrl = msg.videoMessage.url;
  } else if (msg.documentMessage) {
    mediaType = 'document';
    text = msg.documentMessage.fileName ? `[Document: ${msg.documentMessage.fileName}]` : '[Document]';
    mediaUrl = msg.documentMessage.url;
  } else if (msg.buttonsResponseMessage?.selectedDisplayText) {
    text = msg.buttonsResponseMessage.selectedDisplayText;
  } else if (msg.listResponseMessage?.title) {
    text = msg.listResponseMessage.title;
  }

  if (!text && !mediaUrl) {
    return null;
  }

  let timestamp = new Date().toISOString();
  if (data.messageTimestamp) {
    const tsNum = typeof data.messageTimestamp === 'string'
      ? parseInt(data.messageTimestamp, 10)
      : data.messageTimestamp;
    if (tsNum) {
      // If unix seconds (10 digits) vs milliseconds (13 digits)
      const ms = tsNum < 1e11 ? tsNum * 1000 : tsNum;
      timestamp = new Date(ms).toISOString();
    }
  }

  return {
    messageId: data.key.id || `gw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderPhone: isFromMe ? '' : customerPhone,
    customerPhone,
    customerName: data.pushName || undefined,
    isFromMe,
    senderType: isFromMe ? 'agent' : 'customer',
    text,
    mediaType,
    mediaUrl,
    timestamp,
  };
}
