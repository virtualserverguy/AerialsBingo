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
    // Find all schedule sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    const scheduleSheets = allSheets
      .filter(sheet => sheet.getName().endsWith(' Schedule'))
      .map(sheet => sheet.getName())
      .sort()
      .reverse(); // Most recent first

    if (scheduleSheets.length === 0) {
      ui.alert('No Schedule', 'Please generate a monthly schedule first.', ui.ButtonSet.OK);
      return;
    }

    // Ask which schedule to verify against
    let scheduleSheetName;
    if (scheduleSheets.length === 1) {
      scheduleSheetName = scheduleSheets[0];
    } else {
      const result = ui.prompt(
        'Select Schedule',
        `Found ${scheduleSheets.length} schedule sheets. Enter the month to verify (e.g., "Jan 2025") or press OK to use the most recent (${scheduleSheets[0]}):`,
        ui.ButtonSet.OK_CANCEL
      );

      if (result.getSelectedButton() !== ui.Button.OK) {
        return;
      }

      const input = result.getResponseText().trim();
      if (!input) {
        scheduleSheetName = scheduleSheets[0]; // Use most recent
      } else {
        // Find matching sheet
        const match = scheduleSheets.find(name =>
          name.toLowerCase().includes(input.toLowerCase())
        );
        if (match) {
          scheduleSheetName = match;
        } else {
          ui.alert('Not Found', `No schedule sheet found matching "${input}". Available sheets:\n\n${scheduleSheets.join('\n')}`, ui.ButtonSet.OK);
          return;
        }
      }
    }

    const volunteers = getVolunteers();
    const shifts = getMonthlyShifts(scheduleSheetName);
    const signups = getSignups();

    if (shifts.length === 0) {
      ui.alert('No Schedule', `The schedule sheet "${scheduleSheetName}" is empty.`, ui.ButtonSet.OK);
      return;
    }

    if (signups.length === 0) {
      ui.alert('No Signups', 'Please import SignupGenius data first.', ui.ButtonSet.OK);
      return;
    }

    // Archive the import data
    archiveImportData(scheduleSheetName);

    // Run verification
    const results = verifyCompliance(volunteers, shifts, signups, scheduleSheetName);

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
function verifyCompliance(volunteers, shifts, signups, scheduleSheetName) {
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
      requiredRegular: v.requiredShifts,
      requiredSuperBingo: 1,  // Each volunteer must do 1 Super Bingo per year
      requiredMustGo: 1       // Each volunteer must do 1 Must Go per year
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

      // Count by type (separate buckets)
      if (eventType === 'Super Bingo') {
        volunteerSignups[email].superBingoCount++;
      } else if (eventType === 'Must Go') {
        volunteerSignups[email].mustGoCount++;
      } else {
        volunteerSignups[email].regularCount++;
      }
    }
  });

  // Calculate volunteer compliance (must meet ALL three requirements)
  let compliantCount = 0;
  let nonCompliantCount = 0;

  Object.values(volunteerSignups).forEach(vs => {
    const regularCompliant = vs.regularCount >= vs.requiredRegular;
    const superBingoCompliant = vs.superBingoCount >= vs.requiredSuperBingo;
    const mustGoCompliant = vs.mustGoCount >= vs.requiredMustGo;

    // Fully compliant only if all three buckets are met
    if (regularCompliant && superBingoCompliant && mustGoCompliant) {
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
      timestamp: new Date().toISOString(),
      verificationDate: new Date().toISOString(),
      scheduleSheetName: scheduleSheetName
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
 * @param {string} scheduleSheetName - Name of the schedule sheet (e.g., "Jan 2025 Schedule")
 */
function getMonthlyShifts(scheduleSheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(scheduleSheetName || 'Monthly Schedule');

  if (!sheet) {
    return [];
  }

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
 * Archive import data to a dated sheet
 * @param {string} scheduleSheetName - Name of the schedule sheet being verified
 */
function archiveImportData(scheduleSheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName('SignupGenius Import');

  if (!importSheet || importSheet.getLastRow() < 2) {
    return; // Nothing to archive
  }

  // Extract month from schedule name (e.g., "Jan 2025" from "Jan 2025 Schedule")
  const monthMatch = scheduleSheetName.match(/^(.+) Schedule$/);
  const monthName = monthMatch ? monthMatch[1] : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM yyyy');

  // Create archive sheet name with timestamp
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const archiveSheetName = `Import - ${monthName}`;

  // Check if archive sheet already exists
  let archiveSheet = ss.getSheetByName(archiveSheetName);

  if (!archiveSheet) {
    // Create new archive sheet
    archiveSheet = ss.insertSheet(archiveSheetName);

    // Add headers with import timestamp column
    const headers = [['Import Date/Time', 'Start DateTime', 'End DateTime', 'Event Name', 'Qty', 'Role', 'First Name', 'Last Name', 'Email', 'Comment', 'Signup Time']];
    archiveSheet.getRange(1, 1, 1, 11).setValues(headers);
    archiveSheet.getRange(1, 1, 1, 11)
      .setFontWeight('bold')
      .setBackground('#8b5cf6')
      .setFontColor('#ffffff');
    archiveSheet.setFrozenRows(1);
  }

  // Copy data from import sheet with timestamp
  const lastRow = importSheet.getLastRow();
  if (lastRow > 1) {
    const data = importSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const archiveLastRow = archiveSheet.getLastRow();

    // Add timestamp to each row
    const dataWithTimestamp = data.map(row => [timestamp, ...row]);

    archiveSheet.getRange(archiveLastRow + 1, 1, dataWithTimestamp.length, 11).setValues(dataWithTimestamp);
  }
}

/**
 * Get signups from SignupGenius import
 * Format: Start DateTime, End DateTime, Event Name, Qty, Role, First Name, Last Name, Email, Comment, Signup Time
 */
function getSignups() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SignupGenius Import');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  return data
    .filter(row => row[5] && row[6] && row[7]) // Must have First Name, Last Name, and Email
    .map(row => {
      // Parse date and time from "12/02/2025 05:30 PM" format
      let dateStr = '';
      let timeStr = '';
      try {
        const startDateTime = new Date(row[0]); // Start DateTime column
        dateStr = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        timeStr = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), 'h:mm a');
      } catch (e) {
        dateStr = String(row[0]);
        timeStr = '';
      }

      // Combine First Name and Last Name
      const name = `${row[5]} ${row[6]}`.trim();

      // Get role from Role column
      const role = parseRole(row[4]);

      return {
        name: name,
        email: String(row[7]).toLowerCase(),
        role: role,
        date: dateStr,
        time: timeStr,
        location: row[2] // Event Name
      };
    });
}

/**
 * Parse role from SignupGenius role string
 * Handles: "Manager", "Assistant Manager", "Caller", "Floor Worker"
 */
function parseRole(roleStr) {
  const str = String(roleStr).toLowerCase().trim();

  // Handle exact matches first
  if (str === 'manager') {
    return 'Manager';
  } else if (str === 'assistant manager') {
    return 'Assistant Manager';
  } else if (str === 'caller') {
    return 'Caller';
  } else if (str === 'floor worker' || str === 'worker') {
    return 'Worker';
  }

  // Fallback to contains logic for flexibility
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
    '2. Open the CSV file and copy all the data (including headers)\n' +
    '3. Go to the "SignupGenius Import" sheet\n' +
    '4. Paste the data starting in cell A1 (replace existing headers)\n' +
    '5. Expected columns: Start DateTime, End DateTime, Event Name, Qty, Role, First Name, Last Name, Email, Comment, Signup Time\n\n' +
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
