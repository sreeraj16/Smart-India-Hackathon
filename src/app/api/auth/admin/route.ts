import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const AUTHORIZED_ADMIN_EMAILS = ['n220615@rguktn.ac.in', 'vasuch9959@rguktn.ac.in'];
    if (!AUTHORIZED_ADMIN_EMAILS.includes(trimmedEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized — You do not have permission to access the Admin Dashboard.'
      }, { status: 403 });
    }

    const admin1Email = 'n220615@rguktn.ac.in';
    const admin1Password = process.env.ADMIN_PASSWORD_1 || '#Jhanu@143';

    const admin2Email = 'vasuch9959@rguktn.ac.in';
    const admin2Password = process.env.ADMIN_PASSWORD_2 || 'vasu@9959';

    if (
      (trimmedEmail === admin1Email && password === admin1Password) ||
      (trimmedEmail === admin2Email && password === admin2Password)
    ) {
      return NextResponse.json({
        success: true,
        user: {
          user_id: trimmedEmail === admin1Email ? 'admin-n220615' : 'admin-vasu',
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
