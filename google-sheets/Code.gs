/**
 * Bingo Shift Scheduler - Google Apps Script
 *
 * Main menu and initialization functions
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎯 Bingo Scheduler')
    .addItem('🚀 Initial Setup (Run First!)', 'setupSpreadsheet')
    .addSeparator()
    .addItem('📅 Generate This Month\'s Schedule', 'generateMonthlySchedule')
    .addItem('⚖️ Balance Staff Distribution', 'balanceStaffDistribution')
    .addSeparator()
    .addItem('📥 Import SignupGenius Data', 'showImportDialog')
    .addItem('✅ Run Verification', 'runVerification')
    .addSeparator()
    .addItem('➕ Add One-Time Shift', 'showAddShiftDialog')
    .addSeparator()
    .addItem('📊 View Compliance Report', 'showComplianceReport')
    .addItem('⚠️ View Shift Coverage Report', 'showCoverageReport')
    .addSeparator()
    .addItem('🗑️ Clear Month & Start Fresh', 'clearMonthlyData')
    .addSeparator()
    .addItem('❓ Help & Setup Guide', 'showHelpDialog')
    .addToUi();
}

/**
 * Check if all required sheets exist
 */
function checkSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = ['Volunteers', 'Shift Templates', 'Monthly Schedule',
                          'SignupGenius Import', 'Reports', 'Config', 'Special Events'];

  for (let sheetName of requiredSheets) {
    if (!ss.getSheetByName(sheetName)) {
      return false;
    }
  }
  return true;
}

/**
 * Initialize spreadsheet with required sheets and sample data
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create sheets if they don't exist
  createSheetIfNotExists('Volunteers');
  createSheetIfNotExists('Shift Templates');
  createSheetIfNotExists('Special Events');
  createSheetIfNotExists('Monthly Schedule');
  createSheetIfNotExists('SignupGenius Import');
  createSheetIfNotExists('Reports');
  createSheetIfNotExists('Config');

  // Setup Volunteers sheet
  setupVolunteersSheet();

  // Setup Shift Templates sheet
  setupShiftTemplatesSheet();

  // Setup Special Events sheet
  setupSpecialEventsSheet();

  // Setup Config sheet
  setupConfigSheet();

  // Setup other sheets
  setupMonthlyScheduleSheet();
  setupSignupGeniusImportSheet();
  setupReportsSheet();

  SpreadsheetApp.getUi().alert('Setup Complete!',
    'All sheets have been created and initialized with sample data.\n\n' +
    'Next steps:\n' +
    '1. Update the Volunteers sheet with your volunteer list\n' +
    '2. Update Shift Templates with your recurring schedules\n' +
    '3. Mark special event dates in the Special Events sheet\n' +
    '4. Use the menu: Bingo Scheduler > Generate This Month\'s Schedule',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function createSheetIfNotExists(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Setup Volunteers sheet with headers and sample data
 */
function setupVolunteersSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Volunteers');
  sheet.clear();

  // Headers
  const headers = [
    ['Name', 'Email', 'Required Shifts', 'Can Be Manager', 'Can Be Caller', 'Can Be Asst Manager', 'Can Be Worker', 'Notes', 'Active']
  ];

  sheet.getRange('A1:I1').setValues(headers)
    .setBackground('#5a67d8')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Sample data
  const sampleData = [
    ['John Smith', 'john.smith@example.com', 3, 'Yes', 'Yes', 'Yes', 'Yes', 'Family of 4', 'Yes'],
    ['Mary Johnson', 'mary.j@example.com', 2, 'Yes', 'No', 'Yes', 'Yes', 'Family of 3', 'Yes'],
    ['Bob Williams', 'bob.w@example.com', 2, 'No', 'Yes', 'No', 'Yes', 'Family of 3', 'Yes'],
    ['Sarah Davis', 'sarah.d@example.com', 1, 'No', 'No', 'No', 'Yes', 'Single member', 'Yes'],
  ];

  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);

  // Format
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 9);

  // Add data validation for dropdowns
  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No'], true)
    .build();

  sheet.getRange('D2:H1000').setDataValidation(yesNoRule);
  sheet.getRange('I2:I1000').setDataValidation(yesNoRule);

  const shiftsRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1', '2', '3'], true)
    .build();

  sheet.getRange('C2:C1000').setDataValidation(shiftsRule);
}

/**
 * Setup Shift Templates sheet
 */
function setupShiftTemplatesSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Shift Templates');
  sheet.clear();

  // Headers
  const headers = [
    ['Template Name', 'Day of Week', 'Time', 'Location', 'Callers Needed', 'Managers Needed', 'Asst Managers Needed', 'Workers Needed', 'Active']
  ];

  sheet.getRange('A1:I1').setValues(headers)
    .setBackground('#ec4899')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Sample templates
  const templates = [
    ['Regular Tuesday', 'Tuesday', '6:00 PM', 'Main Hall', 1, 1, 1, 5, 'Yes'],
    ['Regular Thursday', 'Thursday', '6:00 PM', 'Main Hall', 1, 1, 1, 5, 'Yes'],
    ['Super Bingo (Quarterly)', 'Special', '6:00 PM', 'Main Hall', 2, 2, 2, 8, 'Yes'],
  ];

  sheet.getRange(2, 1, templates.length, templates[0].length).setValues(templates);

  // Format
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 9);

  // Add data validation
  const dowRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Special'], true)
    .build();

  sheet.getRange('B2:B1000').setDataValidation(dowRule);

  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No'], true)
    .build();

  sheet.getRange('I2:I1000').setDataValidation(yesNoRule);
}

/**
 * Setup Special Events sheet
 */
function setupSpecialEventsSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Special Events');
  sheet.clear();

  const headers = [
    ['Date', 'Event Type', 'Description']
  ];

  sheet.getRange('A1:C1').setValues(headers)
    .setBackground('#f59e0b')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Sample data
  const sampleData = [
    ['2025-01-15', 'Super Bingo', 'Q1 Super Bingo Night'],
    ['2025-04-10', 'Must Go', 'Special Must Go Event'],
  ];

  sheet.getRange(2, 1, sampleData.length, 3).setValues(sampleData);

  // Add data validation for Event Type
  const eventTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Super Bingo', 'Must Go'], true)
    .build();

  sheet.getRange('B2:B1000').setDataValidation(eventTypeRule);

  // Format dates
  sheet.getRange('A2:A1000').setNumberFormat('yyyy-mm-dd');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);

  // Add instructions
  sheet.getRange('A4').setValue('Add dates for Super Bingo and Must Go events. These will be marked when generating monthly schedules.')
    .setFontStyle('italic')
    .setFontColor('#666666');
}

/**
 * Setup Config sheet
 */
function setupConfigSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  sheet.clear();

  const config = [
    ['Configuration', 'Value', 'Description'],
    ['Current Season Start', '2024-07-01', 'Start of volunteer season (July)'],
    ['Current Season End', '2025-06-30', 'End of volunteer season (June)'],
    ['Default Location', 'Main Hall', 'Default location for shifts'],
    ['Default Time', '6:00 PM', 'Default shift time'],
    ['Super Bingo Value', '1.5', 'Multiplier for Super Bingo shifts (1.5x regular)'],
    ['Must Go Value', '2.0', 'Multiplier for Must Go shifts (2x regular)'],
  ];

  sheet.getRange(1, 1, config.length, 3).setValues(config);
  sheet.getRange('A1:C1')
    .setBackground('#10b981')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
}

/**
 * Setup Monthly Schedule sheet
 */
function setupMonthlyScheduleSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Monthly Schedule');
  sheet.clear();

  const headers = [
    ['Date', 'Day of Week', 'Time', 'Location', 'Event Type', 'Callers Needed', 'Managers Needed', 'Asst Managers Needed', 'Workers Needed', 'Notes']
  ];

  sheet.getRange('A1:J1').setValues(headers)
    .setBackground('#f59e0b')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Add data validation for Event Type
  const eventTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Regular', 'Super Bingo', 'Must Go'], true)
    .build();

  sheet.getRange('E2:E1000').setDataValidation(eventTypeRule);

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 10);
}

/**
 * Setup SignupGenius Import sheet
 */
function setupSignupGeniusImportSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SignupGenius Import');
  sheet.clear();

  const headers = [
    ['Name', 'Email', 'Item/Role', 'Date', 'Time', 'Location']
  ];

  sheet.getRange('A1:F1').setValues(headers)
    .setBackground('#8b5cf6')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 6);

  // Add instructions
  sheet.getRange('A3').setValue('Paste your SignupGenius export data here (starting from row 2)');
  sheet.getRange('A3').setFontStyle('italic').setFontColor('#666666');
}

/**
 * Setup Reports sheet
 */
function setupReportsSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reports');
  sheet.clear();

  sheet.getRange('A1').setValue('Reports will be generated here')
    .setFontWeight('bold')
    .setFontSize(14);
}
