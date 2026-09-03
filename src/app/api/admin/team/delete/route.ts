import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { teamId, reason = 'Removed by Administrator', adminEmail } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required for deletion.' },
        { status: 400 }
      );
    }

    // --- 1. Admin Authorization Check ---
    const requesterEmail = (adminEmail || '').trim().toLowerCase();
    if (requesterEmail) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', requesterEmail)
        .single();

      if (adminProfile && adminProfile.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized Access: Admin privileges required.' },
          { status: 403 }
        );
      }
    }

    // --- 2. Verify Target Team Exists ---
    const { data: targetTeam, error: fetchErr } = await supabase
      .from('teams')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (fetchErr || !targetTeam) {
      return NextResponse.json(
        { success: false, error: 'Target team not found.' },
        { status: 404 }
      );
    }

    // --- 3. Perform Soft-Delete / Disqualification for Audit Safety ---
    const timestamp = new Date().toISOString();
    const { error: statusUpdateErr } = await supabase
      .from('teams')
      .update({ registration_status: 'disqualified' })
      .eq('team_id', teamId);

    if (statusUpdateErr) {
      console.error('Failed to update registration_status:', statusUpdateErr);
      return NextResponse.json(
        { success: false, error: `Database Error: ${statusUpdateErr.message}` },
        { status: 500 }
      );
    }

    // --- 4. Record Audit Log ---
    const { error: auditErr } = await supabase
      .from('audit_logs')
      .insert({
        team_id: teamId,
        action: 'ADMIN_TEAM_DELETE',
        previous_value: `Status: ${targetTeam.registration_status || 'registered'}`,
        new_value: 'Status: disqualified (removed)',
        reason: `${reason} (Action executed by ${requesterEmail || 'Admin'})`,
        timestamp: timestamp
      });

    if (auditErr) {
      console.error('Failed to write deletion audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      teamId,
      message: `Team "${targetTeam.team_name}" (${teamId}) was safely removed/disqualified.`
    });

  } catch (err: any) {
    console.error('Error in admin delete team API route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
