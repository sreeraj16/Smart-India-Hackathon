async function checkDupes() {
  const supabaseUrl = 'https://jftragfdpepzpybzleat.supabase.co';
  const supabaseKey = 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

  const res = await fetch(`${supabaseUrl}/rest/v1/teams?select=team_id,team_name`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const dbTeams = await res.json();

  const hackers = dbTeams.filter(t => t.team_name.toLowerCase().includes('hacker'));
  console.log('Hacker teams in DB:', hackers);

  const innovexia = dbTeams.filter(t => t.team_name.toLowerCase().includes('innovexia'));
  console.log('Innovexia teams in DB:', innovexia);
}
checkDupes().catch(console.error);
