import { SupabaseClient } from '@supabase/supabase-js';
import type { GatewayConfig } from '@/types/gateway';

export const DEFAULT_GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
export const DEFAULT_GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'fortline-secret-api-key';

export async function getGatewayConfig(
  supabase: SupabaseClient,
  accountId?: string | null
): Promise<GatewayConfig> {
  if (accountId) {
    try {
      const { data, error } = await supabase
        .from('fortline_gateway_config')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (!error && data && data.gateway_url) {
        return {
          id: data.id,
          account_id: data.account_id,
          gateway_url: data.gateway_url.replace(/\/$/, ''),
          api_key: data.api_key || DEFAULT_GATEWAY_API_KEY,
          webhook_secret: data.webhook_secret || '',
          is_enabled: data.is_enabled ?? true,
        };
      }
    } catch {
      // Fall through to env default
    }
  }

  return {
    gateway_url: DEFAULT_GATEWAY_URL.replace(/\/$/, ''),
    api_key: DEFAULT_GATEWAY_API_KEY,
    is_enabled: true,
  };
}
