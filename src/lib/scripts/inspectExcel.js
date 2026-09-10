const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const rootFile = 'h:/SIH_RGUKTN/SIH-2026 TOP 50.xlsx';
const wb = XLSX.readFile(rootFile);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

console.log('Total rows in new Excel:', data.length);
data.forEach((r, idx) => {
  const team = r['Team Name'] || r['team_name'] || '';
  const lead = r['Team Lead'] || r['team_lead'] || r['Team Lead Name'] || '';
  const ps = r['Problem Statement ID'] || r['PS ID'] || r['Problem Statement'] || '';
  console.log(`${idx + 1}. Team: "${team}" | Lead: "${lead}" | PS: "${ps}"`);
});
