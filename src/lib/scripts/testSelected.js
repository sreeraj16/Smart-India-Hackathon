
// Quick node test
async function test() {
  const supabaseUrl = 'https://jftragfdpepzpybzleat.supabase.co';
  const supabaseKey = 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

  const [teamsRes, resultsRes] = await Promise.all([
    fetch(supabaseUrl + '/rest/v1/teams?select=team_id,team_name', {
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
    }),
    fetch(supabaseUrl + '/rest/v1/final_results?select=*', {
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
    })
  ]);

  const teams = await teamsRes.json();
  const results = await resultsRes.json();

  console.log('teams in DB:', teams.length);
  console.log('results in DB:', results.length);

  const overrides = {};
  results.forEach(r => {
    let meta = {};
    try {
      if (r.override_reason && r.override_reason.trim().startsWith('{')) {
        meta = JSON.parse(r.override_reason);
      }
    } catch {}
    overrides[r.team_id] = {
      selected: !!r.selected,
      team_name: meta.team_name,
      team_lead_name: meta.team_lead_name,
      problem_id: meta.problem_id,
      problem_title: meta.problem_title,
      category: meta.category,
      index: meta.index
    };
  });

  const selectedTeams = Object.keys(overrides).filter(k => overrides[k].selected);
  console.log('Selected count in overrides:', selectedTeams.length);
  console.log('First 3 selected teams:');
  selectedTeams.slice(0, 3).forEach((id, i) => {
    const o = overrides[id];
    console.log(`  ${i + 1}. Team: ${o.team_name} | Lead: ${o.team_lead_name} | PS: ${o.problem_id} (${o.category})`);
  });
}

test().catch(console.error);
