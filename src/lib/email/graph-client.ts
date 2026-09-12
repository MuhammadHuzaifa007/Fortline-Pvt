import * as msal from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'

/**
 * Microsoft Graph Client Service
 * Uses ConfidentialClientApplication for App-Only Authentication (Client Credentials Flow).
 * Handles token caching, exponential backoff, and 429 rate limit retries.
 */

let msalClient: msal.ConfidentialClientApplication | null = null

export function getMsalClient(): msal.ConfidentialClientApplication {
  if (msalClient) return msalClient

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      'Microsoft Entra configuration missing: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, or MICROSOFT_TENANT_ID is not set.',
    )
  }

  const msalConfig: msal.Configuration = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
    system: {
      loggerOptions: {
        loggerCallback: (_level, _message, _containsPii) => {
          // Keep credentials out of logs
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Warning,
      },
    },
  }

  msalClient = new msal.ConfidentialClientApplication(msalConfig)
  return msalClient
}

/**
 * Get an App-Only access token for Microsoft Graph
 */
export async function getGraphAccessToken(): Promise<string> {
  const client = getMsalClient()
  const tokenRequest: msal.ClientCredentialRequest = {
    scopes: ['https://graph.microsoft.com/.default'],
  }

  const response = await client.acquireTokenByClientCredential(tokenRequest)
  if (!response?.accessToken) {
    throw new Error('Failed to acquire Microsoft Graph access token')
  }

  return response.accessToken
}

/**
 * Creates an authenticated Microsoft Graph SDK client with custom fetch & retry logic
 */
export function createGraphClient(): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        return await getGraphAccessToken()
      },
    },
  })
}

/**
 * Executes a Graph operation with automatic retries on 429 (rate limiting) or 503 (transient error)
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      return await operation()
    } catch (err: unknown) {
      attempt++
      const error = err as {
        statusCode?: number
        status?: number
        code?: string
        headers?: Headers | Record<string, string>
        message?: string
      }

      const status = error.statusCode || error.status

      if (attempt >= maxRetries || (status !== 429 && status !== 503 && status !== 504)) {
        throw err
      }

      let waitTimeMs = Math.pow(2, attempt) * 1000 // exponential backoff: 2s, 4s, 8s

      // Check for Retry-After header
      if (error.headers) {
        let retryAfterHeader: string | null = null
        if (typeof (error.headers as Headers).get === 'function') {
          retryAfterHeader = (error.headers as Headers).get('Retry-After')
        } else if (typeof error.headers === 'object') {
          retryAfterHeader = (error.headers as Record<string, string>)['retry-after'] ||
            (error.headers as Record<string, string>)['Retry-After']
        }

        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10)
          if (!isNaN(parsed) && parsed > 0) {
            waitTimeMs = parsed * 1000
          }
        }
      }

      console.warn(`[Microsoft Graph] Rate limit or transient error (${status}). Retrying in ${waitTimeMs}ms (attempt ${attempt}/${maxRetries})...`)
      await new Promise((resolve) => setTimeout(resolve, waitTimeMs))
    }
  }

  throw new Error('Microsoft Graph request failed after maximum retries')
}
