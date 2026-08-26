import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Team } from '../types';

export interface FinalRankItem {
  rank: number;
  team_id: string;
  team_name: string;
  problem_id: string;
  problem_title: string;
  category: string;
  score: number;
  selected: boolean;
  override: boolean;
  override_reason?: string;
}

export function exportToExcel(data: FinalRankItem[], filename = 'SIH_2026_Top_50_Results.xlsx') {
  const exportRows = data.map((item) => ({
    'Rank': item.rank,
    'Team ID': item.team_id,
    'Team Name': item.team_name,
    'Problem ID': item.problem_id,
    'Problem Title': item.problem_title,
    'Category': item.category,
    'Score': item.score,
    'Final Status': item.selected ? 'SELECTED (Top 50)' : 'Not Selected',
    'Admin Override': item.override ? 'YES' : 'NO',
    'Override Reason': item.override_reason || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Top 50 Results');
  XLSX.writeFile(workbook, filename);
}

export function exportToCSV(data: FinalRankItem[], filename = 'SIH_2026_Top_50_Results.csv') {
  const exportRows = data.map((item) => ({
    'Rank': item.rank,
    'Team ID': item.team_id,
    'Team Name': item.team_name,
    'Problem ID': item.problem_id,
    'Problem Title': item.problem_title,
    'Category': item.category,
    'Score': item.score,
    'Final Status': item.selected ? 'SELECTED (Top 50)' : 'Not Selected',
    'Admin Override': item.override ? 'YES' : 'NO',
    'Override Reason': item.override_reason || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data: FinalRankItem[], title = 'SIH Internal Hackathon 2026 - Official Results') {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header branding
  doc.setFontSize(18);
  doc.setTextColor(128, 0, 0); // RGUKT Maroon
  doc.text('RGUKT Nuzvid - Smart India Hackathon 2026', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(153, 0, 0); // Rich Crimson
  doc.text(title, 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()} | RGUKT Nuzvid Campus Platform`, 14, 32);

  const tableColumn = ['Rank', 'Team ID', 'Team Name', 'Problem Statement', 'Score', 'Status'];
  const tableRows = data.map((item) => [
    item.rank,
    item.team_id,
    item.team_name,
    `${item.problem_id}: ${item.problem_title}`,
    item.score.toFixed(2),
    item.selected ? 'SELECTED (Top 50)' : 'Not Selected'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 38,
    theme: 'grid',
    headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [253, 242, 242] },
    margin: { top: 38 },
  });

  doc.save('SIH_2026_Official_Top50_Results.pdf');
}
