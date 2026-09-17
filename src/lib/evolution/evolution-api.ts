// ============================================================
// Server-side Evolution API client
//
// Sends messages through Evolution API instances. Used exclusively
// by server-side API routes — never imported from client code.
//
// Environment variables (server-only, never NEXT_PUBLIC_):
//   EVOLUTION_API_URL  — base URL of the Evolution API server
//   EVOLUTION_API_KEY  — API key for authentication
// ============================================================

/**
 * Result of an Evolution API send operation.
 */
export interface EvolutionSendResult {
  success: boolean;
  /** Evolution's response data when successful. */
  data?: Record<string, unknown>;
  /** Human-readable error message when failed. */
  error?: string;
  /** HTTP status code from Evolution API (if request reached the server). */
  statusCode?: number;
}

/**
 * Send a text message through a specific Evolution instance.
 *
 * @param instanceId  The `gateway_instance_id` from `fortline_channels` (e.g. `fortline_bilal`).
 * @param phone       Normalized phone number (digits only, no `@s.whatsapp.net`).
 * @param text        Message content.
 * @returns           Structured result — never throws.
 */
export async function sendEvolutionText(
  instanceId: string,
  phone: string,
  text: string,
): Promise<EvolutionSendResult> {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!apiUrl) {
    console.error('[EVOLUTION SEND] EVOLUTION_API_URL is not configured');
    return {
      success: false,
      error: 'Evolution API is not configured. Contact your administrator.',
    };
  }

  if (!apiKey) {
    console.error('[EVOLUTION SEND] EVOLUTION_API_KEY is not configured');
    return {
      success: false,
      error: 'Evolution API key is not configured. Contact your administrator.',
    };
  }

  if (!instanceId) {
    return {
      success: false,
      error: 'Missing Evolution instance ID for this channel.',
    };
  }

  if (!phone) {
    return {
      success: false,
      error: 'Missing recipient phone number.',
    };
  }

  if (!text || !text.trim()) {
    return {
      success: false,
      error: 'Message text cannot be empty.',
    };
  }

  const url = `${apiUrl.replace(/\/+$/, '')}/message/sendText/${instanceId}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('[EVOLUTION SEND] API error:', {
        status: response.status,
        instanceId,
        phone,
        body: errorBody.slice(0, 500),
      });

      // Detect disconnected instance
      if (response.status === 404) {
        return {
          success: false,
          error: `Evolution instance "${instanceId}" not found. The WhatsApp line may be disconnected.`,
          statusCode: response.status,
        };
      }

      return {
        success: false,
        error: `Evolution API returned ${response.status}. The message was not sent.`,
        statusCode: response.status,
      };
    }

    const data = await response.json().catch(() => ({}));

    console.log('[EVOLUTION SEND] Message sent:', {
      instanceId,
      phone,
      success: true,
    });

    return {
      success: true,
      data: data as Record<string, unknown>,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[EVOLUTION SEND] Request timed out:', { instanceId, phone });
      return {
        success: false,
        error: 'Evolution API request timed out. Please try again.',
      };
    }

    console.error('[EVOLUTION SEND] Network error:', err);
    return {
      success: false,
      error: 'Failed to connect to Evolution API. Please try again.',
    };
  }
}

/**
 * Create a new Evolution API instance.
 *
 * @param instanceName  Instance identifier (e.g. `fortline_rep_...`).
 */
export async function createEvolutionInstance(
  instanceName: string,
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
  alreadyExists?: boolean;
}> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Evolution API credentials are not configured.',
    };
  }

  if (!instanceName || !instanceName.trim()) {
    return {
      success: false,
      error: 'Instance name cannot be empty.',
    };
  }

  const url = `${apiUrl}/instance/create`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        instanceName: instanceName.trim(),
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const isAlreadyExists =
        response.status === 403 ||
        response.status === 400 ||
        errorText.toLowerCase().includes('already in use') ||
        errorText.toLowerCase().includes('already exists');

      if (isAlreadyExists) {
        return {
          success: true,
          alreadyExists: true,
          statusCode: response.status,
          data: { message: 'Instance already exists' },
        };
      }

      return {
        success: false,
        error: `Evolution API returned status ${response.status}: ${errorText.slice(0, 200)}`,
        statusCode: response.status,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      data: data as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error creating Evolution instance',
    };
  }
}

/**
 * Initiate connection for an Evolution instance.
 * Returns QR data or pairing code.
 *
 * @param instanceName  Instance identifier.
 * @param phone         Optional normalized phone number for pairing code mode.
 */
export async function getEvolutionConnection(
  instanceName: string,
  phone?: string,
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Evolution API credentials are not configured.',
    };
  }

  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const url = cleanPhone
    ? `${apiUrl}/instance/connect/${instanceName.trim()}?number=${cleanPhone}`
    : `${apiUrl}/instance/connect/${instanceName.trim()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Evolution API connect returned ${response.status}: ${errorText.slice(0, 200)}`,
        statusCode: response.status,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      data: data as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error connecting Evolution instance',
    };
  }
}

/**
 * Check connection state of an Evolution instance.
 *
 * @param instanceName  Instance identifier.
 */
export async function getEvolutionConnectionState(
  instanceName: string,
): Promise<{
  success: boolean;
  state?: string;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Evolution API credentials are not configured.',
    };
  }

  const url = `${apiUrl}/instance/connectionState/${instanceName.trim()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Evolution API connectionState returned ${response.status}: ${errorText.slice(0, 200)}`,
        statusCode: response.status,
      };
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const rawInstance = data.instance as Record<string, unknown> | undefined;
    const state =
      typeof rawInstance?.state === 'string'
        ? rawInstance.state
        : typeof data.state === 'string'
        ? data.state
        : undefined;

    return {
      success: true,
      state,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error fetching connection state',
    };
  }
}

/**
 * Register CRM webhook on an Evolution instance.
 *
 * @param instanceName  Instance identifier.
 */
export async function setEvolutionWebhook(
  instanceName: string,
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Evolution API credentials are not configured.',
    };
  }

  const url = `${apiUrl}/webhook/set/${instanceName.trim()}`;

  const payload = {
    webhook: {
      enabled: true,
      url: process.env.EVOLUTION_WEBHOOK_URL || 'https://fortlinesales.cloud/api/evolution/webhook',
      byEvents: false,
      base64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
      ],
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Evolution API setWebhook returned ${response.status}: ${errorText.slice(0, 200)}`,
        statusCode: response.status,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      data: data as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error configuring webhook',
    };
  }
}
