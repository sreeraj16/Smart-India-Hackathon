import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ROLE_PORTALS } from "@/lib/config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route patterns
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/team-lead');
  const isTeamMember = pathname.startsWith('/team-member');
  const isAdmin = pathname.startsWith('/admin');
  const isCoordinator = pathname.startsWith('/coordinator');
  const isJury = pathname.startsWith('/jury');

  const isProtectedRoute = isDashboard || isTeamMember || isAdmin || isCoordinator || isJury;

  if (isProtectedRoute) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      // Unauthenticated access attempt to protected route
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.authRole;
    const userEmail = (session.email || '').trim().toLowerCase();
    const isAuthorizedAdmin = ['vasuch9959@rguktn.ac.in', 'n220615@rguktn.ac.in'].includes(userEmail);

    // Direct URL Protection for Admin routes: strictly restricted to vasuch9959@rguktn.ac.in & n220615@rguktn.ac.in
    if (isAdmin && !isAuthorizedAdmin) {
      const targetPortal = (role && role !== 'admin' && ROLE_PORTALS[role]) || '/login';
      const redirectUrl = new URL(targetPortal, request.url);
      redirectUrl.searchParams.set('unauthorized', 'admin_access_denied');
      return NextResponse.redirect(redirectUrl);
    }

    // Reject unauthorized access attempts for non-super users accessing other specific portals
    if (!isAuthorizedAdmin) {
      if (isCoordinator && role !== 'coordinator') {
        const redirectUrl = new URL(ROLE_PORTALS[role] || '/login', request.url);
        return NextResponse.redirect(redirectUrl);
      }

      if (isJury && role !== 'jury') {
        const redirectUrl = new URL(ROLE_PORTALS[role] || '/login', request.url);
        return NextResponse.redirect(redirectUrl);
      }

      if (isDashboard && role !== 'team_lead') {
        const redirectUrl = new URL(ROLE_PORTALS[role] || '/login', request.url);
        return NextResponse.redirect(redirectUrl);
      }

      if (isTeamMember && role !== 'team_member') {
        const redirectUrl = new URL(ROLE_PORTALS[role] || '/login', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
