# Aerials Bingo Shift Scheduler

Automated verification system for bingo hall volunteer shift scheduling.

## Features

- Track volunteer shift requirements (1, 2, or 3 nights)
- Verify role coverage (caller, manager, assistant manager, workers)
- Import data from SignupGenius CSV exports
- Generate compliance reports showing who's met requirements and which shifts need filling

## Setup

```bash
pip install -r requirements.txt
```

## Usage

1. Export your SignupGenius data as CSV
2. Update `data/volunteers.csv` with volunteer requirements
3. Update `data/shift_requirements.json` with shift role needs
4. Run the verification:

```bash
python verify_shifts.py --signupgenius data/signupgenius_export.csv
```

## File Structure

- `verify_shifts.py` - Main verification script
- `models.py` - Data models for volunteers, shifts, and signups
- `parser.py` - SignupGenius CSV parser
- `reporter.py` - Compliance report generator
- `data/` - Data files (volunteers, shift requirements, exports)
