import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      teamName,
      leadName,
      leadEmail,
      leadIdNumber,
      leadPhone,
      leadGender,
      department,
      year,
      college,
      members = [],
      selectedPS = []
    } = body;

    // --- Backend Validations ---

    // 1. Team Name must end exactly with _RGUKTN
    if (!teamName || !teamName.endsWith('_RGUKTN')) {
      return NextResponse.json(
        { success: false, error: 'Team Name is mandatory and must end exactly with _RGUKTN.' },
        { status: 400 }
      );
    }

    // Combine lead and members to validate
    const leadMember = {
      name: leadName,
      id_number: leadIdNumber,
      email: leadEmail,
      phone: leadPhone,
      department,
      year,
      gender: leadGender,
      is_lead: true
    };

    const allMembers = [leadMember, ...members];

    // 2. Exactly 6 members mandatory
    if (allMembers.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Every team must have exactly 6 members (1 Team Lead and 5 Team Members).' },
        { status: 400 }
      );
    }

    // 3. Validate all fields populated, email ends with @rguktn.ac.in
    let hasFemale = false;
    for (let i = 0; i < allMembers.length; i++) {
      const m = allMembers[i];
      const label = m.is_lead ? 'Team Lead' : `Team Member #${i}`;

      if (!m.name?.trim() || !m.id_number?.trim() || !m.email?.trim() || !m.phone?.trim() || !m.department || !m.year || !m.gender) {
        return NextResponse.json(
          { success: false, error: `All fields are required for all 6 members. Missing details for ${label}.` },
          { status: 400 }
        );
      }

      if (!m.email.endsWith('@rguktn.ac.in')) {
        return NextResponse.json(
          { success: false, error: `Institutional email must end with @rguktn.ac.in. Invalid email: ${m.email} (${label}).` },
          { status: 400 }
        );
      }

      if (m.gender === 'F') {
        hasFemale = true;
      }
    }

    // 4. At least one female member required
    if (!hasFemale) {
      return NextResponse.json(
        { success: false, error: 'Gender Requirement: Every team must contain at least one female member.' },
        { status: 400 }
      );
    }

    // 5. Mandatory problem statement
    if (!selectedPS || selectedPS.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least 1 Problem Statement selection is mandatory.' },
        { status: 400 }
      );
    }

    // --- Generate identifiers ---
    const { count, error: countError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting teams for registration order:', countError);
    }

    const orderNumber = ((count || 0) + 1).toString().padStart(3, '0');
    const primaryPS = selectedPS[0];
    const psId = primaryPS ? primaryPS.problem_id : 'NO-PS';
    const generatedTeamId = `${teamName}_${psId}_${orderNumber}`;

    // --- Insert into Database ---
    // 1. Insert team
    const { error: teamDbError } = await supabase
      .from('teams')
      .insert({
        team_id: generatedTeamId,
        team_name: teamName,
        registration_status: 'registered'
      });

    if (teamDbError) {
      console.error('Teams DB Error:', teamDbError);
      return NextResponse.json({ success: false, error: `Database error (Teams): ${teamDbError.message}` }, { status: 500 });
    }

    // 2. Insert team members
    const memberInserts = allMembers.map(m => ({
      team_id: generatedTeamId,
      name: m.name,
      roll_number: m.id_number,
      email: m.email,
      phone: m.phone,
      department: m.department,
      year: m.year,
      is_lead: !!m.is_lead
    }));

    const { error: membersDbError } = await supabase
      .from('team_members')
      .insert(memberInserts);

    if (membersDbError) {
      console.error('Members DB Error:', membersDbError);
      return NextResponse.json({ success: false, error: `Database error (Members): ${membersDbError.message}` }, { status: 500 });
    }

    // 3. Upsert problem statements & map
    const { error: psDbError } = await supabase
      .from('problem_statements')
      .upsert(selectedPS.map((ps: any) => ({
        problem_id: ps.problem_id,
        problem_title: ps.problem_title,
        description: ps.description || ps.problem_title,
        domain: ps.domain || 'General',
        category: ps.category || 'Software'
      })));

    if (psDbError) {
      console.error('PS DB Error:', psDbError);
      return NextResponse.json({ success: false, error: `Database error (Problem Statements): ${psDbError.message}` }, { status: 500 });
    }

    const mappingInserts = selectedPS.map((ps: any, idx: number) => ({
      team_id: generatedTeamId,
      problem_id: ps.problem_id,
      selection_order: idx + 1
    }));

    const { error: mappingDbError } = await supabase
      .from('team_problem_statements')
      .insert(mappingInserts);

    if (mappingDbError) {
      console.error('PS Mapping DB Error:', mappingDbError);
      return NextResponse.json({ success: false, error: `Database error (PS Mappings): ${mappingDbError.message}` }, { status: 500 });
    }

    // --- Send Email internally ---
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

      const qrImagePath = path.join(process.cwd(), 'public', 'whatsapp-qr.png');
      const attachments = [];

      if (fs.existsSync(qrImagePath)) {
        attachments.push({
          filename: 'whatsapp-qr.png',
          path: qrImagePath,
          cid: 'whatsapp-qr'
        });
      }

      const whatsappLink = 'https://chat.whatsapp.com/Ckfq83LH8Jf1sknV0E7SYe';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.025em; }
            .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
            .content { padding: 32px 24px; }
            .welcome-text { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
            .details-card { background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #cbd5e1; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
            .details-label { color: #64748b; font-weight: 600; }
            .details-value { font-weight: 700; color: #0f172a; }
            .cred-box { background: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
            .cred-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #4338ca; letter-spacing: 0.05em; text-align: center; }
            .btn-login { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-align: center; margin-bottom: 24px; }
            .whatsapp-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; text-align: center; margin-top: 24px; }
            .whatsapp-title { color: #166534; font-size: 16px; font-weight: 800; margin-bottom: 6px; }
            .whatsapp-desc { color: #15803d; font-size: 12px; margin-bottom: 16px; line-height: 1.5; }
            .qr-img { width: 180px; height: auto; border-radius: 12px; border: 2px solid #22c55e; margin: 12px auto; display: block; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .wa-btn { display: inline-block; background: #22c55e; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 24px; border-radius: 8px; margin-top: 10px; }
            .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            .roster-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            .roster-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
            .roster-table th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
            .roster-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RGUKT Nuzvid — SIH 2026</h1>
              <p>Smart India Hackathon — Internal Hackathon Registration</p>
            </div>
            
            <div class="content">
              <div class="welcome-text">Dear ${leadName},</div>
              <p style="font-size: 13px; color: #475569; line-height: 1.6;">
                Congratulations! Your team <strong>"${teamName}"</strong> has been successfully registered for the <strong>Smart India Hackathon — Internal Hackathon 2026</strong> at RGUKT Nuzvid.
              </p>

              <div class="details-card">
                <div class="details-row"><span class="details-label">Assigned Team ID:</span><span class="details-value" style="color: #4f46e5;">${generatedTeamId}</span></div>
                <div class="details-row"><span class="details-label">Team Lead ID Number:</span><span class="details-value">${leadIdNumber}</span></div>
                <div class="details-row"><span class="details-label">Department:</span><span class="details-value">${department}</span></div>
                <div class="details-row"><span class="details-label">Registered Email:</span><span class="details-value">${leadEmail}</span></div>
              </div>

              <div class="cred-box">
                <div class="cred-label">Team Portal Access</div>
                <p style="margin-top: 8px; font-size: 13px; color: #3730a3; line-height: 1.5; text-align: center;">
                  Authentication is secured via Google OAuth. Please sign in to the portal using your registered Google account: <strong>${leadEmail}</strong>.
                </p>
              </div>

              <div class="roster-title">Registered Team Members</div>
              <table class="roster-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Dept & Year</th>
                  </tr>
                </thead>
                <tbody>
                  ${allMembers.map((m: any) => `
                    <tr>
                      <td style="font-weight: bold; color: ${m.is_lead ? '#4f46e5' : '#334155'};">
                        ${m.is_lead ? 'Team Lead' : 'Member'}
                      </td>
                      <td style="font-weight: 600; color: #0f172a;">${m.name}</td>
                      <td style="text-align: center;">${m.gender || 'M'}</td>
                      <td>${m.email}</td>
                      <td>${m.phone}</td>
                      <td>${m.department}<br/><span style="font-size: 10px; color: #64748b;">${m.year}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="text-align: center;">
                <a href="http://localhost:3000/login" class="btn-login">Login to Team Portal</a>
              </div>

              <div class="whatsapp-section">
                <div class="whatsapp-title">📱 Join Official Team Leaders WhatsApp Group</div>
                <div class="whatsapp-desc">
                  It is <strong>mandatory for all Team Leaders</strong> to join the official SIH 2026 WhatsApp Group for real-time announcements, presentation slot schedules, and coordinator instructions.
                </div>

                ${fs.existsSync(qrImagePath) ? '<img src="cid:whatsapp-qr" alt="WhatsApp Group QR Code" class="qr-img" />' : ''}

                <div>
                  <a href="${whatsappLink}" target="_blank" class="wa-btn">Join WhatsApp Group Now</a>
                </div>
                <div style="font-size: 11px; color: #16a34a; margin-top: 8px; font-weight: 600;">
                  Or scan the QR code above using your WhatsApp camera.
                </div>
              </div>

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
        subject: `[SIH 2026] Team Registration Confirmed — ${generatedTeamId} (${teamName})`,
        html: htmlContent,
        attachments: attachments
      });
    } catch (emailErr) {
      console.error('Nodemailer failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      teamId: generatedTeamId,
      allMembers
    });
  } catch (error: any) {
    console.error('Registration route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
