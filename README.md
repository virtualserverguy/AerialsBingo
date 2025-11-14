# Aerials Bingo Shift Scheduler

Automated verification system for bingo hall volunteer shift scheduling.

## Features

- Web-based interfaces for managing volunteers and shift schedules
- Track volunteer shift requirements (1, 2, or 3 nights)
- Verify role coverage (caller, manager, assistant manager, workers)
- Import data from SignupGenius CSV exports
- Generate compliance reports showing who's met requirements and which shifts need filling

## Quick Start

### Option 1: Use Web Interfaces (Recommended for Beginners)

1. **Manage Volunteers**: Open `volunteer_manager.html` in your browser
   - Add volunteers with their names, emails, and required shifts
   - Set qualified roles for each volunteer
   - Export to `data/volunteers.csv`

2. **Build Shift Schedule**: Open `shift_builder.html` in your browser
   - Add shifts with dates, times, and staffing requirements
   - Export to `data/shift_requirements.json`

3. **Run Verification**: After exporting from SignupGenius, run:
   ```bash
   python verify_shifts.py --signupgenius data/signupgenius_export.csv
   ```

### Option 2: Manual Setup

```bash
pip install -r requirements.txt
```

1. Edit `data/volunteers.csv` with volunteer requirements
2. Edit `data/shift_requirements.json` with shift schedules
3. Export your SignupGenius data as CSV
4. Run verification:
   ```bash
   python verify_shifts.py --signupgenius data/signupgenius_export.csv
   ```

## File Structure

**Web Interfaces:**
- `volunteer_manager.html` - Web interface to manage volunteers
- `shift_builder.html` - Web interface to build shift schedules

**Python Tools:**
- `verify_shifts.py` - Main verification script
- `models.py` - Data models for volunteers, shifts, and signups
- `parser.py` - SignupGenius CSV parser
- `reporter.py` - Compliance report generator

**Data Files:**
- `data/volunteers.csv` - Volunteer list with requirements
- `data/shift_requirements.json` - Shift schedule and staffing needs
- `data/example_signupgenius_export.csv` - Example export format

**Documentation:**
- `USAGE_GUIDE.md` - Comprehensive usage instructions
