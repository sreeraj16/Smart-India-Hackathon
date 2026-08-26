import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is missing.' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const targetRedirectUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/';

    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: targetRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || 'Failed to exchange authorization code with Google.' },
        { status: 400 }
      );
    }

    // 2. Fetch user profile from Google UserInfo API
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile from Google.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
      },
    });
  } catch (err: any) {
    console.error('Google OAuth callback handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
