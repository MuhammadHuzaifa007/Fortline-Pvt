import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes that require an authenticated user.
 */
const PROTECTED_PATHS = [
  '/dashboard',
  '/inbox',
  '/notifications',
  '/contacts',
  '/pipelines',
  '/broadcasts',
  '/automations',
  '/flows',
  '/ai-agents',
  '/settings',
]

/**
 * Authentication-related pages.
 *
 * If an authenticated user visits these pages,
 * they will be redirected to the dashboard.
 */
const AUTH_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
]

/**
 * API routes that require authentication.
 *
 * Webhooks are intentionally excluded because they are
 * normally called by external services rather than logged-in users.
 */
function isProtectedApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api/whatsapp/') &&
    !pathname.includes('/webhook')
  )
}

/**
 * Check whether the pathname belongs to one of our
 * protected CRM routes.
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  )
}

/**
 * Check whether the pathname is an authentication page.
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const protectedRoute = isProtectedRoute(pathname)
  const authRoute = isAuthRoute(pathname)
  const protectedApiRoute = isProtectedApiRoute(pathname)

  /**
   * IMPORTANT:
   *
   * Public routes should NOT initialize Supabase Auth.
   *
   * This prevents requests such as:
   *
   * /
   * /about
   * /privacy
   * /terms
   * etc.
   *
   * from unnecessarily running authentication logic.
   *
   * It also prevents the homepage from being blocked
   * by Supabase Auth.
   */
  if (!protectedRoute && !authRoute && !protectedApiRoute) {
    return NextResponse.next()
  }

  /**
   * Start with a response that will be passed to
   * Server Components.
   */
  let supabaseResponse = NextResponse.next({
    request,
  })

  /**
   * Create Supabase server client.
   *
   * Use the current publishable key when available,
   * while retaining ANON_KEY compatibility with your
   * existing environment.
   */
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  /**
   * Fail safely if production environment variables
   * are missing.
   *
   * Do not allow an undefined Supabase configuration
   * to cause confusing middleware behavior.
   */
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Supabase environment variables are missing.'
    )

    /**
     * For protected routes, fail closed.
     */
    if (protectedRoute || protectedApiRoute) {
      if (protectedApiRoute) {
        return NextResponse.json(
          {
            error: 'Authentication service is not configured.',
          },
          { status: 500 }
        )
      }

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''

      return NextResponse.redirect(url)
    }

    /**
     * Authentication pages can still load.
     */
    return NextResponse.next()
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        /**
         * Read all cookies from the incoming request.
         */
        getAll() {
          return request.cookies.getAll()
        },

        /**
         * Forward refreshed authentication cookies
         * to both the request and response.
         */
        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              )
            }
          )

          supabaseResponse =
            NextResponse.next({
              request,
            })

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              )
            }
          )
        },
      },
    }
  )

  /**
   * Verify the user's JWT claims.
   *
   * Supabase currently recommends getClaims()
   * for protecting routes/data.
   *
   * Unlike getUser(), getClaims() is designed for
   * authorization checks and can validate JWT claims
   * locally when the project uses asymmetric signing
   * keys.
   */
  let claims: Record<string, unknown> | null = null

  try {
    const {
      data: claimsData,
      error: claimsError,
    } = await supabase.auth.getClaims()

    if (claimsError) {
      console.error(
        'Supabase getClaims error:',
        claimsError.message
      )
    }

    claims = claimsData?.claims ?? null
  } catch (error) {
    console.error(
      'Supabase authentication error:',
      error
    )
  }

  /**
   * A valid user is represented by the "sub" claim.
   */
  const userId =
    typeof claims?.sub === 'string'
      ? claims.sub
      : null

  const isAuthenticated = Boolean(userId)

  /**
   * Helper that copies any refreshed Supabase
   * cookies onto the response we actually return.
   *
   * This is important when auth tokens are refreshed.
   */
  const withRefreshedCookies = <
    T extends NextResponse
  >(
    response: T
  ): T => {
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => {
        response.cookies.set(cookie)
      })

    return response
  }

  /**
   * =========================================================
   * AUTH PAGE HANDLING
   * =========================================================
   *
   * Logged-in users should not normally remain on:
   *
   * /login
   * /signup
   * /forgot-password
   *
   * They should be sent to the CRM dashboard.
   *
   * Exception:
   * login/signup + invite token
   * -> /join/<token>
   */
  if (isAuthenticated && authRoute) {
    const url = request.nextUrl.clone()

    const inviteToken =
      request.nextUrl.searchParams.get('invite')

    if (
      inviteToken &&
      (
        pathname === '/login' ||
        pathname === '/signup'
      )
    ) {
      url.pathname =
        `/join/${encodeURIComponent(inviteToken)}`
      url.search = ''

      return withRefreshedCookies(
        NextResponse.redirect(url)
      )
    }

    url.pathname = '/dashboard'
    url.search = ''

    return withRefreshedCookies(
      NextResponse.redirect(url)
    )
  }

  /**
   * =========================================================
   * PROTECTED CRM ROUTES
   * =========================================================
   *
   * User is not authenticated -> /login
   */
  if (protectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone()

    url.pathname = '/login'

    /**
     * Prevent carrying query parameters from protected
     * routes into the login page.
     */
    url.search = ''

    return withRefreshedCookies(
      NextResponse.redirect(url)
    )
  }

  /**
   * =========================================================
   * PROTECTED WHATSAPP API ROUTES
   * =========================================================
   *
   * Webhooks are excluded above.
   */
  if (
    protectedApiRoute &&
    !isAuthenticated
  ) {
    return withRefreshedCookies(
      NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      )
    )
  }

  /**
   * =========================================================
   * NORMAL REQUEST
   * =========================================================
   */
  return supabaseResponse
}

/**
 * Middleware matcher.
 *
 * Static files and Next.js internal assets are excluded.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
}