import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const admin1Email = (process.env.ADMIN_EMAIL_1 || 'n220615@rguktn.ac.in').trim().toLowerCase();
    const admin1Password = process.env.ADMIN_PASSWORD_1 || '#Jhanu@143';

    const admin2Email = (process.env.ADMIN_EMAIL_2 || 'vasuch9959@rguktn.ac.in').trim().toLowerCase();
    const admin2Password = process.env.ADMIN_PASSWORD_2 || 'vasu@9959';

    if (
      (trimmedEmail === admin1Email && password === admin1Password) ||
      (trimmedEmail === admin2Email && password === admin2Password)
    ) {
      return NextResponse.json({
        success: true,
        user: {
          user_id: 'admin-1',
          name: trimmedEmail === admin1Email ? 'Jhanu (Admin)' : 'Vasu (Admin)',
          email: trimmedEmail,
          role: 'admin',
          created_at: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid admin email or password.' }, { status: 401 });
  } catch (error: any) {
    console.error('Admin auth route error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
