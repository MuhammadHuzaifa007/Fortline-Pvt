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
