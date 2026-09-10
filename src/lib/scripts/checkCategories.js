const XLSX = require('xlsx');

async function checkCategories() {
  const supabaseUrl = 'https://jftragfdpepzpybzleat.supabase.co';
  const supabaseKey = 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

  const res = await fetch(`${supabaseUrl}/rest/v1/problem_statements?select=problem_id,problem_title,category,domain`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const dbPS = await res.json();
  const psMap = new Map();
  dbPS.forEach(p => {
    psMap.set(p.problem_id.trim().toUpperCase(), p);
  });

  const wb = XLSX.readFile('h:/SIH_RGUKTN/Smart-India-Hackathon/SIH-2026 TOP 50.xlsx');
  const excelData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  console.log('Total Excel rows:', excelData.length);
  let softwareCount = 0;
  let hardwareCount = 0;

  excelData.forEach((r, i) => {
    const psId = (r['Problem Statement ID'] || r['PS ID'] || '').trim().toUpperCase();
    const ps = psMap.get(psId);
    const cat = ps?.category || 'Software';
    if (cat.toLowerCase().includes('hard')) hardwareCount++;
    else softwareCount++;

    if (!ps) {
      console.log(`Row ${i + 1} (${r['Team Name']}): PS ID "${psId}" not found in DB problem statements`);
    }
  });

  console.log(`Software: ${softwareCount}, Hardware: ${hardwareCount}`);
}

checkCategories().catch(console.error);
