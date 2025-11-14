# Bingo Shift Scheduler - Google Sheets Version

A fully integrated Google Workspace solution for managing volunteer bingo shift scheduling.

## Features

- **Monthly workflow** - Generate schedules month by month to keep spreadsheet clean
- **Recurring shifts** - Set up Tuesday/Thursday patterns that auto-generate
- **Special events** - Template for quarterly Super Bingo nights with extra staffing
- **One-time shifts** - Add unique shifts as needed
- **Annual volunteer roster** - Update once per year (July-June cycle)
- **SignupGenius integration** - Import signup data directly
- **Automated verification** - Check compliance and coverage with one click
- **Detailed reports** - See who's compliant and which shifts need staffing

## Setup Instructions

### 1. Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Bingo Shift Scheduler"

### 2. Add the Apps Script Code

1. In your new sheet, click **Extensions > Apps Script**
2. Delete any default code in the editor
3. Create the following script files (click the **+** next to Files):
   - `Code.gs`
   - `ScheduleGenerator.gs`
   - `Verification.gs`
   - `Reports.gs`

4. Copy the code from each corresponding `.gs` file in this directory into the script editor

5. Click the **Save** icon (💾)

6. Name your project "Bingo Shift Scheduler"

### 3. Initial Setup

1. Close the Apps Script editor
2. **Refresh your Google Sheet** (F5 or Cmd+R)
3. You should now see a new menu: **🎯 Bingo Scheduler**
4. The first time you use any menu item, Google will ask for permissions:
   - Click "Continue"
   - Select your Google account
   - Click "Advanced" if you see a warning
   - Click "Go to Bingo Shift Scheduler (unsafe)"
   - Click "Allow"

5. After granting permissions, go to **🎯 Bingo Scheduler > Help & Setup Guide**
6. This will create all the necessary sheets with sample data

### 4. Customize Your Data

#### Volunteers Sheet
Update this once per year (July):

- Add all your volunteers
- Set required shifts (1, 2, or 3)
- Check which roles they can fill
- Mark active volunteers as "Yes"

#### Shift Templates Sheet
Set up your recurring patterns:

- **Regular Tuesday/Thursday:** Set day of week, time, and staffing needs
- **Special Events:** Use "Special" for day of week, give it a descriptive name
- Mark templates as "Active: Yes" to use them

Example templates:
```
Template Name       | Day of Week | Time    | Callers | Managers | Asst Mgrs | Workers
Regular Tuesday     | Tuesday     | 6:00 PM | 1       | 1        | 1         | 5
Regular Thursday    | Thursday    | 6:00 PM | 1       | 1        | 1         | 5
Super Bingo         | Special     | 6:00 PM | 2       | 2        | 2         | 8
```

## Monthly Workflow

### Each Month:

1. **Generate Schedule**
   - Menu: **Bingo Scheduler > Generate This Month's Schedule**
   - Enter the month (e.g., "January 2025" or "next month")
   - All Tuesdays and Thursdays will be created automatically

2. **Add Special Events** (if applicable)
   - If you have a Super Bingo this month: **Bingo Scheduler > Add One-Time Shift**
   - Enter the specific date and it will use the special event staffing

3. **Volunteers Sign Up**
   - Share your SignupGenius link with volunteers
   - Let them sign up during your signup period

4. **Import SignupGenius Data**
   - Export data from SignupGenius as CSV
   - Menu: **Bingo Scheduler > Import SignupGenius Data**
   - Follow the instructions to paste data into the "SignupGenius Import" sheet
   - Data should include: Name, Email, Item/Role, Date, Time, Location

5. **Run Verification**
   - Menu: **Bingo Scheduler > Run Verification**
   - See summary of compliance and coverage

6. **View Reports**
   - Menu: **Bingo Scheduler > View Compliance Report**
     - Shows which volunteers haven't met requirements
   - Menu: **Bingo Scheduler > View Shift Coverage Report**
     - Shows which shifts need more staff

7. **Follow Up**
   - Contact non-compliant volunteers
   - Send targeted recruitment for understaffed shifts

8. **Start Fresh Next Month**
   - Menu: **Bingo Scheduler > Clear Month & Start Fresh**
   - This removes old schedule and signup data
   - Volunteer roster and templates remain unchanged

## Sheet Descriptions

| Sheet | Purpose | Updates |
|-------|---------|---------|
| **Volunteers** | Master volunteer list with requirements | Annually (July) |
| **Shift Templates** | Recurring shift patterns and special events | Rarely |
| **Monthly Schedule** | Generated schedule for current month | Monthly (auto-generated) |
| **SignupGenius Import** | Paste signup data here | Monthly (manual paste) |
| **Reports** | Generated compliance and coverage reports | Monthly (auto-generated) |
| **Config** | System configuration | Rarely |

## Tips for Success

### Recurring Shifts
- Set up Tuesday/Thursday templates once
- They'll automatically generate for every month
- No need to manually create each shift

### Special Events
- Create a template for "Super Bingo" or other special nights
- Mark it as "Special" (not a day of week)
- Add it manually when you have that event using "Add One-Time Shift"

### One-Time Shifts
- If you pick up an extra night: **Bingo Scheduler > Add One-Time Shift**
- It will be inserted into the schedule in date order

### Keeping It Clean
- **Clear monthly data** at the end of each period
- This prevents the spreadsheet from growing too large
- Volunteer roster and templates are preserved

### Volunteer Roster
- Update once per year in July
- Mark volunteers as "Active: No" if they leave
- This keeps historical data but excludes them from verification

## Troubleshooting

**Menu doesn't appear:**
- Refresh the page (F5)
- Make sure you granted permissions
- Check that the Apps Script code was saved

**"No schedule" error:**
- Generate a monthly schedule first
- Make sure you have active shift templates

**Signups not matching:**
- Check that dates match between schedule and import
- Verify email addresses match between Volunteers and SignupGenius
- Make sure roles are spelled correctly (Caller, Manager, Assistant Manager, Worker)

**Reports are empty:**
- Run verification first
- Make sure you have data in both Monthly Schedule and SignupGenius Import sheets

## Advantages Over Python Version

✅ **All in Google Workspace** - No need to download/upload files
✅ **Real-time collaboration** - Multiple people can view/edit
✅ **Automatic backups** - Google Drive handles versioning
✅ **Easy sharing** - Standard Google Sheets permissions
✅ **No programming required** - Everything through menus and forms
✅ **Monthly refresh** - Keeps spreadsheet size manageable
✅ **Mobile friendly** - Access from anywhere

## Advanced: Automation

You can set up time-based triggers to automate tasks:

1. Go to **Extensions > Apps Script**
2. Click the clock icon (Triggers)
3. Add a trigger to run `generateMonthlySchedule` on the 1st of each month

This would automatically create next month's schedule!

## Support

For questions or issues:
- Use the built-in **Help & Setup Guide** (menu)
- Check the main project README for Python version docs
- Review the code comments in Apps Script editor

---

**Pro Tip:** Share this spreadsheet with your volunteer coordinators with "Edit" access, but protect the Volunteers and Shift Templates sheets so only admins can modify them!
