# Bingo Shift Verification System - Usage Guide

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Prepare your data files**:
   - `data/volunteers.csv` - Your volunteer list with requirements
   - `data/shift_requirements.json` - Your shift schedules and role needs
   - Export your SignupGenius data as CSV

3. **Run verification**:
   ```bash
   python verify_shifts.py --signupgenius data/your_export.csv
   ```

## Data File Formats

### 1. Volunteers CSV (`data/volunteers.csv`)

This file tracks who your volunteers are and their requirements.

**Columns**:
- `Name` - Volunteer's full name
- `Email` - Email address (used as unique identifier)
- `Required_Shifts` - Number of shifts they must sign up for (1, 2, or 3)
- `Qualified_Roles` - Roles they can fill, separated by `|` (e.g., "Manager|Caller|Worker")
- `Notes` - Any additional notes (optional)

**Available Roles**:
- `Manager`
- `Caller`
- `Assistant Manager`
- `Worker`

**Example**:
```csv
Name,Email,Required_Shifts,Qualified_Roles,Notes
John Smith,john.smith@example.com,3,Manager|Caller|Worker,Family of 4
Mary Johnson,mary.j@example.com,2,Worker,Family of 3
Sarah Davis,sarah.d@example.com,1,Worker,Single member
```

### 2. Shift Requirements JSON (`data/shift_requirements.json`)

This file defines your bingo schedule and staffing needs.

**Format**:
```json
{
  "shifts": [
    {
      "date": "2025-01-15",
      "time": "6:00 PM",
      "location": "Main Hall",
      "roles": {
        "Caller": 1,
        "Manager": 1,
        "Assistant Manager": 1,
        "Worker": 5
      }
    }
  ]
}
```

**Fields**:
- `date` - Shift date in YYYY-MM-DD format
- `time` - Shift time as string (e.g., "6:00 PM")
- `location` - Location name (optional, defaults to "Main Hall")
- `roles` - Object mapping role names to quantities needed

### 3. SignupGenius Export CSV

Export your SignupGenius data with these columns (column names may vary):

**Expected columns**:
- `Name` or `First Name` + `Last Name` - Volunteer name
- `Email` - Volunteer email address
- `Item` - The signup item (should contain the role: "Caller", "Manager", etc.)
- `Date` - Shift date (format: MM/DD/YYYY)
- `Time` - Shift time
- `Location` - (optional)

**Tips**:
1. In SignupGenius, go to your sign-up
2. Click "Reports" tab
3. Select "List of Sign Ups for Export to Excel with All Fields"
4. Click "EXPORT DATA AS CSV FILE"

## Running the Verification

### Basic Usage

```bash
python verify_shifts.py --signupgenius data/signupgenius_export.csv
```

This will:
- Load volunteers from `data/volunteers.csv`
- Load shift requirements from `data/shift_requirements.json`
- Parse signups from your SignupGenius export
- Print a detailed report to the console

### Command Line Options

```bash
python verify_shifts.py \
  --volunteers data/volunteers.csv \
  --shifts data/shift_requirements.json \
  --signupgenius data/signupgenius_export.csv \
  --output reports/compliance_report.txt \
  --export-noncompliant reports/need_followup.csv
```

**Options**:
- `--volunteers PATH` - Path to volunteers CSV (default: data/volunteers.csv)
- `--shifts PATH` - Path to shift requirements JSON (default: data/shift_requirements.json)
- `--signupgenius PATH` - Path to SignupGenius export CSV (**required**)
- `--output PATH` - Save report to file instead of printing
- `--export-noncompliant PATH` - Export non-compliant volunteers to CSV for follow-up
- `--show-sample` - Show format of your SignupGenius export (helpful for debugging)

### Debugging SignupGenius Format

If the parser isn't working with your export:

```bash
python verify_shifts.py --signupgenius data/your_export.csv --show-sample
```

This will show you the columns and first few rows, helping you adjust the parser if needed.

## Understanding the Report

The report has four main sections:

### 1. Volunteer Compliance

Shows which volunteers have met their shift requirements and which haven't.

**Non-compliant volunteers**:
- Shows how many shifts they still need to sign up for
- Lists their current signups

**Compliant volunteers**:
- Simple list showing they've met requirements

### 2. Shift Coverage

Shows which shifts are fully staffed and which need more volunteers.

**Uncovered shifts**:
- Shifts with no signups at all
- Lists all roles needed

**Partially covered shifts**:
- Shows what's still needed
- Shows who's already signed up

**Fully covered shifts**:
- All positions filled
- Lists volunteers by role

### 3. Summary

Quick overview of:
- Total volunteers (compliant vs. non-compliant)
- Total shifts (covered vs. uncovered)
- Total positions needed vs. filled

## Common Workflows

### Monthly Verification After Signup Period

1. Close your SignupGenius signup period
2. Export the data as CSV
3. Run verification:
   ```bash
   python verify_shifts.py \
     --signupgenius exports/january_2025.csv \
     --output reports/january_compliance.txt \
     --export-noncompliant reports/january_followup.csv
   ```
4. Review the report
5. Use the `january_followup.csv` to send reminders to non-compliant volunteers

### Mid-Period Check

```bash
python verify_shifts.py --signupgenius current_signups.csv
```

Quick check to see:
- Who still needs to sign up
- Which shifts need more coverage
- Whether you need to send reminders

### Testing New Shift Schedule

1. Create/update `data/shift_requirements.json` with your new schedule
2. Run with an empty or minimal SignupGenius export
3. See total positions needed
4. Verify the role requirements make sense

## Exit Codes

- `0` - All requirements met (all volunteers compliant, all shifts covered)
- `1` - Issues found (non-compliant volunteers or uncovered shifts)

This is useful for automation/scripting:

```bash
if python verify_shifts.py --signupgenius data/export.csv; then
  echo "All good!"
else
  echo "Need to follow up with volunteers"
fi
```

## Tips and Best Practices

1. **Keep volunteers.csv updated** - Add new volunteers, update family sizes, adjust qualifications

2. **Use qualified roles** - If someone can be a Manager, make sure "Manager" is in their Qualified_Roles

3. **Regular checks** - Run verification weekly during signup period to identify issues early

4. **Email templates** - Use the exported non-compliant CSV to send targeted reminder emails

5. **Archive reports** - Save monthly reports for historical tracking

6. **Backup data** - Keep copies of all your data files in the `data/` directory

## Customization

### Adding New Roles

To add new roles (e.g., "Cashier", "Door Monitor"):

1. Edit `models.py` and add to the `Role` enum:
   ```python
   class Role(Enum):
       CALLER = "Caller"
       MANAGER = "Manager"
       ASSISTANT_MANAGER = "Assistant Manager"
       WORKER = "Worker"
       CASHIER = "Cashier"  # Add new role
       DOOR_MONITOR = "Door Monitor"  # Add new role
   ```

2. Update your shift requirements JSON to include the new roles

3. Update volunteers CSV to include new roles in Qualified_Roles

### Adjusting SignupGenius Parser

If your SignupGenius export has different column names, edit `parser.py` in the `SignupGeniusParser.parse_csv()` method to match your column names.

## Troubleshooting

**Problem**: "ModuleNotFoundError: No module named 'pandas'"
- **Solution**: Run `pip install -r requirements.txt`

**Problem**: Parser can't read my SignupGenius export
- **Solution**: Run with `--show-sample` to see the format, then adjust column names in `parser.py`

**Problem**: Volunteers not matching between files
- **Solution**: Make sure email addresses match exactly (case-insensitive matching is automatic)

**Problem**: Dates not parsing correctly
- **Solution**: Ensure dates in SignupGenius export are in MM/DD/YYYY format

## Support

For issues or questions about the system, check:
1. This usage guide
2. Example data files in `data/` directory
3. The README.md file
