const XLSX = require('xlsx');
const path = require('path');

async function seed() {
  const filePath = path.join(__dirname, '..', '..', '..', 'SIH-2026 TOP 50.xlsx');
  const wb = XLSX.readFile(filePath);
  const top50 = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  console.log('Read', top50.length, 'teams from', filePath);

  const supabaseUrl = 'https://jftragfdpepzpybzleat.supabase.co';
  const supabaseKey = 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

  // 1. Fetch DB teams, leads, and problem statements
  const [dbTeamsRes, dbLeadsRes, dbPSRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/teams?select=team_id,team_name`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    }),
    fetch(`${supabaseUrl}/rest/v1/team_members?is_lead=eq.true&select=team_id,name`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    }),
    fetch(`${supabaseUrl}/rest/v1/problem_statements?select=problem_id,problem_title,category,domain`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    })
  ]);

  const dbTeams = await dbTeamsRes.json();
  const dbLeads = await dbLeadsRes.json();
  const dbPS = await dbPSRes.json();

  const psMap = new Map();
  dbPS.forEach(p => {
    psMap.set(p.problem_id.trim().toUpperCase(), p);
  });

  function clean(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const finalRows = [];
  const teamsToUpsert = [];
  const teamUpdates = [];

  for (let i = 0; i < top50.length; i++) {
    const t = top50[i];
    const rawName = (t['Team Name'] || t['team_name'] || '').trim();
    const rawLead = (t['Team Lead'] || t['Team Lead Name'] || t['team_lead'] || '').trim();
    const psId = (t['Problem Statement ID'] || t['PS ID'] || t['problem_id'] || '').trim().toUpperCase();

    // 1. Exact or cleaned name match
    let match = dbTeams.find(d => d.team_name.toLowerCase() === rawName.toLowerCase());
    if (!match) match = dbTeams.find(d => clean(d.team_name) === clean(rawName));
    
    // 2. Lead name fallback
    if (!match && rawLead) {
      const leadMatch = dbLeads.find(l => clean(l.name) === clean(rawLead));
      if (leadMatch) match = dbTeams.find(d => d.team_id === leadMatch.team_id);
    }

    let teamId;
    if (match) {
      teamId = match.team_id;
    } else {
      teamId = `${rawName.replace(/[^a-zA-Z0-9]/g, '_')}_RGUKTN_TOP50`;
      teamsToUpsert.push({
        team_id: teamId,
        team_name: rawName,
        registration_status: 'registered',
        created_at: new Date().toISOString()
      });
    }

    const psObj = psMap.get(psId);
    const problemTitle = psObj?.problem_title || `Problem Statement ${psId}`;
    const category = psObj?.category || 'Software';

    const overrideMeta = {
      reason: 'Official SIH-2026 Top 50 Selected Teams List',
      team_name: rawName,
      team_lead_name: rawLead,
      problem_id: psId,
      problem_title: problemTitle,
      category: category,
      index: i + 1
    };

    finalRows.push({
      team_id: teamId,
      selected: true,
      admin_override: true,
      override_reason: JSON.stringify(overrideMeta),
      updated_at: new Date().toISOString()
    });
  }

  // Insert any missing teams into public.teams first
  if (teamsToUpsert.length > 0) {
    console.log('Inserting', teamsToUpsert.length, 'new teams into public.teams...');
    await fetch(`${supabaseUrl}/rest/v1/teams`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(teamsToUpsert)
    });
  }

  // Upsert into final_results
  console.log('Upserting', finalRows.length, 'rows into final_results...');
  const res = await fetch(`${supabaseUrl}/rest/v1/final_results`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates'
    },
    body: JSON.stringify(finalRows)
  });

  const saved = await res.json();
  console.log('Final results response status:', res.status);
  console.log('Saved count in Supabase final_results:', Array.isArray(saved) ? saved.length : saved);
}

seed().catch(console.error);
