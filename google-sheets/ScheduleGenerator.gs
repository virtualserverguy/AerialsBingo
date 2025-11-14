/**
 * Schedule Generator - Handles monthly schedule creation from templates
 */

/**
 * Generate schedule for the current or next month
 */
function generateMonthlySchedule() {
  const ui = SpreadsheetApp.getUi();

  // Check if sheets are set up
  if (!checkSheetsExist()) {
    ui.alert(
      'Setup Required',
      'Please run "🚀 Initial Setup (Run First!)" from the menu before generating schedules.',
      ui.ButtonSet.OK
    );
    return;
  }

  // Ask user which month to generate
  const result = ui.prompt(
    'Generate Monthly Schedule',
    'Enter month and year (e.g., "January 2025" or "next month"):',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const input = result.getResponseText().trim().toLowerCase();
  let targetDate;

  if (input === 'next month' || input === '') {
    targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 1);
    targetDate.setDate(1);
  } else {
    try {
      targetDate = new Date(input);
      if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (e) {
      ui.alert('Invalid date format. Please use format like "January 2025" or "next month"');
      return;
    }
  }

  const monthName = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'MMMM yyyy');

  const confirm = ui.alert(
    'Generate Schedule',
    `Generate schedule for ${monthName}?\n\nThis will replace any existing schedule for this month.`,
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    return;
  }

  try {
    generateScheduleForMonth(targetDate);
    ui.alert('Success!', `Schedule generated for ${monthName}`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Error', `Failed to generate schedule: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Generate schedule for a specific month
 */
function generateScheduleForMonth(targetDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName('Monthly Schedule');

  // Clear existing schedule (keep headers)
  const lastRow = scheduleSheet.getLastRow();
  if (lastRow > 1) {
    scheduleSheet.deleteRows(2, lastRow - 1);
  }

  // Get templates and special events
  const templates = getShiftTemplates();
  const specialEvents = getSpecialEvents();

  // Get recurring templates (by day of week)
  const recurringTemplates = templates.filter(t => t.dayOfWeek !== 'Special' && t.active);

  // Get special event template (for enhanced staffing)
  const specialTemplate = templates.find(t => t.dayOfWeek === 'Special' && t.active);

  // Generate shifts for each day in the month
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const shifts = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const dayOfWeek = Utilities.formatDate(date, Session.getScriptTimeZone(), 'EEEE');

    // Check if this date is a special event
    const specialEvent = specialEvents.find(e => e.date === dateStr);

    // Find matching template for this day of week
    const matchingTemplates = recurringTemplates.filter(t => t.dayOfWeek === dayOfWeek);

    matchingTemplates.forEach(template => {
      let eventType = 'Regular';
      let callers = template.callersNeeded;
      let managers = template.managersNeeded;
      let asstManagers = template.asstManagersNeeded;
      let workers = template.workersNeeded;

      // Override with special event template if applicable
      if (specialEvent && specialTemplate) {
        eventType = specialEvent.eventType;
        callers = specialTemplate.callersNeeded;
        managers = specialTemplate.managersNeeded;
        asstManagers = specialTemplate.asstManagersNeeded;
        workers = specialTemplate.workersNeeded;
      }

      shifts.push({
        date: date,
        dayOfWeek: dayOfWeek,
        time: template.time,
        location: template.location,
        eventType: eventType,
        callersNeeded: callers,
        managersNeeded: managers,
        asstManagersNeeded: asstManagers,
        workersNeeded: workers,
        notes: specialEvent ? `${eventType} - ${specialEvent.description}` : template.templateName
      });
    });
  }

  // Sort by date
  shifts.sort((a, b) => a.date - b.date);

  // Write to sheet
  if (shifts.length > 0) {
    const data = shifts.map(shift => [
      Utilities.formatDate(shift.date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      shift.dayOfWeek,
      shift.time,
      shift.location,
      shift.eventType,
      shift.callersNeeded,
      shift.managersNeeded,
      shift.asstManagersNeeded,
      shift.workersNeeded,
      shift.notes
    ]);

    scheduleSheet.getRange(2, 1, data.length, 10).setValues(data);

    // Format dates
    scheduleSheet.getRange(2, 1, data.length, 1).setNumberFormat('yyyy-mm-dd');

    // Alternate row colors and highlight special events
    for (let i = 0; i < data.length; i++) {
      const row = i + 2;
      const eventType = data[i][4]; // Event Type column

      if (eventType === 'Super Bingo') {
        scheduleSheet.getRange(row, 1, 1, 10).setBackground('#fef3c7'); // Light yellow
      } else if (eventType === 'Must Go') {
        scheduleSheet.getRange(row, 1, 1, 10).setBackground('#fed7d7'); // Light red
      } else if (i % 2 === 0) {
        scheduleSheet.getRange(row, 1, 1, 10).setBackground('#f9fafb');
      }
    }
  }

  scheduleSheet.autoResizeColumns(1, 10);
}

/**
 * Get special events from Special Events sheet
 */
function getSpecialEvents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Special Events');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  return data
    .filter(row => row[0]) // Filter out empty rows
    .map(row => {
      const dateObj = new Date(row[0]);
      return {
        date: Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        eventType: row[1],
        description: row[2]
      };
    });
}

/**
 * Get all shift templates
 */
function getShiftTemplates() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Shift Templates');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  return data.map(row => ({
    templateName: row[0],
    dayOfWeek: row[1],
    time: row[2],
    location: row[3],
    callersNeeded: row[4],
    managersNeeded: row[5],
    asstManagersNeeded: row[6],
    workersNeeded: row[7],
    active: row[8] === 'Yes'
  })).filter(t => t.templateName); // Filter out empty rows
}

/**
 * Show dialog to add a one-time shift
 */
function showAddShiftDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      label { display: block; margin-top: 10px; font-weight: bold; }
      input, select { width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box; }
      button { margin-top: 20px; padding: 10px 20px; background: #5a67d8; color: white; border: none; border-radius: 4px; cursor: pointer; }
      button:hover { background: #4c51bf; }
    </style>

    <h3>Add One-Time Shift</h3>

    <label>Date</label>
    <input type="date" id="date">

    <label>Time</label>
    <input type="text" id="time" value="6:00 PM">

    <label>Location</label>
    <input type="text" id="location" value="Main Hall">

    <label>Callers Needed</label>
    <input type="number" id="callers" value="1" min="0">

    <label>Managers Needed</label>
    <input type="number" id="managers" value="1" min="0">

    <label>Assistant Managers Needed</label>
    <input type="number" id="asstManagers" value="1" min="0">

    <label>Workers Needed</label>
    <input type="number" id="workers" value="5" min="0">

    <label>Notes</label>
    <input type="text" id="notes" placeholder="e.g., Special event">

    <button onclick="addShift()">Add Shift</button>

    <script>
      // Set today's date as default
      document.getElementById('date').valueAsDate = new Date();

      function addShift() {
        const data = {
          date: document.getElementById('date').value,
          time: document.getElementById('time').value,
          location: document.getElementById('location').value,
          callers: parseInt(document.getElementById('callers').value),
          managers: parseInt(document.getElementById('managers').value),
          asstManagers: parseInt(document.getElementById('asstManagers').value),
          workers: parseInt(document.getElementById('workers').value),
          notes: document.getElementById('notes').value
        };

        google.script.run
          .withSuccessHandler(() => {
            alert('Shift added successfully!');
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('Error: ' + error.message);
          })
          .addOneTimeShift(data);
      }
    </script>
  `)
    .setWidth(400)
    .setHeight(550);

  SpreadsheetApp.getUi().showModalDialog(html, 'Add One-Time Shift');
}

/**
 * Add a one-time shift to the monthly schedule
 */
function addOneTimeShift(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Monthly Schedule');

  const date = new Date(data.date);
  const dayOfWeek = Utilities.formatDate(date, Session.getScriptTimeZone(), 'EEEE');

  const newRow = [
    Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    dayOfWeek,
    data.time,
    data.location,
    'Regular', // Event Type - defaults to Regular for one-time shifts
    data.callers,
    data.managers,
    data.asstManagers,
    data.workers,
    data.notes
  ];

  // Find the right place to insert (keep sorted by date)
  const lastRow = sheet.getLastRow();
  let insertRow = lastRow + 1;

  if (lastRow > 1) {
    const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < dates.length; i++) {
      const existingDate = new Date(dates[i][0]);
      if (date < existingDate) {
        insertRow = i + 2;
        break;
      }
    }
  }

  // Insert row
  if (insertRow <= lastRow) {
    sheet.insertRowBefore(insertRow);
  }

  sheet.getRange(insertRow, 1, 1, 10).setValues([newRow]);
  sheet.getRange(insertRow, 1).setNumberFormat('yyyy-mm-dd');

  // Reapply alternating colors
  const totalRows = sheet.getLastRow() - 1;
  for (let i = 0; i < totalRows; i++) {
    const row = i + 2;
    if (i % 2 === 0) {
      sheet.getRange(row, 1, 1, 10).setBackground('#f9fafb');
    } else {
      sheet.getRange(row, 1, 1, 10).setBackground('#ffffff');
    }
  }
}

/**
 * Clear monthly data to start fresh
 */
function clearMonthlyData() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    'Clear Data',
    'This will clear:\n- Monthly Schedule\n- SignupGenius Import\n- Reports\n\nAre you sure?',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Clear Monthly Schedule
  const scheduleSheet = ss.getSheetByName('Monthly Schedule');
  const scheduleLastRow = scheduleSheet.getLastRow();
  if (scheduleLastRow > 1) {
    scheduleSheet.deleteRows(2, scheduleLastRow - 1);
  }

  // Clear SignupGenius Import
  const importSheet = ss.getSheetByName('SignupGenius Import');
  const importLastRow = importSheet.getLastRow();
  if (importLastRow > 1) {
    importSheet.deleteRows(2, importLastRow - 1);
  }

  // Clear Reports
  const reportsSheet = ss.getSheetByName('Reports');
  reportsSheet.clear();
  reportsSheet.getRange('A1').setValue('Reports will be generated here')
    .setFontWeight('bold')
    .setFontSize(14);

  ui.alert('Data Cleared', 'Monthly data has been cleared. You can now generate a new schedule.', ui.ButtonSet.OK);
}
