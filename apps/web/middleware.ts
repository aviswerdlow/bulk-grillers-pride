import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

const isOnboardingRoute = createRouteMatcher(['/onboarding'])
const isOrganizationRoute = createRouteMatcher(['/(.*)/(.*)']) // org/project routes
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const url = req.nextUrl

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Protect all other routes - require authentication
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  // If user is accessing organization routes, we need to check access
  if (isOrganizationRoute(req) && !isOnboardingRoute(req)) {
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const orgSlug = pathSegments[0]
    
    if (orgSlug) {
      // Organization access will be validated in the route component
      // using Convex queries with proper user context
      // This provides better error handling and user experience
      return NextResponse.next()
    }
  }

  // If user is accessing dashboard directly, redirect to onboarding
  if (isDashboardRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Allow onboarding route for authenticated users
  if (isOnboardingRoute(req)) {
    return NextResponse.next()
  }

  // For any other protected route, redirect to onboarding first
  // Let onboarding page handle checking if user already has organizations
  return NextResponse.redirect(new URL('/onboarding', req.url))
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
} 