const XLSX = require('xlsx');

async function testMatch() {
  const supabaseUrl = 'https://jftragfdpepzpybzleat.supabase.co';
  const supabaseKey = 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

  const [teamsRes, resultsRes, membersRes] = await Promise.all([
    fetch(supabaseUrl + '/rest/v1/teams?select=team_id,team_name', {
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
    }),
    fetch(supabaseUrl + '/rest/v1/final_results?select=*', {
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
    }),
    fetch(supabaseUrl + '/rest/v1/team_members?is_lead=eq.true&select=team_id,name', {
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
    })
  ]);

  const dbTeams = await teamsRes.json();
  const dbResults = await resultsRes.json();
  const dbLeads = await membersRes.json();

  console.log('dbTeams:', dbTeams.length);
  console.log('dbResults:', dbResults.length);

  const wb = XLSX.readFile('h:/SIH_RGUKTN/SIH-2026 TOP 50.xlsx');
  const excelData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  function clean(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const matched = [];
  const unmatched = [];

  for (const row of excelData) {
    const rawName = row['Team Name'] || '';
    const rawLead = row['Team Lead'] || row['Team Lead Name'] || '';
    const ps = row['Problem Statement ID'] || row['PS ID'] || '';

    let match = dbTeams.find(t => t.team_name.toLowerCase() === rawName.toLowerCase());
    if (!match) match = dbTeams.find(t => clean(t.team_name) === clean(rawName));
    if (!match && rawLead) {
      const leadMatch = dbLeads.find(l => clean(l.name) === clean(rawLead));
      if (leadMatch) match = dbTeams.find(t => t.team_id === leadMatch.team_id);
    }

    if (match) {
      matched.push({ excel: rawName, lead: rawLead, ps, dbId: match.team_id, dbName: match.team_name });
    } else {
      unmatched.push({ excel: rawName, lead: rawLead, ps });
    }
  }

  console.log('Matched count:', matched.length);
  console.log('Unmatched count:', unmatched.length);
  if (unmatched.length > 0) {
    console.log('Unmatched:', unmatched);
  }

  // Check if any duplicate dbId in matched
  const seenIds = new Set();
  const duplicateIds = [];
  for (const m of matched) {
    if (seenIds.has(m.dbId)) {
      duplicateIds.push(m);
    }
    seenIds.add(m.dbId);
  }
  console.log('Duplicate dbIds in 50 rows:', duplicateIds.length);
  if (duplicateIds.length > 0) {
    console.log('Duplicates:', duplicateIds);
  }
}

testMatch().catch(console.error);
