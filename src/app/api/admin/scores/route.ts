import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const AUTHORIZED_ADMIN_EMAILS = ['n220615@rguktn.ac.in', 'vasuch9959@rguktn.ac.in'];

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    const url = new URL(req.url);
    const teamIdFilter = url.searchParams.get('team_id');
    const authHeader = req.headers.get('x-admin-auth');

    const userEmail = (session?.email || '').trim().toLowerCase();
    const isAuthorizedAdmin = session?.authRole === 'admin' || AUTHORIZED_ADMIN_EMAILS.includes(userEmail) || authHeader === 'admin-authorized';

    if (!isAuthorizedAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized — Admin score visibility access required.'
      }, { status: 401 });
    }

    // 1. Fetch teams
    let teamsQuery = supabase.from('teams').select('*');
    if (teamIdFilter) {
      teamsQuery = teamsQuery.eq('team_id', teamIdFilter);
    }
    const { data: teamsData, error: teamsErr } = await teamsQuery;
    if (teamsErr) {
      console.error('Error fetching teams for scores API:', teamsErr);
      return NextResponse.json({ success: false, error: 'Database query error fetching teams.' }, { status: 500 });
    }

    // 2. Fetch team members
    const { data: membersData } = await supabase.from('team_members').select('*');

    // 3. Fetch all jury evaluations from Supabase
    const { data: evalsData, error: evalsErr } = await supabase
      .from('jury_evaluations')
      .select('*')
      .order('submitted_at', { ascending: true });

    if (evalsErr) {
      console.error('Error fetching jury evaluations for scores API:', evalsErr);
      return NextResponse.json({ success: false, error: 'Database query error fetching evaluations.' }, { status: 500 });
    }

    // 4. Fetch jury profiles to determine expected juries per panel dynamically from DB
    const { data: juryProfiles } = await supabase
      .from('profiles')
      .select('user_id, jury_id, panel')
      .eq('role', 'jury');

    // Group jury profiles by panel
    const panelJuriesCountMap: Record<string, number> = {};
    (juryProfiles || []).forEach(j => {
      const p = j.panel || '';
      if (p) {
        panelJuriesCountMap[p] = (panelJuriesCountMap[p] || 0) + 1;
      }
    });

    // Group members by team_id
    const membersByTeam: Record<string, any[]> = {};
    (membersData || []).forEach(m => {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push(m);
    });

    // Group evaluations by team_id and deduplicate by jury_id
    const teamEvalsMap: Record<string, any[]> = {};
    (evalsData || []).forEach(e => {
      if (!teamEvalsMap[e.team_id]) {
        teamEvalsMap[e.team_id] = [];
      }
      teamEvalsMap[e.team_id].push(e);
    });

    // 5. Compute team score summary objects dynamically
    const teamScores = (teamsData || []).map(t => {
      const teamId = t.team_id;
      const teamName = t.team_name;
      const panel = t.panel || 'Panel 1';

      const members = membersByTeam[teamId] || [];
      const leadMember = members.find((m: any) => m.is_lead) || members[0];
      const teamLeadName = leadMember ? leadMember.name : (t.completed_by || 'Unknown');

      const rawEvals = teamEvalsMap[teamId] || [];
      
      // Deduplicate evaluations by unique jury_id per team
      const uniqueEvalsMap = new Map<string, any>();
      rawEvals.forEach(ev => {
        const jId = ev.jury_id || ev.evaluation_id;
        uniqueEvalsMap.set(jId, ev);
      });
      const uniqueEvals = Array.from(uniqueEvalsMap.values());
      const submittedCount = uniqueEvals.length;

      // Determine expected juries count dynamically from DB panel assignments
      const panelJuryCount = panelJuriesCountMap[panel] || 0;
      let expectedCount: number | null = null;

      if (panelJuryCount > 0) {
        expectedCount = Math.max(panelJuryCount, submittedCount);
      }

      // Sum actual submitted scores
      const totalScore = uniqueEvals.reduce((sum, ev) => sum + (Number(ev.total_score) || 0), 0);
      const maxPossibleScore = expectedCount !== null ? expectedCount * 100 : null;

      let evaluationsDisplay = '';
      if (expectedCount !== null) {
        evaluationsDisplay = `${submittedCount} / ${expectedCount}`;
      } else {
        evaluationsDisplay = `${submittedCount} Evaluation${submittedCount === 1 ? '' : 's'}`;
      }

      let status: 'Completed' | 'Pending' | 'Not Evaluated' = 'Not Evaluated';
      if (submittedCount === 0) {
        status = 'Not Evaluated';
      } else if (expectedCount !== null && submittedCount >= expectedCount || t.completed_at) {
        status = 'Completed';
      } else {
        status = 'Pending';
      }

      const individualScores = uniqueEvals.map((ev, index) => ({
        eval_index: index + 1,
        evaluation_id: ev.evaluation_id,
        jury_id: ev.jury_id,
        jury_name: ev.jury_name || `Jury ${index + 1}`,
        innovation_score: Number(ev.innovation_score) || 0,
        relevance_score: Number(ev.relevance_score) || 0,
        technical_score: Number(ev.technical_score) || 0,
        presentation_score: Number(ev.presentation_score) || 0,
        qa_score: Number(ev.qa_score) || 0,
        total_score: Number(ev.total_score) || 0,
        max_score: 100,
        comments: ev.comments || '',
        submitted_at: ev.submitted_at
      }));

      return {
        team_id: teamId,
        team_name: teamName,
        team_lead_name: teamLeadName,
        panel: panel,
        evaluations_submitted: submittedCount,
        expected_evaluations: expectedCount,
        evaluations_display: evaluationsDisplay,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        status: status,
        individual_scores: individualScores
      };
    });

    return NextResponse.json({
      success: true,
      total_teams: teamScores.length,
      scores: teamScores
    });

  } catch (err: any) {
    console.error('Error in Admin Scores API route:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
