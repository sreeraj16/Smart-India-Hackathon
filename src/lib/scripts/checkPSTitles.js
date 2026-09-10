const XLSX = require('xlsx');

async function checkPSTitles() {
  const supabaseUrl = 'https://jftragfdpepzpybzleat.supabase.co';
  const supabaseKey = 'sb_publishable_VPnF0d1gxhfXyIuzGSyf5Q_pjRQCT6u';

  const res = await fetch(`${supabaseUrl}/rest/v1/problem_statements?select=problem_id,problem_title,category`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const dbPS = await res.json();
  const psMap = new Map(dbPS.map(p => [p.problem_id.trim().toUpperCase(), p]));

  const wb = XLSX.readFile('h:/SIH_RGUKTN/SIH-2026 TOP 50.xlsx');
  const excelData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  console.log('Total PS in DB:', dbPS.length);
  let matchedPS = 0;
  excelData.forEach((r, i) => {
    const rawPS = (r['Problem Statement ID'] || r['PS ID'] || '').trim().toUpperCase();
    const psObj = psMap.get(rawPS);
    if (psObj) {
      matchedPS++;
    } else {
      console.log(`Row ${i + 1}: ${rawPS} not found in DB problem_statements`);
    }
  });
  console.log(`Matched PS: ${matchedPS} / ${excelData.length}`);
}

checkPSTitles().catch(console.error);
