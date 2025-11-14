#!/usr/bin/env python3
"""
Bingo Shift Verification System

Verifies volunteer compliance and shift coverage for bingo hall operations.
"""
import argparse
import sys
from pathlib import Path

from parser import VolunteerParser, ShiftRequirementParser, SignupGeniusParser
from reporter import ComplianceReporter


def main():
    parser = argparse.ArgumentParser(
        description='Verify bingo shift signups and volunteer compliance'
    )

    parser.add_argument(
        '--volunteers',
        default='data/volunteers.csv',
        help='Path to volunteer requirements CSV (default: data/volunteers.csv)'
    )

    parser.add_argument(
        '--shifts',
        default='data/shift_requirements.json',
        help='Path to shift requirements JSON (default: data/shift_requirements.json)'
    )

    parser.add_argument(
        '--signupgenius',
        required=True,
        help='Path to SignupGenius export CSV'
    )

    parser.add_argument(
        '--output',
        help='Path to save report (default: print to console)'
    )

    parser.add_argument(
        '--export-noncompliant',
        help='Export non-compliant volunteers to CSV file'
    )

    parser.add_argument(
        '--show-sample',
        action='store_true',
        help='Show sample format of SignupGenius CSV and exit'
    )

    args = parser.parse_args()

    # Validate input files exist
    for file_path, name in [
        (args.volunteers, 'Volunteers file'),
        (args.shifts, 'Shift requirements file'),
        (args.signupgenius, 'SignupGenius export file')
    ]:
        if not Path(file_path).exists():
            print(f"Error: {name} not found: {file_path}")
            sys.exit(1)

    # Show sample format if requested
    if args.show_sample:
        print("Showing sample format of SignupGenius export...")
        SignupGeniusParser.print_sample_format(args.signupgenius)
        return

    try:
        # Load data
        print("Loading volunteer requirements...")
        volunteers = VolunteerParser.parse_csv(args.volunteers)
        print(f"  Loaded {len(volunteers)} volunteers")

        print("Loading shift requirements...")
        shift_requirements = ShiftRequirementParser.parse_json(args.shifts)
        print(f"  Loaded {len(shift_requirements)} shifts")

        print("Parsing SignupGenius export...")
        signups = SignupGeniusParser.parse_csv(args.signupgenius)
        print(f"  Loaded {len(signups)} signups")

        # Generate report
        print("\nGenerating compliance report...")
        reporter = ComplianceReporter(volunteers, shift_requirements, signups)
        report = reporter.generate_full_report()

        # Output report
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\nReport saved to: {args.output}")
        else:
            print("\n" + report)

        # Export non-compliant volunteers if requested
        if args.export_noncompliant:
            reporter.export_non_compliant_csv(args.export_noncompliant)

        # Exit with error code if there are issues
        non_compliant = reporter.get_non_compliant_volunteers()
        uncovered = reporter.get_uncovered_shifts()

        if non_compliant or uncovered:
            print("\n⚠️  Issues found:")
            if non_compliant:
                print(f"  - {len(non_compliant)} volunteers haven't met requirements")
            if uncovered:
                print(f"  - {len(uncovered)} shifts need more coverage")
            sys.exit(1)
        else:
            print("\n✓ All requirements met!")
            sys.exit(0)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
