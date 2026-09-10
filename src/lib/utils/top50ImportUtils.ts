import * as XLSX from 'xlsx';

export interface ParsedTop50Team {
  team_id?: string;
  team_name: string;
  team_lead_name?: string;
  team_lead_email?: string;
  team_lead_phone?: string;
  department?: string;
  year?: string;
  problem_id?: string;
  problem_title?: string;
  category?: 'Software' | 'Hardware';
  domain?: string;
}

/**
 * Parses an Excel or CSV file containing Top 50 / Selected teams.
 * Supports flexible header names (case-insensitive, ignores spaces/underscores).
 */
export async function parseTop50Excel(file: File): Promise<ParsedTop50Team[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file does not contain any readable sheets.');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The spreadsheet is empty. Please ensure data rows exist below the header row.');
  }

  const results: ParsedTop50Team[] = [];

  for (const row of rawRows) {
    // Helper to find value across multiple potential column header names
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        const normalizedTarget = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rowKey of Object.keys(row)) {
          const normalizedRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedRowKey === normalizedTarget) {
            const val = row[rowKey];
            if (val !== undefined && val !== null) {
              return String(val).trim();
            }
          }
        }
      }
      return '';
    };

    const team_id = getVal('Team ID', 'team_id', 'TeamId', 'ID');
    const team_name = getVal('Team Name', 'team_name', 'TeamName', 'Team');
    const team_lead_name = getVal('Team Lead Name', 'Team Lead', 'Lead Name', 'Leader Name', 'Lead', 'team_lead_name');
    const team_lead_email = getVal('Team Lead Email', 'Lead Email', 'Email', 'team_lead_email');
    const team_lead_phone = getVal('Team Lead Phone Number', 'Team Lead Phone', 'Lead Phone', 'Phone', 'Phone Number', 'Mobile');
    const problem_id = getVal('PS ID', 'Problem ID', 'Problem Statement ID', 'PSID', 'ps_id', 'ProblemId');
    const problem_title = getVal('Problem Title', 'Problem Statement Title', 'Problem Statement', 'Title', 'problem_title');
    const categoryRaw = getVal('Category', 'domain_category', 'Category (Software/Hardware)');
    const category: 'Software' | 'Hardware' = categoryRaw.toLowerCase().includes('hard') ? 'Hardware' : 'Software';
    const domain = getVal('Domain', 'Theme', 'problem_domain') || 'General';
    const department = getVal('Department', 'Dept');
    const year = getVal('Academic Year', 'Year');

    if (team_name || team_id) {
      results.push({
        team_id: team_id || undefined,
        team_name: team_name || team_id,
        team_lead_name: team_lead_name || undefined,
        team_lead_email: team_lead_email || undefined,
        team_lead_phone: team_lead_phone || undefined,
        department: department || undefined,
        year: year || undefined,
        problem_id: problem_id || undefined,
        problem_title: problem_title || undefined,
        category,
        domain
      });
    }
  }

  if (results.length === 0) {
    throw new Error('Could not detect any valid teams. Please make sure columns like "Team Name", "Team Lead Name", or "PS ID" are present.');
  }

  return results;
}

/**
 * Downloads a pre-formatted Excel template for Top 50 Selected Teams.
 */
export function downloadTop50SampleTemplate() {
  const sampleData = [
    {
      'Team Name': 'Innovators_RGUKTN',
      'Team Lead Name': 'Vasu Ch',
      'Team Lead Email': 'vasuch9959@rguktn.ac.in',
      'Team Lead Phone': '9876543210',
      'PS ID': 'SIH26044',
      'Problem Title': 'Smart Real-Time Attendance & Campus Safety Monitoring',
      'Category': 'Software',
      'Department': 'CSE',
      'Academic Year': 'E3'
    },
    {
      'Team Name': 'BioTech_Pioneers_RGUKTN',
      'Team Lead Name': 'Priya S',
      'Team Lead Email': 'priya@rguktn.ac.in',
      'Team Lead Phone': '9876543211',
      'PS ID': 'SIH26102',
      'Problem Title': 'Automated Crop Disease Detection Using Edge AI',
      'Category': 'Hardware',
      'Department': 'ECE',
      'Academic Year': 'E4'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Top 50 Selected Teams');
  XLSX.writeFile(workbook, 'SIH_2026_Top_50_Selected_Teams_Template.xlsx');
}
