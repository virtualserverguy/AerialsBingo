"""
Report generation for shift compliance and coverage.
"""
from typing import List, Dict
from datetime import datetime
from models import (
    Volunteer, ShiftRequirement, Signup, Role,
    VolunteerCompliance, ShiftCoverage
)


class ComplianceReporter:
    """Generate reports on volunteer compliance and shift coverage."""

    def __init__(self, volunteers: Dict[str, Volunteer],
                 shift_requirements: List[ShiftRequirement],
                 signups: List[Signup]):
        self.volunteers = volunteers
        self.shift_requirements = shift_requirements
        self.signups = signups

        # Build compliance and coverage data
        self.volunteer_compliance = self._build_volunteer_compliance()
        self.shift_coverage = self._build_shift_coverage()

    def _build_volunteer_compliance(self) -> Dict[str, VolunteerCompliance]:
        """Build compliance tracking for each volunteer."""
        compliance = {}

        for email, volunteer in self.volunteers.items():
            volunteer_signups = [s for s in self.signups if s.volunteer_email == email]
            compliance[email] = VolunteerCompliance(
                volunteer=volunteer,
                signups=volunteer_signups
            )

        return compliance

    def _build_shift_coverage(self) -> List[ShiftCoverage]:
        """Build coverage tracking for each shift."""
        coverage_list = []

        for shift_req in self.shift_requirements:
            signups_by_role = {}

            # Find all signups matching this shift
            matching_signups = [
                s for s in self.signups
                if s.matches_shift(shift_req)
            ]

            # Group by role
            for signup in matching_signups:
                if signup.role not in signups_by_role:
                    signups_by_role[signup.role] = []
                signups_by_role[signup.role].append(signup)

            coverage = ShiftCoverage(
                shift_requirement=shift_req,
                signups_by_role=signups_by_role
            )
            coverage_list.append(coverage)

        return coverage_list

    def generate_full_report(self) -> str:
        """Generate comprehensive text report."""
        lines = []
        lines.append("=" * 80)
        lines.append("BINGO SHIFT VERIFICATION REPORT")
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)

        # Volunteer Compliance Section
        lines.append("\n" + "=" * 80)
        lines.append("VOLUNTEER COMPLIANCE")
        lines.append("=" * 80)

        compliant = []
        non_compliant = []

        for email, comp in self.volunteer_compliance.items():
            if comp.is_compliant():
                compliant.append(comp)
            else:
                non_compliant.append(comp)

        # Non-compliant volunteers first
        if non_compliant:
            lines.append("\n⚠️  NON-COMPLIANT VOLUNTEERS")
            lines.append("-" * 80)
            for comp in sorted(non_compliant, key=lambda c: c.volunteer.name):
                v = comp.volunteer
                lines.append(f"\n{v.name} ({v.email})")
                lines.append(f"  Required: {v.required_shifts} shifts")
                lines.append(f"  Signed up: {comp.shifts_signed_up()} shifts")
                lines.append(f"  Shortfall: {comp.shortfall()} shifts ⚠️")
                if comp.signups:
                    lines.append(f"  Current signups:")
                    for signup in comp.signups:
                        date_str = signup.shift_date.strftime('%Y-%m-%d')
                        lines.append(f"    - {date_str} {signup.shift_time} as {signup.role.value}")
        else:
            lines.append("\n✓ All volunteers are compliant!")

        # Compliant volunteers
        if compliant:
            lines.append(f"\n✓ COMPLIANT VOLUNTEERS ({len(compliant)})")
            lines.append("-" * 80)
            for comp in sorted(compliant, key=lambda c: c.volunteer.name):
                v = comp.volunteer
                lines.append(f"{v.name}: {comp.shifts_signed_up()}/{v.required_shifts} shifts")

        # Shift Coverage Section
        lines.append("\n" + "=" * 80)
        lines.append("SHIFT COVERAGE")
        lines.append("=" * 80)

        uncovered = []
        partial = []
        fully_covered = []

        for coverage in sorted(self.shift_coverage,
                             key=lambda c: c.shift_requirement.date):
            if coverage.is_fully_covered():
                fully_covered.append(coverage)
            else:
                gaps = coverage.get_gaps()
                if len(gaps) == len(coverage.shift_requirement.role_requirements):
                    uncovered.append(coverage)
                else:
                    partial.append(coverage)

        # Uncovered shifts
        if uncovered:
            lines.append("\n⚠️  COMPLETELY UNCOVERED SHIFTS")
            lines.append("-" * 80)
            for coverage in uncovered:
                shift = coverage.shift_requirement
                date_str = shift.date.strftime('%Y-%m-%d')
                lines.append(f"\n{date_str} {shift.time} - {shift.location}")
                lines.append(f"  Needs:")
                for role, count in shift.role_requirements.items():
                    lines.append(f"    - {count} {role.value}(s)")

        # Partially covered shifts
        if partial:
            lines.append("\n⚠️  PARTIALLY COVERED SHIFTS")
            lines.append("-" * 80)
            for coverage in partial:
                shift = coverage.shift_requirement
                date_str = shift.date.strftime('%Y-%m-%d')
                lines.append(f"\n{date_str} {shift.time} - {shift.location}")

                gaps = coverage.get_gaps()
                if gaps:
                    lines.append(f"  Still needed:")
                    for role, count in gaps.items():
                        lines.append(f"    - {count} more {role.value}(s)")

                lines.append(f"  Currently filled:")
                for role, signups in coverage.signups_by_role.items():
                    if signups:
                        names = [s.volunteer_name for s in signups]
                        lines.append(f"    - {role.value}: {', '.join(names)}")

        # Fully covered shifts
        if fully_covered:
            lines.append(f"\n✓ FULLY COVERED SHIFTS ({len(fully_covered)})")
            lines.append("-" * 80)
            for coverage in fully_covered:
                shift = coverage.shift_requirement
                date_str = shift.date.strftime('%Y-%m-%d')
                lines.append(f"\n{date_str} {shift.time}")
                for role, signups in coverage.signups_by_role.items():
                    names = [s.volunteer_name for s in signups]
                    lines.append(f"  {role.value}: {', '.join(names)}")

        # Summary Section
        lines.append("\n" + "=" * 80)
        lines.append("SUMMARY")
        lines.append("=" * 80)
        lines.append(f"Total volunteers: {len(self.volunteers)}")
        lines.append(f"  Compliant: {len(compliant)}")
        lines.append(f"  Non-compliant: {len(non_compliant)}")
        lines.append(f"\nTotal shifts: {len(self.shift_requirements)}")
        lines.append(f"  Fully covered: {len(fully_covered)}")
        lines.append(f"  Partially covered: {len(partial)}")
        lines.append(f"  Uncovered: {len(uncovered)}")

        # Calculate total slots needed vs filled
        total_slots_needed = sum(s.total_slots() for s in self.shift_requirements)
        total_slots_filled = len(self.signups)
        lines.append(f"\nTotal positions needed: {total_slots_needed}")
        lines.append(f"Total positions filled: {total_slots_filled}")
        lines.append(f"Remaining gaps: {total_slots_needed - total_slots_filled}")

        lines.append("\n" + "=" * 80)

        return "\n".join(lines)

    def get_non_compliant_volunteers(self) -> List[VolunteerCompliance]:
        """Get list of volunteers who haven't met requirements."""
        return [
            comp for comp in self.volunteer_compliance.values()
            if not comp.is_compliant()
        ]

    def get_uncovered_shifts(self) -> List[ShiftCoverage]:
        """Get shifts that aren't fully covered."""
        return [
            coverage for coverage in self.shift_coverage
            if not coverage.is_fully_covered()
        ]

    def export_non_compliant_csv(self, output_path: str):
        """Export non-compliant volunteers to CSV for follow-up."""
        import csv

        non_compliant = self.get_non_compliant_volunteers()

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Name', 'Email', 'Required Shifts', 'Signed Up',
                'Shortfall', 'Notes'
            ])

            for comp in sorted(non_compliant, key=lambda c: c.volunteer.name):
                v = comp.volunteer
                writer.writerow([
                    v.name,
                    v.email,
                    v.required_shifts,
                    comp.shifts_signed_up(),
                    comp.shortfall(),
                    v.notes
                ])

        print(f"Exported {len(non_compliant)} non-compliant volunteers to {output_path}")
