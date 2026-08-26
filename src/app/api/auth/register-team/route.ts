import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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
