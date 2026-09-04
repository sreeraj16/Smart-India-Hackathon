import { Team } from '../types';

export interface PanelAssignmentResult {
  team_id: string;
  team_name: string;
  previous_panel: string;
  proposed_panel: string;
  problem_statements: string[];
  is_dual_ps: boolean;
}

export interface PanelDistributionMetrics {
  total_teams: number;
  dual_ps_teams_count: number;
  panels_before: Record<string, number>;
  panels_after: Record<string, number>;
  before_same_ps_overlaps: number;
  after_same_ps_overlaps: number;
  verification: {
    valid_team_count_matches: boolean;
    every_team_has_exactly_one_panel: boolean;
    no_missing_or_duplicate_teams: boolean;
    dual_ps_teams_preserved: boolean;
    panel_sizes_balanced: boolean;
    no_other_data_modified: boolean;
  };
}

export interface SmartDistributionOutcome {
  assignments: PanelAssignmentResult[];
  metrics: PanelDistributionMetrics;
  proposedTeams: Team[];
}

/**
 * Counts total same-PS team overlaps within the same panel.
 * For each panel and each PS, if k teams in that panel share the PS, overlap count is k * (k - 1) / 2.
 */
export function calculateSamePSOverlaps(teams: Team[]): number {
  const panelPSMap: Record<string, Record<string, number>> = {};

  teams.forEach(team => {
    const panel = team.panel || 'Panel 1';
    if (!panelPSMap[panel]) panelPSMap[panel] = {};

    team.selected_problem_statements.forEach(ps => {
      if (ps && ps.problem_id) {
        panelPSMap[panel][ps.problem_id] = (panelPSMap[panel][ps.problem_id] || 0) + 1;
      }
    });
  });

  let totalOverlaps = 0;
  Object.values(panelPSMap).forEach(psCounts => {
    Object.values(psCounts).forEach(count => {
      if (count > 1) {
        totalOverlaps += (count * (count - 1)) / 2;
      }
    });
  });

  return totalOverlaps;
}

/**
 * Smart Panel Distribution Algorithm:
 * Distributes teams across available panels to separate teams with the same problem statement into different panels
 * while keeping panel sizes reasonably balanced.
 */
export function calculateSmartPanelDistribution(
  teams: Team[],
  targetPanels: string[] = ['Panel 1', 'Panel 2', 'Panel 3']
): SmartDistributionOutcome {
  const beforeSamePSOverlaps = calculateSamePSOverlaps(teams);

  const panelsBefore: Record<string, number> = {};
  targetPanels.forEach(p => (panelsBefore[p] = 0));
  teams.forEach(t => {
    const p = t.panel || targetPanels[0];
    panelsBefore[p] = (panelsBefore[p] || 0) + 1;
  });

  // 1. Calculate problem statement frequencies across all teams
  const psFrequencies: Record<string, number> = {};
  teams.forEach(t => {
    t.selected_problem_statements.forEach(ps => {
      if (ps && ps.problem_id) {
        psFrequencies[ps.problem_id] = (psFrequencies[ps.problem_id] || 0) + 1;
      }
    });
  });

  // 2. Score teams by constraint level (hardest to place first)
  const scoredTeams = teams.map(t => {
    const isDual = t.selected_problem_statements.length >= 2;
    const psFreqSum = t.selected_problem_statements.reduce((sum, ps) => {
      return sum + (ps && ps.problem_id ? psFrequencies[ps.problem_id] || 0 : 0);
    }, 0);
    const score = (isDual ? 1000 : 0) + psFreqSum;
    return { team: t, score };
  });

  // Sort descending by constraint score
  scoredTeams.sort((a, b) => b.score - a.score);

  // 3. Initialize panel buckets
  interface PanelState {
    name: string;
    teams: Team[];
    psCounts: Record<string, number>;
  }

  const panelStates: PanelState[] = targetPanels.map(p => ({
    name: p,
    teams: [],
    psCounts: {}
  }));

  // 4. Greedy placement with cost minimization
  scoredTeams.forEach(({ team }) => {
    let bestPanel = panelStates[0];
    let minCost = Infinity;

    panelStates.forEach(panel => {
      // Calculate penalty for adding this team to candidate panel
      let psConflictPenalty = 0;
      team.selected_problem_statements.forEach(ps => {
        if (ps && ps.problem_id) {
          const currentPSCountInPanel = panel.psCounts[ps.problem_id] || 0;
          // Exponential penalty for overlapping same PS in same panel
          psConflictPenalty += Math.pow(currentPSCountInPanel + 1, 3) * 100;
        }
      });

      // Panel size balance penalty
      const sizePenalty = Math.pow(panel.teams.length + 1, 2) * 5;

      const totalCost = psConflictPenalty + sizePenalty;

      if (totalCost < minCost) {
        minCost = totalCost;
        bestPanel = panel;
      }
    });

    // Place team in best panel
    bestPanel.teams.push(team);
    team.selected_problem_statements.forEach(ps => {
      if (ps && ps.problem_id) {
        bestPanel.psCounts[ps.problem_id] = (bestPanel.psCounts[ps.problem_id] || 0) + 1;
      }
    });
  });

  // 5. Local Swap Optimization (2-opt optimization)
  const computeTotalStateCost = () => {
    let totalCost = 0;
    panelStates.forEach(panel => {
      Object.values(panel.psCounts).forEach(cnt => {
        if (cnt > 1) {
          totalCost += Math.pow(cnt, 3) * 100;
        }
      });
      totalCost += Math.pow(panel.teams.length, 2) * 5;
    });
    return totalCost;
  };

  let currentCost = computeTotalStateCost();
  let maxIterations = 500;

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    for (let i = 0; i < panelStates.length; i++) {
      for (let j = i + 1; j < panelStates.length; j++) {
        const p1 = panelStates[i];
        const p2 = panelStates[j];

        // Try swapping one team from p1 with one team from p2
        for (let ti = 0; ti < p1.teams.length; ti++) {
          for (let tj = 0; tj < p2.teams.length; tj++) {
            const team1 = p1.teams[ti];
            const team2 = p2.teams[tj];

            // Perform tentative swap
            p1.teams[ti] = team2;
            p2.teams[tj] = team1;

            // Recalculate PS counts for p1
            const newP1PS: Record<string, number> = {};
            p1.teams.forEach(t => t.selected_problem_statements.forEach(ps => {
              if (ps && ps.problem_id) newP1PS[ps.problem_id] = (newP1PS[ps.problem_id] || 0) + 1;
            }));

            // Recalculate PS counts for p2
            const newP2PS: Record<string, number> = {};
            p2.teams.forEach(t => t.selected_problem_statements.forEach(ps => {
              if (ps && ps.problem_id) newP2PS[ps.problem_id] = (newP2PS[ps.problem_id] || 0) + 1;
            }));

            const oldP1PS = p1.psCounts;
            const oldP2PS = p2.psCounts;
            p1.psCounts = newP1PS;
            p2.psCounts = newP2PS;

            const newCost = computeTotalStateCost();

            if (newCost < currentCost) {
              currentCost = newCost;
              improved = true;
              break;
            } else {
              // Revert swap
              p1.teams[ti] = team1;
              p2.teams[tj] = team2;
              p1.psCounts = oldP1PS;
              p2.psCounts = oldP2PS;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }

    if (!improved) break;
  }

  // 6. Build proposed Teams array and assignments mapping
  const proposedTeams: Team[] = [];
  const assignments: PanelAssignmentResult[] = [];
  const panelsAfter: Record<string, number> = {};
  targetPanels.forEach(p => (panelsAfter[p] = 0));

  panelStates.forEach(panel => {
    panel.teams.forEach(t => {
      const updatedTeam: Team = {
        ...t,
        panel: panel.name
      };
      proposedTeams.push(updatedTeam);
      panelsAfter[panel.name] = (panelsAfter[panel.name] || 0) + 1;

      assignments.push({
        team_id: t.team_id,
        team_name: t.team_name,
        previous_panel: t.panel || 'Panel 1',
        proposed_panel: panel.name,
        problem_statements: t.selected_problem_statements.map(ps => ps.problem_id),
        is_dual_ps: t.selected_problem_statements.length >= 2
      });
    });
  });

  const afterSamePSOverlaps = calculateSamePSOverlaps(proposedTeams);

  // Sort assignments by team_id
  assignments.sort((a, b) => a.team_id.localeCompare(b.team_id));

  // 7. Perform 7 Verification Checks
  const teamIdSetInput = new Set(teams.map(t => t.team_id));
  const teamIdSetOutput = new Set(proposedTeams.map(t => t.team_id));
  const dualPSTeamsBefore = teams.filter(t => t.selected_problem_statements.length >= 2).length;
  const dualPSTeamsAfter = proposedTeams.filter(t => t.selected_problem_statements.length >= 2).length;

  const minPanelSize = Math.min(...Object.values(panelsAfter));
  const maxPanelSize = Math.max(...Object.values(panelsAfter));
  const isBalanced = (maxPanelSize - minPanelSize) <= 2;

  const metrics: PanelDistributionMetrics = {
    total_teams: teams.length,
    dual_ps_teams_count: dualPSTeamsBefore,
    panels_before: panelsBefore,
    panels_after: panelsAfter,
    before_same_ps_overlaps: beforeSamePSOverlaps,
    after_same_ps_overlaps: afterSamePSOverlaps,
    verification: {
      valid_team_count_matches: teams.length === proposedTeams.length,
      every_team_has_exactly_one_panel: proposedTeams.every(t => !!t.panel),
      no_missing_or_duplicate_teams: (teamIdSetInput.size === teams.length) && (teamIdSetOutput.size === proposedTeams.length) && (teams.length === proposedTeams.length),
      dual_ps_teams_preserved: dualPSTeamsBefore === dualPSTeamsAfter,
      panel_sizes_balanced: isBalanced,
      no_other_data_modified: proposedTeams.every(pt => {
        const orig = teams.find(ot => ot.team_id === pt.team_id);
        if (!orig) return false;
        return (
          orig.team_name === pt.team_name &&
          orig.team_lead_email === pt.team_lead_email &&
          orig.members.length === pt.members.length &&
          orig.selected_problem_statements.length === pt.selected_problem_statements.length
        );
      })
    }
  };

  return {
    assignments,
    metrics,
    proposedTeams
  };
}
