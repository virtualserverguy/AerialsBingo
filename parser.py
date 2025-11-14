"""
Parsers for loading data from various sources.
"""
import csv
import json
from datetime import datetime
from typing import List, Dict
from pathlib import Path
import pandas as pd

from models import Volunteer, ShiftRequirement, Signup, Role


class VolunteerParser:
    """Parse volunteer requirements from CSV."""

    @staticmethod
    def parse_csv(file_path: str) -> Dict[str, Volunteer]:
        """
        Parse volunteers from CSV file.
        Expected columns: Name, Email, Required_Shifts, Qualified_Roles, Notes
        Qualified_Roles should be pipe-separated (e.g., "Manager|Caller")
        """
        volunteers = {}

        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Parse qualified roles
                qualified_roles = []
                if row.get('Qualified_Roles'):
                    role_strs = row['Qualified_Roles'].split('|')
                    for role_str in role_strs:
                        role = Role.from_string(role_str.strip())
                        if role:
                            qualified_roles.append(role)

                volunteer = Volunteer(
                    name=row['Name'].strip(),
                    email=row['Email'].strip().lower(),
                    required_shifts=int(row['Required_Shifts']),
                    qualified_roles=qualified_roles,
                    notes=row.get('Notes', '').strip()
                )
                volunteers[volunteer.email] = volunteer

        return volunteers


class ShiftRequirementParser:
    """Parse shift requirements from JSON."""

    @staticmethod
    def parse_json(file_path: str) -> List[ShiftRequirement]:
        """
        Parse shift requirements from JSON file.
        Expected format:
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
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        shift_requirements = []
        for shift_data in data.get('shifts', []):
            # Parse date
            date = datetime.strptime(shift_data['date'], '%Y-%m-%d')

            # Parse role requirements
            role_requirements = {}
            for role_str, count in shift_data.get('roles', {}).items():
                role = Role.from_string(role_str)
                if role:
                    role_requirements[role] = count

            shift_req = ShiftRequirement(
                date=date,
                time=shift_data['time'],
                role_requirements=role_requirements,
                location=shift_data.get('location', 'Main Hall')
            )
            shift_requirements.append(shift_req)

        return shift_requirements


class SignupGeniusParser:
    """Parse SignupGenius CSV exports."""

    @staticmethod
    def parse_csv(file_path: str) -> List[Signup]:
        """
        Parse SignupGenius export CSV.

        Expected columns (may vary based on your SignupGenius setup):
        - First Name, Last Name (or just Name)
        - Email
        - Item (contains the role/position)
        - Date, Time (or combined DateTime)
        - Location (optional)

        Adjust column names based on your actual exports.
        """
        signups = []

        try:
            df = pd.read_csv(file_path)

            # Normalize column names (remove spaces, lowercase)
            df.columns = df.columns.str.strip()

            for _, row in df.iterrows():
                try:
                    # Extract volunteer info
                    if 'Name' in df.columns:
                        volunteer_name = str(row['Name']).strip()
                    else:
                        first = str(row.get('First Name', '')).strip()
                        last = str(row.get('Last Name', '')).strip()
                        volunteer_name = f"{first} {last}".strip()

                    email = str(row.get('Email', '')).strip().lower()
                    if not email or email == 'nan':
                        continue  # Skip rows without email

                    # Extract shift date/time
                    if 'Date' in df.columns:
                        date_str = str(row['Date']).strip()
                        try:
                            # Try common date formats
                            shift_date = pd.to_datetime(date_str).to_pydatetime()
                        except:
                            # Try parsing manually
                            shift_date = datetime.strptime(date_str, '%m/%d/%Y')
                    else:
                        continue  # Skip if no date

                    shift_time = str(row.get('Time', '')).strip()

                    # Extract role from Item field
                    item = str(row.get('Item', '')).strip()
                    role = Role.from_string(item)

                    if not role:
                        # Try to extract role from item description
                        # e.g., "Worker - Jan 15" -> "Worker"
                        for r in Role:
                            if r.value.lower() in item.lower():
                                role = r
                                break

                    if not role:
                        role = Role.WORKER  # Default to worker if unclear

                    signup = Signup(
                        volunteer_email=email,
                        volunteer_name=volunteer_name,
                        shift_date=shift_date,
                        shift_time=shift_time,
                        role=role
                    )
                    signups.append(signup)

                except Exception as e:
                    print(f"Warning: Could not parse row: {row.to_dict()}")
                    print(f"  Error: {e}")
                    continue

        except Exception as e:
            print(f"Error reading CSV file: {e}")
            raise

        return signups

    @staticmethod
    def print_sample_format(file_path: str, num_rows: int = 5):
        """Print sample data format to help configure parser."""
        print(f"\n=== Sample data from {file_path} ===\n")
        df = pd.read_csv(file_path)
        print(f"Columns: {list(df.columns)}\n")
        print("First few rows:")
        print(df.head(num_rows))
        print("\n" + "="*50 + "\n")
