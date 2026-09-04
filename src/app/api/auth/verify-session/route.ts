import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { verifyUserRoleFromDatabase } from '@/lib/auth/verifyRole';
import { ROLE_PORTALS } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleVerification(req);
}

export async function POST(req: Request) {
  return handleVerification(req);
}

async function handleVerification(req: Request) {
  try {
    const cookieStore = cookies();
    let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    let bodyData: any = {};
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch {
        // Body might be empty
      }
    }

    if (!token && bodyData.token) {
      token = bodyData.token;
    }

    let session = verifySessionToken(token);

    // If no valid session token cookie, check if email/role was passed directly in auth sync request
    if (!session && bodyData.email) {
      const dbVerification = await verifyUserRoleFromDatabase(
        bodyData.email,
        bodyData.role,
        { name: bodyData.name, jury_id: bodyData.jury_id, panel: bodyData.panel }
      );

      const newSessionToken = createSessionToken({
        email: bodyData.email,
        name: bodyData.name || dbVerification.name || '',
        authRole: dbVerification.role,
        user_id: bodyData.user_id,
        jury_id: dbVerification.jury_id || bodyData.jury_id,
        panel: dbVerification.panel || bodyData.panel,
        team_id: dbVerification.team_id || bodyData.team_id
      });

      const response = NextResponse.json({
        success: true,
        authenticated: true,
        user: {
          email: dbVerification.email,
          name: dbVerification.name || bodyData.name,
          role: dbVerification.role,
          team_id: dbVerification.team_id || bodyData.team_id,
          jury_id: dbVerification.jury_id || bodyData.jury_id,
          panel: dbVerification.panel || bodyData.panel
        },
        allowedPortal: ROLE_PORTALS[dbVerification.role] || '/dashboard'
      });

      response.cookies.set(SESSION_COOKIE_NAME, newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });

      return response;
    }

    if (!session) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'Unauthenticated or invalid session.'
      }, { status: 401 });
    }

    // Always re-verify role against Supabase database!
    const dbVerified = await verifyUserRoleFromDatabase(
      session.email,
      session.authRole,
      { name: session.name, jury_id: session.jury_id, panel: session.panel }
    );

    const updatedUser = {
      email: dbVerified.email,
      name: dbVerified.name || session.name,
      role: dbVerified.role,
      team_id: dbVerified.team_id || session.team_id,
      jury_id: dbVerified.jury_id || session.jury_id,
      panel: dbVerified.panel || session.panel
    };

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: updatedUser,
      allowedPortal: ROLE_PORTALS[dbVerified.role] || '/dashboard'
    });

  } catch (error: any) {
    console.error('Session verification error:', error);
    return NextResponse.json({ success: false, authenticated: false, error: 'Server Verification Error' }, { status: 500 });
  }
}
