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
      updatedByEmail
    } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required.' },
        { status: 400 }
      );
    }

    // --- 1. Ownership & Authorization Verification ---
    // Fetch existing team & members from database to verify ownership
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
    const registeredLeadEmail = (existingLead?.email || '').trim().toLowerCase();
    const requesterEmail = (updatedByEmail || '').trim().toLowerCase();

    // Verify ownership: requester must match registered team lead email
    if (!registeredLeadEmail || registeredLeadEmail !== requesterEmail) {
      return NextResponse.json(
        {
          success: false,
          error: `Unauthorized Access: Only the registered Team Lead (${registeredLeadEmail || 'unknown'}) is permitted to edit registration details.`
        },
        { status: 403 }
      );
    }

    // --- 2. Input Validations ---

    // Team Name validation: must end with _RGUKTN
    const trimmedTeamName = (teamName || '').trim();
    if (!trimmedTeamName || !trimmedTeamName.endsWith('_RGUKTN')) {
      return NextResponse.json(
        { success: false, error: 'Team Name is mandatory and must end exactly with "_RGUKTN".' },
        { status: 400 }
      );
    }

    // Combine lead member + 5 additional members
    const leadMemberObj = {
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

    // Exactly 6 members validation
    if (allSubmittedMembers.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Every team must have exactly 6 members (1 Team Lead and 5 Team Members).' },
        { status: 400 }
      );
    }

    // Required fields & email domain validation for all members
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

    // Gender requirement validation
    if (!hasFemale) {
      return NextResponse.json(
        { success: false, error: 'Gender Requirement Violation: Team must contain at least one female member.' },
        { status: 400 }
      );
    }

    // Problem statements check
    if (!selectedPS || selectedPS.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least 1 Problem Statement selection is mandatory.' },
        { status: 400 }
      );
    }

    // --- 3. Compute Diffs for Audit & Email ---
    const diffs: FieldDiff[] = [];

    // Check Team Name change
    if (dbTeam.team_name !== trimmedTeamName) {
      diffs.push({
        field: 'Team Name',
        oldValue: dbTeam.team_name,
        newValue: trimmedTeamName
      });
    }

    // Compare Members (1 lead + 5 members)
    // Sort existing dbMembers so lead is first, then by roll_number/member_id
    const sortedDbMembers = [...dbMembers].sort((a: any, b: any) => {
      if (a.is_lead) return -1;
      if (b.is_lead) return 1;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    for (let i = 0; i < allSubmittedMembers.length; i++) {
      const submitted = allSubmittedMembers[i];
      const existing = sortedDbMembers[i];
      const memberRoleLabel = submitted.is_lead ? 'Team Lead' : `Member #${i}`;

      if (existing) {
        if (existing.name !== submitted.name) {
          diffs.push({
            field: `${memberRoleLabel} Name`,
            oldValue: existing.name || '',
            newValue: submitted.name
          });
        }
        if (existing.roll_number !== submitted.id_number) {
          diffs.push({
            field: `${memberRoleLabel} ID Number`,
            oldValue: existing.roll_number || '',
            newValue: submitted.id_number
          });
        }
        if (existing.email !== submitted.email) {
          diffs.push({
            field: `${memberRoleLabel} Email`,
            oldValue: existing.email || '',
            newValue: submitted.email
          });
        }
        if (existing.phone !== submitted.phone) {
          diffs.push({
            field: `${memberRoleLabel} Phone`,
            oldValue: existing.phone || '',
            newValue: submitted.phone
          });
        }
        if (existing.department !== submitted.department) {
          diffs.push({
            field: `${memberRoleLabel} Department`,
            oldValue: existing.department || '',
            newValue: submitted.department
          });
        }
        if (existing.year !== submitted.year) {
          diffs.push({
            field: `${memberRoleLabel} Year`,
            oldValue: existing.year || '',
            newValue: submitted.year
          });
        }
        if ((existing.gender || 'M') !== submitted.gender) {
          diffs.push({
            field: `${memberRoleLabel} Gender`,
            oldValue: existing.gender || 'M',
            newValue: submitted.gender
          });
        }
      }
    }

    // Compare Problem Statements
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

    // Step A: Update Team Name if modified (preserve panel, slides, status, completed_at, etc.)
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

    // Step B: Update Team Members surgically by member_id
    for (let i = 0; i < allSubmittedMembers.length; i++) {
      const subMember = allSubmittedMembers[i];
      const dbMember = sortedDbMembers[i];

      const memberPayload = {
        name: subMember.name,
        roll_number: subMember.id_number,
        email: subMember.email,
        phone: subMember.phone,
        department: subMember.department,
        year: subMember.year,
        is_lead: subMember.is_lead
      };

      if (dbMember?.member_id) {
        // Update existing member record by unique member_id
        const { error: updateMemberErr } = await supabase
          .from('team_members')
          .update(memberPayload)
          .eq('member_id', dbMember.member_id);

        if (updateMemberErr) {
          console.error(`Failed to update member ${dbMember.member_id}:`, updateMemberErr);
          return NextResponse.json(
            { success: false, error: `Database Update Error (Member ${subMember.name}): ${updateMemberErr.message}` },
            { status: 500 }
          );
        }
      } else {
        // Insert new member record if not existing
        const { error: insertMemberErr } = await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            ...memberPayload
          });

        if (insertMemberErr) {
          console.error(`Failed to insert member ${subMember.name}:`, insertMemberErr);
          return NextResponse.json(
            { success: false, error: `Database Insert Error (Member ${subMember.name}): ${insertMemberErr.message}` },
            { status: 500 }
          );
        }
      }
    }

    // Step C: Update Problem Statements & Mapping
    if (selectedPS && selectedPS.length > 0) {
      // 1. Upsert problem statement definitions
      const psUpserts = selectedPS.map((ps: any) => ({
        problem_id: ps.problem_id,
        problem_title: ps.problem_title,
        description: ps.description || ps.problem_title,
        domain: ps.domain || 'General',
        category: ps.category || 'Software'
      }));

      const { error: psUpsertErr } = await supabase
        .from('problem_statements')
        .upsert(psUpserts);

      if (psUpsertErr) {
        console.error('Failed to upsert PS definitions:', psUpsertErr);
      }

      // 2. Clean existing mappings for team and insert updated mappings
      await supabase.from('team_problem_statements').delete().eq('team_id', teamId);

      const mappingInserts = selectedPS.map((ps: any, idx: number) => ({
        team_id: teamId,
        problem_id: ps.problem_id,
        selection_order: idx + 1
      }));

      const { error: mapInsertErr } = await supabase
        .from('team_problem_statements')
        .insert(mappingInserts);

      if (mapInsertErr) {
        console.error('Failed to insert PS mappings:', mapInsertErr);
      }
    }

    // --- 5. Insert Audit Logs ---
    const timestamp = new Date().toISOString();
    if (diffs.length > 0) {
      const auditPayloads = diffs.map(d => ({
        team_id: teamId,
        action: 'TEAM_REGISTRATION_EDIT',
        previous_value: `${d.field}: ${d.oldValue}`,
        new_value: `${d.field}: ${d.newValue}`,
        reason: `Registration detail '${d.field}' edited by Team Lead (${requesterEmail})`,
        timestamp: timestamp
      }));

      const { error: auditErr } = await supabase
        .from('audit_logs')
        .insert(auditPayloads);

      if (auditErr) {
        console.error('Failed to insert audit log entries:', auditErr);
      }
    }

    // --- 6. Send Nodemailer Confirmation Email ---
    if (diffs.length > 0) {
      try {
        const smtpUser = process.env.SMTP_EMAIL || 'sdchandu213@gmail.com';
        const smtpPass = (process.env.SMTP_PASSWORD || 'sqnl fulx nhjl lvqi').replace(/\s+/g, '');

        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const diffRowsHtml = diffs.map(d => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #334155;">${d.field}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #e11d48; text-decoration: line-through;">${d.oldValue || '(Empty)'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #16a34a;">${d.newValue}</td>
          </tr>
        `).join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
              .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
              .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
              .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
              .content { padding: 28px 24px; }
              .diff-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; font-size: 13px; }
              .diff-table th { background: #f1f5f9; padding: 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
              .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>RGUKT Nuzvid — SIH 2026</h1>
                <p>Team Registration Details Updated</p>
              </div>
              <div class="content">
                <p style="font-size: 14px; font-weight: 600;">Dear ${leadName},</p>
                <p style="font-size: 13px; color: #475569; line-height: 1.6;">
                  This email confirms that your team registration details for <strong>"${trimmedTeamName}"</strong> (Team ID: <strong style="color: #2563eb;">${teamId}</strong>) have been updated successfully.
                </p>
                <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 20px;">Summary of Modified Fields:</p>
                <table class="diff-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Previous Value</th>
                      <th>Updated Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${diffRowsHtml}
                  </tbody>
                </table>
                <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                  All unchanged team members, PPT submissions, panel assignments, and evaluation data remain intact.
                </p>
              </div>
              <div class="footer">
                © 2026 Rajiv Gandhi University of Knowledge Technologies (RGUKT) Nuzvid. All rights reserved.
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `"SIH RGUKT Nuzvid 2026" <${smtpUser}>`,
          to: leadEmail,
          subject: `[SIH 2026] Team Registration Updated — ${teamId} (${trimmedTeamName})`,
          html: emailHtml
        });
      } catch (emailErr) {
        console.error('Failed to send edit notification email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      teamId,
      diffs,
      message: 'Team registration details updated successfully with surgical data preservation.'
    });

  } catch (err: any) {
    console.error('Error in edit team API route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
