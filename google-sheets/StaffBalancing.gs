/**
 * Intelligent Staff Balancing - Adds extra slots when more volunteers than positions
 */

function balanceStaffDistribution() {
  const ui = SpreadsheetApp.getUi();

  // Check if sheets are set up
  if (!checkSheetsExist()) {
    ui.alert(
      'Setup Required',
      'Please run "🚀 Initial Setup (Run First!)" from the menu first.',
      ui.ButtonSet.OK
    );
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const volunteersSheet = ss.getSheetByName('Volunteers');
  const scheduleSheet = ss.getSheetByName('Monthly Schedule');

  // Get volunteers and shifts
  const volunteers = getVolunteers();
  const shifts = getMonthlyShifts();

  if (shifts.length === 0) {
    ui.alert('No Schedule', 'Please generate a monthly schedule first.', ui.ButtonSet.OK);
    return;
  }

  // Count how many people need each role
  const roleCounts = {
    Caller: 0,
    Manager: 0,
    'Assistant Manager': 0,
    Worker: 0
  };

  volunteers.forEach(v => {
    // For simplicity, count required shifts for roles they can fill
    // In reality, this would be more sophisticated
    if (v.canBeCaller) roleCounts.Caller += v.requiredShifts;
    if (v.canBeManager) roleCounts.Manager += v.requiredShifts;
    if (v.canBeAsstManager) roleCounts['Assistant Manager'] += v.requiredShifts;
    if (v.canBeWorker) roleCounts.Worker += v.requiredShifts;
  });

  // Count available positions in current schedule
  const availablePositions = {
    Caller: shifts.reduce((sum, s) => sum + (s.callersNeeded || 0), 0),
    Manager: shifts.reduce((sum, s) => sum + (s.managersNeeded || 0), 0),
    'Assistant Manager': shifts.reduce((sum, s) => sum + (s.asstManagersNeeded || 0), 0),
    Worker: shifts.reduce((sum, s) => sum + (s.workersNeeded || 0), 0)
  };

  // Calculate gaps
  const gaps = {};
  let hasGaps = false;

  for (let role in roleCounts) {
    const needed = roleCounts[role];
    const available = availablePositions[role];
    const gap = needed - available;

    if (gap > 0) {
      gaps[role] = gap;
      hasGaps = true;
    }
  }

  if (!hasGaps) {
    ui.alert(
      'No Gaps Found',
      'Current schedule has enough positions for all volunteers!\n\n' +
      Object.keys(roleCounts).map(role =>
        `${role}: ${roleCounts[role]} needed, ${availablePositions[role]} available`
      ).join('\n'),
      ui.ButtonSet.OK
    );
    return;
  }

  // Show gaps and ask for confirmation
  const gapMessage = 'Extra positions needed:\n\n' +
    Object.keys(gaps).map(role => `${role}: ${gaps[role]} more positions`).join('\n') +
    '\n\nWould you like to add these positions to the schedule?';

  const result = ui.alert('Staff Balance Analysis', gapMessage, ui.ButtonSet.YES_NO);

  if (result !== ui.Button.YES) {
    return;
  }

  // Add extra positions by distributing them across shifts
  try {
    distributeExtraPositions(scheduleSheet, shifts, gaps);
    ui.alert(
      'Success!',
      'Extra positions have been added to balance staff distribution.\n\n' +
      'Regular shifts were prioritized for extra positions.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('Error', `Failed to balance staff: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Distribute extra positions across shifts
 */
function distributeExtraPositions(scheduleSheet, shifts, gaps) {
  // Get current schedule data
  const lastRow = scheduleSheet.getLastRow();
  if (lastRow < 2) return;

  // Prioritize regular shifts for extra positions
  const regularShifts = [];
  const specialShifts = [];

  for (let i = 0; i < shifts.length; i++) {
    if (shifts[i].eventType === 'Regular') {
      regularShifts.push(i);
    } else {
      specialShifts.push(i);
    }
  }

  // Distribute gaps evenly across shifts (prioritize regular shifts)
  const shiftIndices = [...regularShifts, ...specialShifts];

  for (let role in gaps) {
    let toAdd = gaps[role];
    let shiftIndex = 0;

    while (toAdd > 0 && shiftIndex < shiftIndices.length) {
      const idx = shiftIndices[shiftIndex % shiftIndices.length];
      const shift = shifts[idx];
      const row = idx + 2; // Account for header

      // Add one to the appropriate column
      if (role === 'Caller') {
        const currentVal = scheduleSheet.getRange(row, 6).getValue(); // Column F
        scheduleSheet.getRange(row, 6).setValue(currentVal + 1);
      } else if (role === 'Manager') {
        const currentVal = scheduleSheet.getRange(row, 7).getValue(); // Column G
        scheduleSheet.getRange(row, 7).setValue(currentVal + 1);
      } else if (role === 'Assistant Manager') {
        const currentVal = scheduleSheet.getRange(row, 8).getValue(); // Column H
        scheduleSheet.getRange(row, 8).setValue(currentVal + 1);
      } else if (role === 'Worker') {
        const currentVal = scheduleSheet.getRange(row, 9).getValue(); // Column I
        scheduleSheet.getRange(row, 9).setValue(currentVal + 1);
      }

      toAdd--;
      shiftIndex++;
    }
  }
}
