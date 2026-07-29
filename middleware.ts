import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Maps URL prefixes to the feature key that gates them.
// Order matters: more specific prefixes should come first.
const FEATURE_GATES: { prefix: string; feature: string }[] = [
  { prefix: '/api/upload',     feature: 'data_upload' },
  { prefix: '/upload',         feature: 'data_upload' },
  { prefix: '/api/export',     feature: 'export'      },
  { prefix: '/api/crm',        feature: 'crm'          },
  { prefix: '/crm',            feature: 'crm'          },
  { prefix: '/api/meetmaster', feature: 'meetmaster'   },
  { prefix: '/meetmaster',     feature: 'meetmaster'   },
  { prefix: '/meetings',       feature: 'meetmaster'   },
  { prefix: '/master',         feature: 'meetmaster'   },
  { prefix: '/api/search',     feature: 'search'       },
  { prefix: '/api/searches',   feature: 'search'       },
  { prefix: '/search',         feature: 'search'       },
  { prefix: '/results',        feature: 'search'       },
  { prefix: '/databases',      feature: 'search'       },
]

function matchFeature(pathname: string): string | null {
  for (const gate of FEATURE_GATES) {
    if (pathname.startsWith(gate.prefix)) return gate.feature
  }
  return null
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/results') ||
    pathname.startsWith('/wallet') ||
    pathname.startsWith('/crm') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/meetmaster') ||
    pathname.startsWith('/meetings') ||
    pathname.startsWith('/master') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/databases') ||
    pathname.startsWith('/data-pro')

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // ── Feature access enforcement ──────────────────────────────
  if (user) {
    const feature = matchFeature(pathname)
    if (feature) {
      try {
        // Admins bypass all feature gates
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (!profile?.is_admin) {
          const { data: access } = await supabase
            .from('user_feature_access')
            .select('enabled')
            .eq('user_id', user.id)
            .eq('feature', feature)
            .maybeSingle()

          // A row with enabled=false means the admin explicitly blocked this feature.
          // No row at all means default access (allowed).
          if (access && access.enabled === false) {
            if (pathname.startsWith('/api/')) {
              return NextResponse.json(
                { error: 'Accès à cette fonctionnalité désactivé. Contactez le support.', feature },
                { status: 403 }
              )
            }
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/dashboard'
            redirectUrl.searchParams.set('blocked', feature)
            return NextResponse.redirect(redirectUrl)
          }
        }
      } catch {
        // Table not migrated yet, or query failed — fail open so the app never breaks.
      }
    }
  }

  // ── Prevent any GET API response from being cached by the browser,
  // Vercel's edge network, or any proxy in between ─────────────────
  // This was a real, confirmed bug: /api/nomenclature (and by the same
  // pattern, potentially any other shared/aggregate GET endpoint) could
  // get cached upstream of the app with no explicit opt-out, meaning a
  // browser "hard refresh" did nothing — it only clears the browser's own
  // cache, never an edge/CDN cache. After a bulk data change (like the
  // company reclassification), stale numbers kept showing for far longer
  // than any in-memory server-side cache TTL could explain. Setting this
  // centrally in middleware closes the gap for every current API route
  // and any added in the future, instead of requiring each route file to
  // remember to set it individually.
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
