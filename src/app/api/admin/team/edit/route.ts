import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export interface FieldDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      teamId,
      teamName,
      leadName,
      leadEmail,
      leadIdNumber,
      leadPhone,
      leadGender,
      department,
      year,
      college = 'RGUKT Nuzvid',
      members = [],
      selectedPS = [],
      adminEmail
    } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required.' },
        { status: 400 }
      );
    }

    // --- 1. Admin Authorization Verification ---
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

    // Fetch existing team & members
    const { data: dbTeam, error: fetchTeamError } = await supabase
      .from('teams')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (fetchTeamError || !dbTeam) {
      return NextResponse.json(
        { success: false, error: 'Target team not found in database.' },
        { status: 404 }
      );
    }

    const { data: dbMembers, error: fetchMembersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    if (fetchMembersError || !dbMembers) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch existing team members.' },
        { status: 500 }
      );
    }

    const existingLead = dbMembers.find((m: any) => m.is_lead);

    // --- 2. Input Validations ---
    const trimmedTeamName = (teamName || '').trim();
    if (!trimmedTeamName || !trimmedTeamName.endsWith('_RGUKTN')) {
      return NextResponse.json(
        { success: false, error: 'Team Name is mandatory and must end exactly with "_RGUKTN".' },
        { status: 400 }
      );
    }

    const leadMemberObj = {
      member_id: existingLead?.member_id,
      name: (leadName || '').trim(),
      id_number: (leadIdNumber || '').trim(),
      email: (leadEmail || '').trim(),
      phone: (leadPhone || '').trim(),
      department: department || 'Computer Science & Engineering (CSE)',
      year: year || 'E3 (3rd Year)',
      gender: leadGender || 'M',
      is_lead: true
    };

    const formattedMembers = members.map((m: any) => ({
      member_id: m.member_id,
      name: (m.name || '').trim(),
      id_number: (m.id_number || m.roll_number || '').trim(),
      email: (m.email || '').trim(),
      phone: (m.phone || '').trim(),
      department: m.department || department,
      year: m.year || year,
      gender: m.gender || 'M',
      is_lead: false
    }));

    const allSubmittedMembers = [leadMemberObj, ...formattedMembers];

    if (allSubmittedMembers.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Every team must have exactly 6 members (1 Team Lead and 5 Team Members).' },
        { status: 400 }
      );
    }

    let hasFemale = false;
    for (let i = 0; i < allSubmittedMembers.length; i++) {
      const m = allSubmittedMembers[i];
      const roleLabel = m.is_lead ? 'Team Lead' : `Team Member #${i}`;

      if (!m.name || !m.id_number || !m.email || !m.phone || !m.department || !m.year || !m.gender) {
        return NextResponse.json(
          { success: false, error: `Missing details: All fields (Name, ID, Email, Phone, Dept, Year, Gender) are required for ${roleLabel}.` },
          { status: 400 }
        );
      }

      if (!m.email.toLowerCase().endsWith('@rguktn.ac.in')) {
        return NextResponse.json(
          { success: false, error: `Institutional email must end with @rguktn.ac.in. Invalid email: ${m.email} (${roleLabel}).` },
          { status: 400 }
        );
      }

      if (m.gender === 'F') {
        hasFemale = true;
      }
    }

    if (!hasFemale) {
      return NextResponse.json(
        { success: false, error: 'Gender Requirement Violation: Team must contain at least one female member.' },
        { status: 400 }
      );
    }

    if (!selectedPS || selectedPS.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least 1 Problem Statement selection is mandatory.' },
        { status: 400 }
      );
    }

    // --- 3. Compute Diffs for Audit ---
    const diffs: FieldDiff[] = [];

    if (dbTeam.team_name !== trimmedTeamName) {
      diffs.push({
        field: 'Team Name',
        oldValue: dbTeam.team_name,
        newValue: trimmedTeamName
      });
    }

    for (let i = 0; i < allSubmittedMembers.length; i++) {
      const submitted = allSubmittedMembers[i];
      let existing: any = null;
      if (submitted.member_id) {
        existing = dbMembers.find((m: any) => m.member_id === submitted.member_id);
      }
      if (!existing && submitted.is_lead) {
        existing = existingLead;
      }

      const memberRoleLabel = submitted.is_lead ? 'Team Lead' : `Member #${i}`;

      if (existing) {
        if (existing.name !== submitted.name) {
          diffs.push({ field: `${memberRoleLabel} Name`, oldValue: existing.name || '', newValue: submitted.name });
        }
        if (existing.roll_number !== submitted.id_number) {
          diffs.push({ field: `${memberRoleLabel} ID Number`, oldValue: existing.roll_number || '', newValue: submitted.id_number });
        }
        if (existing.email !== submitted.email) {
          diffs.push({ field: `${memberRoleLabel} Email`, oldValue: existing.email || '', newValue: submitted.email });
        }
        if (existing.phone !== submitted.phone) {
          diffs.push({ field: `${memberRoleLabel} Phone`, oldValue: existing.phone || '', newValue: submitted.phone });
        }
        if (existing.department !== submitted.department) {
          diffs.push({ field: `${memberRoleLabel} Department`, oldValue: existing.department || '', newValue: submitted.department });
        }
        if (existing.year !== submitted.year) {
          diffs.push({ field: `${memberRoleLabel} Year`, oldValue: existing.year || '', newValue: submitted.year });
        }
        if ((existing.gender || 'M') !== submitted.gender) {
          diffs.push({ field: `${memberRoleLabel} Gender`, oldValue: existing.gender || 'M', newValue: submitted.gender });
        }
      }
    }

    const { data: dbPSMappings } = await supabase
      .from('team_problem_statements')
      .select('*, problem_statements(*)')
      .eq('team_id', teamId);

    const existingPSIds = (dbPSMappings || []).map((m: any) => m.problem_id).join(', ');
    const newPSIds = selectedPS.map((ps: any) => ps.problem_id).join(', ');

    if (existingPSIds !== newPSIds) {
      diffs.push({
        field: 'Selected Problem Statements',
        oldValue: existingPSIds || 'None',
        newValue: newPSIds
      });
    }

    // --- 4. Perform Surgical Database Updates ---

    // Step A: Update Team Name if modified
    if (dbTeam.team_name !== trimmedTeamName) {
      const { error: updateTeamErr } = await supabase
        .from('teams')
        .update({ team_name: trimmedTeamName })
        .eq('team_id', teamId);

      if (updateTeamErr) {
        console.error('Failed to update team record:', updateTeamErr);
        return NextResponse.json(
          { success: false, error: `Database Update Error (Team): ${updateTeamErr.message}` },
          { status: 500 }
        );
      }
    }

    // Step B: Update Team Members surgically by member_id or is_lead
    for (let i = 0; i < allSubmittedMembers.length; i++) {
      const subMember = allSubmittedMembers[i];
      let targetDbMember: any = null;

      if (subMember.member_id) {
        targetDbMember = dbMembers.find((m: any) => m.member_id === subMember.member_id);
      }
      if (!targetDbMember && subMember.is_lead) {
        targetDbMember = existingLead;
      }

      const memberPayload: any = {
        name: subMember.name,
        roll_number: subMember.id_number,
        email: subMember.email,
        phone: subMember.phone,
        department: subMember.department,
        year: subMember.year,
        gender: subMember.gender || 'M',
        is_lead: subMember.is_lead
      };

      if (targetDbMember?.member_id) {
        let { error: updateMemberErr } = await supabase
          .from('team_members')
          .update(memberPayload)
          .eq('member_id', targetDbMember.member_id);

        if (updateMemberErr && updateMemberErr.message?.toLowerCase().includes('gender')) {
          const fallbackPayload = { ...memberPayload };
          delete fallbackPayload.gender;
          const retryRes = await supabase
            .from('team_members')
            .update(fallbackPayload)
            .eq('member_id', targetDbMember.member_id);
          updateMemberErr = retryRes.error;
        }

        if (updateMemberErr) {
          console.error(`Failed to update member ${targetDbMember.member_id}:`, updateMemberErr);
          return NextResponse.json(
            { success: false, error: `Database Update Error (Member ${subMember.name}): ${updateMemberErr.message}` },
            { status: 500 }
          );
        }
      } else {
        let { error: insertMemberErr } = await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            ...memberPayload
          });

        if (insertMemberErr && insertMemberErr.message?.toLowerCase().includes('gender')) {
          const fallbackPayload = { ...memberPayload };
          delete fallbackPayload.gender;
          const retryRes = await supabase
            .from('team_members')
            .insert({
              team_id: teamId,
              ...fallbackPayload
            });
          insertMemberErr = retryRes.error;
        }

        if (insertMemberErr) {
          console.error(`Failed to insert member ${subMember.name}:`, insertMemberErr);
          return NextResponse.json(
            { success: false, error: `Database Insert Error (Member ${subMember.name}): ${insertMemberErr.message}` },
            { status: 500 }
          );
        }
      }
    }

    // Sync profiles table if lead email/name modified
    if (existingLead?.email) {
      if (leadMemberObj.email !== existingLead.email || leadMemberObj.name !== existingLead.name) {
        await supabase
          .from('profiles')
          .update({ name: leadMemberObj.name, email: leadMemberObj.email })
          .eq('email', existingLead.email);
      }
    }

    // Step C: Update Problem Statements & Mapping
    if (selectedPS && selectedPS.length > 0) {
      const psUpserts = selectedPS.map((ps: any) => ({
        problem_id: ps.problem_id,
        problem_title: ps.problem_title,
        description: ps.description || ps.problem_title,
        domain: ps.domain || 'General',
        category: ps.category || 'Software'
      }));

      await supabase.from('problem_statements').upsert(psUpserts);
      await supabase.from('team_problem_statements').delete().eq('team_id', teamId);

      const mappingInserts = selectedPS.map((ps: any, idx: number) => ({
        team_id: teamId,
        problem_id: ps.problem_id,
        selection_order: idx + 1
      }));

      await supabase.from('team_problem_statements').insert(mappingInserts);
    }

    // --- 5. Insert Audit Logs ---
    const timestamp = new Date().toISOString();
    if (diffs.length > 0) {
      const auditPayloads = diffs.map(d => ({
        team_id: teamId,
        action: 'ADMIN_TEAM_EDIT',
        previous_value: `${d.field}: ${d.oldValue}`,
        new_value: `${d.field}: ${d.newValue}`,
        reason: `Registration detail '${d.field}' edited by Admin (${requesterEmail || 'Admin'})`,
        timestamp: timestamp
      }));

      await supabase.from('audit_logs').insert(auditPayloads);
    }

    // Re-fetch updated team members from DB to construct exact response
    const { data: finalDbMembers } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    const sortedFinalMembers = (finalDbMembers || []).map((m: any) => ({
      member_id: m.member_id,
      team_id: m.team_id,
      name: m.name,
      id_number: m.roll_number,
      email: m.email,
      phone: m.phone,
      department: m.department,
      year: m.year,
      is_lead: !!m.is_lead,
      gender: m.gender || 'M'
    })).sort((a: any, b: any) => {
      if (a.is_lead && !b.is_lead) return -1;
      if (!a.is_lead && b.is_lead) return 1;
      return (a.member_id || '').localeCompare(b.member_id || '');
    });

    const finalLead = sortedFinalMembers.find((m: any) => m.is_lead);

    const updatedTeamObj: any = {
      ...dbTeam,
      team_name: trimmedTeamName,
      team_lead_name: finalLead?.name || leadName,
      team_lead_email: finalLead?.email || leadEmail,
      team_lead_phone: finalLead?.phone || leadPhone,
      department: finalLead?.department || department,
      year: finalLead?.year || year,
      college: 'RGUKT Nuzvid',
      members: sortedFinalMembers,
      selected_problem_statements: selectedPS
    };

    return NextResponse.json({
      success: true,
      teamId,
      updatedTeam: updatedTeamObj,
      diffs,
      message: 'Team registration details updated successfully by Admin with zero data loss.'
    });

  } catch (err: any) {
    console.error('Error in admin edit team API route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
