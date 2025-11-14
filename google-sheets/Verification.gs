/**
 * Verification Logic - Check volunteer compliance and shift coverage
 */

/**
 * Run full verification
 */
function runVerification() {
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

  try {
    const volunteers = getVolunteers();
    const shifts = getMonthlyShifts();
    const signups = getSignups();

    if (shifts.length === 0) {
      ui.alert('No Schedule', 'Please generate a monthly schedule first.', ui.ButtonSet.OK);
      return;
    }

    if (signups.length === 0) {
      ui.alert('No Signups', 'Please import SignupGenius data first.', ui.ButtonSet.OK);
      return;
    }

    // Run verification
    const results = verifyCompliance(volunteers, shifts, signups);

    // Show summary
    const summary = `
Verification Complete!

Volunteers:
  - Total: ${results.totalVolunteers}
  - Compliant: ${results.compliantVolunteers}
  - Non-compliant: ${results.nonCompliantVolunteers}

Shifts:
  - Total: ${results.totalShifts}
  - Fully covered: ${results.fullyCoveredShifts}
  - Partially covered: ${results.partiallyCoveredShifts}
  - Uncovered: ${results.uncoveredShifts}

Total positions needed: ${results.totalPositions}
Total filled: ${results.totalFilled}
Remaining gaps: ${results.remainingGaps}

View detailed reports using the menu:
  - View Compliance Report
  - View Shift Coverage Report
    `.trim();

    ui.alert('Verification Results', summary, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Error', `Verification failed: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Verify volunteer compliance and shift coverage
 */
function verifyCompliance(volunteers, shifts, signups) {
  // Get shift multipliers from config
  const config = getConfig();
  const superBingoValue = parseFloat(config['Super Bingo Value']) || 1.5;
  const mustGoValue = parseFloat(config['Must Go Value']) || 2.0;

  // Build shift type map
  const shiftTypeMap = {};
  shifts.forEach(shift => {
    const key = `${shift.date}_${shift.time}`;
    shiftTypeMap[key] = shift.eventType || 'Regular';
  });

  // Build volunteer signup counts
  const volunteerSignups = {};
  volunteers.forEach(v => {
    volunteerSignups[v.email.toLowerCase()] = {
      volunteer: v,
      signups: [],
      regularCount: 0,
      superBingoCount: 0,
      mustGoCount: 0,
      weightedTotal: 0,
      required: v.requiredShifts
    };
  });

  // Count signups per volunteer with shift type tracking
  signups.forEach(signup => {
    const email = signup.email.toLowerCase();
    if (volunteerSignups[email]) {
      const key = `${signup.date}_${signup.time}`;
      const eventType = shiftTypeMap[key] || 'Regular';

      // Add event type to signup
      signup.eventType = eventType;

      volunteerSignups[email].signups.push(signup);

      // Count by type
      if (eventType === 'Super Bingo') {
        volunteerSignups[email].superBingoCount++;
        volunteerSignups[email].weightedTotal += superBingoValue;
      } else if (eventType === 'Must Go') {
        volunteerSignups[email].mustGoCount++;
        volunteerSignups[email].weightedTotal += mustGoValue;
      } else {
        volunteerSignups[email].regularCount++;
        volunteerSignups[email].weightedTotal += 1;
      }
    }
  });

  // Calculate volunteer compliance
  let compliantCount = 0;
  let nonCompliantCount = 0;

  Object.values(volunteerSignups).forEach(vs => {
    // Check if total shifts (not weighted) meets requirement
    const totalShifts = vs.signups.length;
    if (totalShifts >= vs.required) {
      compliantCount++;
    } else {
      nonCompliantCount++;
    }
  });

  // Calculate shift coverage
  const shiftCoverage = shifts.map(shift => {
    const matchingSignups = signups.filter(s =>
      s.date === shift.date && s.time === shift.time
    );

    const coverage = {
      shift: shift,
      callers: matchingSignups.filter(s => s.role === 'Caller').length,
      managers: matchingSignups.filter(s => s.role === 'Manager').length,
      asstManagers: matchingSignups.filter(s => s.role === 'Assistant Manager').length,
      workers: matchingSignups.filter(s => s.role === 'Worker').length
    };

    coverage.isFullyCovered =
      coverage.callers >= shift.callersNeeded &&
      coverage.managers >= shift.managersNeeded &&
      coverage.asstManagers >= shift.asstManagersNeeded &&
      coverage.workers >= shift.workersNeeded;

    coverage.hasAnySignups =
      coverage.callers > 0 || coverage.managers > 0 ||
      coverage.asstManagers > 0 || coverage.workers > 0;

    return coverage;
  });

  const fullyCovered = shiftCoverage.filter(sc => sc.isFullyCovered).length;
  const partiallyCovered = shiftCoverage.filter(sc => !sc.isFullyCovered && sc.hasAnySignups).length;
  const uncovered = shiftCoverage.filter(sc => !sc.hasAnySignups).length;

  const totalPositions = shifts.reduce((sum, s) =>
    sum + s.callersNeeded + s.managersNeeded + s.asstManagersNeeded + s.workersNeeded, 0
  );

  const totalFilled = signups.length;

  // Store results for reporting
  PropertiesService.getDocumentProperties().setProperty(
    'lastVerification',
    JSON.stringify({
      volunteerSignups: volunteerSignups,
      shiftCoverage: shiftCoverage,
      timestamp: new Date().toISOString()
    })
  );

  return {
    totalVolunteers: volunteers.length,
    compliantVolunteers: compliantCount,
    nonCompliantVolunteers: nonCompliantCount,
    totalShifts: shifts.length,
    fullyCoveredShifts: fullyCovered,
    partiallyCoveredShifts: partiallyCovered,
    uncoveredShifts: uncovered,
    totalPositions: totalPositions,
    totalFilled: totalFilled,
    remainingGaps: totalPositions - totalFilled
  };
}

/**
 * Get volunteers from sheet
 */
function getVolunteers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Volunteers');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  return data
    .filter(row => row[0] && row[8] === 'Yes') // Filter active volunteers
    .map(row => ({
      name: row[0],
      email: row[1],
      requiredShifts: parseInt(row[2]) || 1,
      canBeManager: row[3] === 'Yes',
      canBeCaller: row[4] === 'Yes',
      canBeAsstManager: row[5] === 'Yes',
      canBeWorker: row[6] === 'Yes',
      notes: row[7]
    }));
}

/**
 * Get monthly shifts from sheet
 */
function getMonthlyShifts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Monthly Schedule');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  return data
    .filter(row => row[0]) // Filter out empty rows
    .map(row => ({
      date: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      dayOfWeek: row[1],
      time: row[2],
      location: row[3],
      eventType: row[4] || 'Regular',
      callersNeeded: parseInt(row[5]) || 0,
      managersNeeded: parseInt(row[6]) || 0,
      asstManagersNeeded: parseInt(row[7]) || 0,
      workersNeeded: parseInt(row[8]) || 0,
      notes: row[9]
    }));
}

/**
 * Get signups from SignupGenius import
 */
function getSignups() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SignupGenius Import');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  return data
    .filter(row => row[0] && row[1]) // Must have name and email
    .map(row => {
      let role = parseRole(row[2]); // Item/Role column

      // Parse date
      let dateStr = '';
      try {
        const dateObj = new Date(row[3]);
        dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } catch (e) {
        dateStr = String(row[3]);
      }

      return {
        name: row[0],
        email: String(row[1]).toLowerCase(),
        role: role,
        date: dateStr,
        time: row[4],
        location: row[5]
      };
    });
}

/**
 * Parse role from SignupGenius item string
 */
function parseRole(itemStr) {
  const str = String(itemStr).toLowerCase();

  if (str.includes('manager') && !str.includes('assistant')) {
    return 'Manager';
  } else if (str.includes('assistant') || str.includes('asst')) {
    return 'Assistant Manager';
  } else if (str.includes('caller')) {
    return 'Caller';
  } else {
    return 'Worker';
  }
}

/**
 * Show import dialog for SignupGenius data
 */
function showImportDialog() {
  const ui = SpreadsheetApp.getUi();

  ui.alert(
    'Import SignupGenius Data',
    'To import data:\n\n' +
    '1. Export your SignupGenius data as CSV\n' +
    '2. Open the CSV file and copy all the data\n' +
    '3. Go to the "SignupGenius Import" sheet\n' +
    '4. Paste the data starting in cell A2\n' +
    '5. The data should include: Name, Email, Item/Role, Date, Time, Location\n\n' +
    'Then come back and run: Bingo Scheduler > Run Verification',
    ui.ButtonSet.OK
  );

  // Switch to import sheet
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('SignupGenius Import')
    .activate();
}

/**
 * Get configuration values
 */
function getConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {};
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const config = {};

  data.forEach(row => {
    if (row[0]) {
      config[row[0]] = row[1];
    }
  });

  return config;
}
