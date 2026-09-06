import { supabase } from '@/lib/supabase/client';

export type VerifiedRole = 'admin' | 'coordinator' | 'jury' | 'team_lead' | 'team_member' | 'unregistered';

export interface RoleVerificationResult {
  role: VerifiedRole;
  email: string;
  name?: string;
  team_id?: string | null;
  panel?: string | null;
  jury_id?: string | null;
  is_lead?: boolean;
}

const ADMIN_EMAILS = ['n220615@rguktn.ac.in', 'vasuch9959@rguktn.ac.in'];

export async function verifyUserRoleFromDatabase(
  email: string,
  hintRole?: string,
  extraDetails?: { jury_id?: string; panel?: string; name?: string }
): Promise<RoleVerificationResult> {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 0. Special Multi-Role Accounts: vasuch9959@rguktn.ac.in & n220615@rguktn.ac.in (Access to Admin, Coordinator, Jury, Team Lead)
  const isAuthorizedAdminEmail = ADMIN_EMAILS.includes(cleanEmail);
  if (isAuthorizedAdminEmail) {
    const targetRole = (hintRole as VerifiedRole) || 'admin';
    const defaultName = cleanEmail.includes('n220615') ? 'Jhanu (All Roles Authorized)' : 'Vasu (All Roles Authorized)';
    return {
      role: targetRole,
      email: cleanEmail,
      name: extraDetails?.name || defaultName,
      panel: extraDetails?.panel || 'Panel 1',
      jury_id: extraDetails?.jury_id || `jury-${cleanEmail.split('@')[0]}`
    };
  }

  // Sanitize hintRole: non-admin emails cannot use 'admin' hintRole
  const safeHintRole = hintRole === 'admin' ? undefined : hintRole;

  // 1. Check Coordinator status
  if (
    safeHintRole === 'coordinator' ||
    cleanEmail.startsWith('panel') ||
    cleanEmail.endsWith('@sih.local')
  ) {
    let panelName = extraDetails?.panel || 'Panel 1';
    if (cleanEmail === 'panel1@sih.local' || cleanEmail === 'panel1') panelName = 'Panel 1';
    if (cleanEmail === 'panel2@sih.local' || cleanEmail === 'panel2') panelName = 'Panel 2';
    if (cleanEmail === 'panel3@sih.local' || cleanEmail === 'panel3') panelName = 'Panel 3';

    return {
      role: 'coordinator',
      email: cleanEmail,
      name: extraDetails?.name || `${panelName} Coordinator`,
      panel: panelName
    };
  }

  // 2. Check Jury status
  if (safeHintRole === 'jury' || cleanEmail.endsWith('@jury.sih.local')) {
    return {
      role: 'jury',
      email: cleanEmail,
      name: extraDetails?.name || extraDetails?.jury_id || 'Jury Panelist',
      jury_id: extraDetails?.jury_id || `jury-${cleanEmail.split('@')[0]}`
    };
  }

  // 3. Database Lookup in Supabase: Check profiles table first for jury/coordinator role overrides
  try {
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (dbProfile) {
      if (dbProfile.role === 'coordinator') {
        return { role: 'coordinator', email: cleanEmail, name: dbProfile.name, panel: dbProfile.panel };
      }
      if (dbProfile.role === 'jury') {
        return { role: 'jury', email: cleanEmail, name: dbProfile.name, jury_id: dbProfile.jury_id };
      }
    }
  } catch (err) {
    console.error('Error querying profiles in role verification:', err);
  }

  // 5. Database Lookup in Supabase: Query team_members table to determine Team Lead vs Team Member
  if (cleanEmail) {
    try {
      const { data: memberMatches } = await supabase
        .from('team_members')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1);

      if (memberMatches && memberMatches.length > 0) {
        const member = memberMatches[0];
        const isLead = !!member.is_lead;
        return {
          role: isLead ? 'team_lead' : 'team_member',
          email: cleanEmail,
          name: member.name,
          team_id: member.team_id,
          is_lead: isLead
        };
      }
    } catch (err) {
      console.error('Error querying team_members in role verification:', err);
    }
  }

  // 6. Default fallback for authenticated email not found in team_members
  return {
    role: hintRole === 'team_lead' ? 'team_lead' : 'unregistered',
    email: cleanEmail,
    name: extraDetails?.name || 'Authenticated User'
  };
}
