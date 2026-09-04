import { NextResponse } from 'next/server';
import { REGISTRATION_CLOSED, REGISTRATION_CLOSED_MESSAGE } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (REGISTRATION_CLOSED) {
    return NextResponse.json(
      {
        success: false,
        error: `${REGISTRATION_CLOSED_MESSAGE.title}: ${REGISTRATION_CLOSED_MESSAGE.subtitle}`
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { teamName, leadEmail } = body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const teamId = `SIH-2026-${randomSuffix}`;
    const tempPassword = `rgukt@${randomSuffix}`;

    return NextResponse.json({
      success: true,
      teamId,
      tempPassword,
      message: `Team ${teamName} registered successfully. Login credentials sent to ${leadEmail}.`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
