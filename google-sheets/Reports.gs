/**
 * Reporting Functions - Generate detailed compliance and coverage reports
 */

/**
 * Show volunteer compliance report
 */
function showComplianceReport() {
  const ui = SpreadsheetApp.getUi();

  const lastVerification = PropertiesService.getDocumentProperties().getProperty('lastVerification');

  if (!lastVerification) {
    ui.alert('No Verification Data', 'Please run verification first.', ui.ButtonSet.OK);
    return;
  }

  const data = JSON.parse(lastVerification);
  const volunteerSignups = data.volunteerSignups;
  const verificationDate = data.verificationDate || new Date().toISOString();
  const scheduleSheetName = data.scheduleSheetName || '';

  // Extract month from schedule name
  const monthMatch = scheduleSheetName.match(/^(.+) Schedule$/);
  const monthName = monthMatch ? monthMatch[1] : Utilities.formatDate(new Date(verificationDate), Session.getScriptTimeZone(), 'MMM yyyy');

  // Create dated report sheet
  const reportSheetName = `Report - ${monthName}`;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Delete existing report for this month if it exists
  let sheet = ss.getSheetByName(reportSheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }

  // Create new report sheet
  sheet = ss.insertSheet(reportSheetName);

  // Title
  sheet.getRange('A1').setValue('VOLUNTEER COMPLIANCE REPORT')
    .setFontWeight('bold')
    .setFontSize(16)
    .setBackground('#5a67d8')
    .setFontColor('#ffffff');

  sheet.getRange('A2').setValue('Generated: ' + new Date().toLocaleString())
    .setFontStyle('italic');

  let row = 4;

  // Non-compliant volunteers (missing ANY of the three requirements)
  const nonCompliant = Object.values(volunteerSignups)
    .filter(vs => {
      const regularReq = vs.requiredRegular || vs.required || 0;
      const regularDone = vs.regularCount || 0;
      const superBingoDone = vs.superBingoCount || 0;
      const mustGoDone = vs.mustGoCount || 0;

      return (regularDone < regularReq) || (superBingoDone < 1) || (mustGoDone < 1);
    })
    .sort((a, b) => a.volunteer.name.localeCompare(b.volunteer.name));

  if (nonCompliant.length > 0) {
    sheet.getRange(`A${row}`).setValue('⚠️ NON-COMPLIANT VOLUNTEERS')
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#fee')
      .setFontColor('#c00');

    row++;

    const headers = [['Name', 'Email', 'Regular Req', 'Regular Done', 'Regular Status', 'Super Bingo', 'SB Status', 'Must Go', 'MG Status', 'Overall']];
    sheet.getRange(row, 1, 1, 10).setValues(headers)
      .setFontWeight('bold')
      .setBackground('#eee');

    row++;

    const data = nonCompliant.map(vs => {
      const regularDone = vs.regularCount || 0;
      const regularReq = vs.requiredRegular || vs.required || 0;
      const regularStatus = regularDone >= regularReq ? '✓' : `Need ${regularReq - regularDone}`;

      const superBingoDone = vs.superBingoCount || 0;
      const superBingoStatus = superBingoDone >= 1 ? '✓' : 'Need 1';

      const mustGoDone = vs.mustGoCount || 0;
      const mustGoStatus = mustGoDone >= 1 ? '✓' : 'Need 1';

      const allMet = (regularDone >= regularReq) && (superBingoDone >= 1) && (mustGoDone >= 1);
      const overallStatus = allMet ? '✓ Compliant' : '⚠️ Missing';

      return [
        vs.volunteer.name,
        vs.volunteer.email,
        regularReq,
        regularDone,
        regularStatus,
        `${superBingoDone}/1`,
        superBingoStatus,
        `${mustGoDone}/1`,
        mustGoStatus,
        overallStatus
      ];
    });

    sheet.getRange(row, 1, data.length, 10).setValues(data);
    row += data.length + 2;
  }

  // Compliant volunteers (met ALL three requirements)
  const compliant = Object.values(volunteerSignups)
    .filter(vs => {
      const regularReq = vs.requiredRegular || vs.required || 0;
      const regularDone = vs.regularCount || 0;
      const superBingoDone = vs.superBingoCount || 0;
      const mustGoDone = vs.mustGoCount || 0;

      return (regularDone >= regularReq) && (superBingoDone >= 1) && (mustGoDone >= 1);
    })
    .sort((a, b) => a.volunteer.name.localeCompare(b.volunteer.name));

  if (compliant.length > 0) {
    sheet.getRange(`A${row}`).setValue(`✓ COMPLIANT VOLUNTEERS (${compliant.length})`)
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#efe')
      .setFontColor('#080');

    row++;

    const headers = [['Name', 'Email', 'Regular Req', 'Regular Done', 'Super Bingo', 'Must Go', 'Total Shifts']];
    sheet.getRange(row, 1, 1, 7).setValues(headers)
      .setFontWeight('bold')
      .setBackground('#eee');

    row++;

    const data = compliant.map(vs => {
      const regularDone = vs.regularCount || 0;
      const regularReq = vs.requiredRegular || vs.required || 0;
      const superBingoDone = vs.superBingoCount || 0;
      const mustGoDone = vs.mustGoCount || 0;

      return [
        vs.volunteer.name,
        vs.volunteer.email,
        regularReq,
        regularDone,
        `${superBingoDone}/1 ✓`,
        `${mustGoDone}/1 ✓`,
        vs.signups.length
      ];
    });

    sheet.getRange(row, 1, data.length, 7).setValues(data);
  }

  sheet.autoResizeColumns(1, 10);
  sheet.activate();

  ui.alert('Report Generated',
    `Compliance report has been generated in sheet: "${reportSheetName}"\n\n` +
    'Requirements:\n' +
    '- Regular shifts: Based on volunteer requirement (1, 2, or 3)\n' +
    '- Super Bingo: 1 per fiscal year (required)\n' +
    '- Must Go: 1 per fiscal year (required)\n\n' +
    'All three buckets must be met for compliance.',
    ui.ButtonSet.OK);
}

/**
 * Show shift coverage report
 */
function showCoverageReport() {
  const ui = SpreadsheetApp.getUi();

  const lastVerification = PropertiesService.getDocumentProperties().getProperty('lastVerification');

  if (!lastVerification) {
    ui.alert('No Verification Data', 'Please run verification first.', ui.ButtonSet.OK);
    return;
  }

  const data = JSON.parse(lastVerification);
  const shiftCoverage = data.shiftCoverage;
  const verificationDate = data.verificationDate || new Date().toISOString();
  const scheduleSheetName = data.scheduleSheetName || '';

  // Extract month from schedule name
  const monthMatch = scheduleSheetName.match(/^(.+) Schedule$/);
  const monthName = monthMatch ? monthMatch[1] : Utilities.formatDate(new Date(verificationDate), Session.getScriptTimeZone(), 'MMM yyyy');

  // Create dated report sheet (append to compliance report if it exists)
  const reportSheetName = `Report - ${monthName}`;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get or create the report sheet
  let sheet = ss.getSheetByName(reportSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(reportSheetName);
  }

  // Find where to add coverage report (after compliance report if it exists)
  const lastRow = sheet.getLastRow();
  const startRow = lastRow > 0 ? lastRow + 3 : 1;

  // Title
  sheet.getRange(startRow, 1).setValue('SHIFT COVERAGE REPORT')
    .setFontWeight('bold')
    .setFontSize(16)
    .setBackground('#ec4899')
    .setFontColor('#ffffff');

  sheet.getRange(startRow + 1, 1).setValue('Generated: ' + new Date().toLocaleString())
    .setFontStyle('italic');

  let row = startRow + 3;

  // Uncovered shifts
  const uncovered = shiftCoverage.filter(sc => !sc.hasAnySignups);

  if (uncovered.length > 0) {
    sheet.getRange(`A${row}`).setValue('⚠️ COMPLETELY UNCOVERED SHIFTS')
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#fee')
      .setFontColor('#c00');

    row++;

    const headers = [['Date', 'Time', 'Location', 'Callers Needed', 'Managers Needed', 'Asst Mgrs Needed', 'Workers Needed']];
    sheet.getRange(row, 1, 1, 7).setValues(headers)
      .setFontWeight('bold')
      .setBackground('#eee');

    row++;

    const data = uncovered.map(sc => [
      sc.shift.date,
      sc.shift.time,
      sc.shift.location,
      sc.shift.callersNeeded,
      sc.shift.managersNeeded,
      sc.shift.asstManagersNeeded,
      sc.shift.workersNeeded
    ]);

    sheet.getRange(row, 1, data.length, 7).setValues(data);
    row += data.length + 2;
  }

  // Partially covered shifts
  const partial = shiftCoverage.filter(sc => !sc.isFullyCovered && sc.hasAnySignups);

  if (partial.length > 0) {
    sheet.getRange(`A${row}`).setValue('⚠️ PARTIALLY COVERED SHIFTS')
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#fef3cd')
      .setFontColor('#856404');

    row++;

    const headers = [['Date', 'Time', 'Callers', 'Managers', 'Asst Mgrs', 'Workers', 'Status']];
    sheet.getRange(row, 1, 1, 7).setValues(headers)
      .setFontWeight('bold')
      .setBackground('#eee');

    row++;

    const data = partial.map(sc => {
      const gaps = [];
      if (sc.callers < sc.shift.callersNeeded) gaps.push(`${sc.shift.callersNeeded - sc.callers} Callers`);
      if (sc.managers < sc.shift.managersNeeded) gaps.push(`${sc.shift.managersNeeded - sc.managers} Managers`);
      if (sc.asstManagers < sc.shift.asstManagersNeeded) gaps.push(`${sc.shift.asstManagersNeeded - sc.asstManagers} Asst Mgrs`);
      if (sc.workers < sc.shift.workersNeeded) gaps.push(`${sc.shift.workersNeeded - sc.workers} Workers`);

      return [
        sc.shift.date,
        sc.shift.time,
        `${sc.callers}/${sc.shift.callersNeeded}`,
        `${sc.managers}/${sc.shift.managersNeeded}`,
        `${sc.asstManagers}/${sc.shift.asstManagersNeeded}`,
        `${sc.workers}/${sc.shift.workersNeeded}`,
        'Need: ' + gaps.join(', ')
      ];
    });

    sheet.getRange(row, 1, data.length, 7).setValues(data);
    row += data.length + 2;
  }

  // Fully covered shifts
  const fullyCovered = shiftCoverage.filter(sc => sc.isFullyCovered);

  if (fullyCovered.length > 0) {
    sheet.getRange(`A${row}`).setValue(`✓ FULLY COVERED SHIFTS (${fullyCovered.length})`)
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#efe')
      .setFontColor('#080');

    row++;

    const headers = [['Date', 'Time', 'Location', 'Total Staff']];
    sheet.getRange(row, 1, 1, 4).setValues(headers)
      .setFontWeight('bold')
      .setBackground('#eee');

    row++;

    const data = fullyCovered.map(sc => [
      sc.shift.date,
      sc.shift.time,
      sc.shift.location,
      sc.callers + sc.managers + sc.asstManagers + sc.workers
    ]);

    sheet.getRange(row, 1, data.length, 4).setValues(data);
  }

  sheet.autoResizeColumns(1, 7);
  sheet.activate();

  ui.alert('Report Generated', `Coverage report has been added to sheet: "${reportSheetName}"`, ui.ButtonSet.OK);
}

/**
 * Show help dialog
 */
function showHelpDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
      h2 { color: #5a67d8; margin-top: 20px; }
      h3 { color: #ec4899; margin-top: 15px; }
      code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
      .step { background: #f0f9ff; padding: 10px; margin: 10px 0; border-left: 4px solid #5a67d8; }
      .warning { background: #fff5f5; padding: 10px; margin: 10px 0; border-left: 4px solid #ef4444; }
    </style>

    <h1>🎯 Bingo Shift Scheduler - Help Guide</h1>

    <h2>Quick Start</h2>

    <div class="step">
      <strong>Step 1: Set Up Volunteers</strong>
      <p>Go to the <code>Volunteers</code> sheet and add your volunteers with:
      <ul>
        <li>Name and email</li>
        <li>Required shifts (1, 2, or 3)</li>
        <li>Role qualifications (what they can do)</li>
      </ul>
      <p>Your volunteer roster should be updated once a year (July-June cycle).</p>
    </div>

    <div class="step">
      <strong>Step 2: Create Shift Templates</strong>
      <p>Go to the <code>Shift Templates</code> sheet and define:
      <ul>
        <li><strong>Recurring shifts:</strong> Select day of week (Tuesday, Thursday, etc.)</li>
        <li><strong>Special events:</strong> Use "Special" for quarterly or one-time events</li>
      </ul>
      <p>These templates will be used to generate monthly schedules.</p>
    </div>

    <div class="step">
      <strong>Step 3: Generate Monthly Schedule</strong>
      <p>Menu: <code>Bingo Scheduler > Generate This Month's Schedule</code></p>
      <p>This creates a full month of shifts based on your templates.</p>
      <p>You can add one-time shifts using: <code>Add One-Time Shift</code></p>
    </div>

    <div class="step">
      <strong>Step 4: Collect Signups</strong>
      <p>Have volunteers sign up via SignupGenius, then export the data as CSV.</p>
    </div>

    <div class="step">
      <strong>Step 5: Import & Verify</strong>
      <p>1. Menu: <code>Import SignupGenius Data</code></p>
      <p>2. Paste your export into the SignupGenius Import sheet</p>
      <p>3. Menu: <code>Run Verification</code></p>
      <p>4. View reports to see compliance and coverage</p>
    </div>

    <h2>Monthly Workflow</h2>
    <ol>
      <li>Generate next month's schedule</li>
      <li>Volunteers sign up via SignupGenius</li>
      <li>Import and verify signups</li>
      <li>Follow up with non-compliant volunteers</li>
      <li>At month end: <code>Clear Month & Start Fresh</code></li>
    </ol>

    <h2>Tips</h2>
    <ul>
      <li><strong>Recurring shifts:</strong> Set in Shift Templates, auto-generated monthly</li>
      <li><strong>Special events:</strong> Mark as "Special" in templates, then add manually when needed</li>
      <li><strong>One-time shifts:</strong> Use Add One-Time Shift from the menu</li>
      <li><strong>Keep it clean:</strong> Clear monthly data after each period to prevent bloat</li>
    </ul>

    <div class="warning">
      <strong>Important:</strong> The volunteer roster changes annually (July-June). Update the Volunteers sheet each July for the new season.
    </div>

    <h2>Need More Help?</h2>
    <p>Check out the detailed Python-based documentation in the GitHub repository.</p>
  `)
    .setWidth(600)
    .setHeight(700);

  SpreadsheetApp.getUi().showModalDialog(html, 'Bingo Scheduler Help');
}
