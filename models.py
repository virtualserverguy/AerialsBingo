"""
Data models for bingo shift scheduling system.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional


class Role(Enum):
    """Available roles for bingo shifts."""
    CALLER = "Caller"
    MANAGER = "Manager"
    ASSISTANT_MANAGER = "Assistant Manager"
    WORKER = "Worker"

    @classmethod
    def from_string(cls, role_str: str) -> Optional['Role']:
        """Convert string to Role enum, case-insensitive."""
        role_str = role_str.strip()
        for role in cls:
            if role.value.lower() == role_str.lower():
                return role
        return None


@dataclass
class Volunteer:
    """Represents a volunteer with their requirements and qualifications."""
    name: str
    email: str
    required_shifts: int  # 1, 2, or 3
    qualified_roles: List[Role] = field(default_factory=list)  # Roles they can fill
    notes: str = ""

    def __hash__(self):
        return hash(self.email.lower())

    def __eq__(self, other):
        if isinstance(other, Volunteer):
            return self.email.lower() == other.email.lower()
        return False

    def can_fill_role(self, role: Role) -> bool:
        """Check if volunteer is qualified for a specific role."""
        return role in self.qualified_roles


@dataclass
class ShiftRequirement:
    """Defines what roles and quantities are needed for a shift."""
    date: datetime
    time: str
    role_requirements: Dict[Role, int]  # Role -> quantity needed
    location: str = "Main Hall"

    def total_slots(self) -> int:
        """Total number of volunteers needed for this shift."""
        return sum(self.role_requirements.values())

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} {self.time}"


@dataclass
class Signup:
    """Represents a volunteer signing up for a shift in a specific role."""
    volunteer_email: str
    volunteer_name: str
    shift_date: datetime
    shift_time: str
    role: Role
    signup_timestamp: Optional[datetime] = None

    def matches_shift(self, shift_req: ShiftRequirement) -> bool:
        """Check if this signup matches a shift requirement."""
        return (self.shift_date.date() == shift_req.date.date() and
                self.shift_time == shift_req.time)


@dataclass
class VolunteerCompliance:
    """Tracks a volunteer's compliance with shift requirements."""
    volunteer: Volunteer
    signups: List[Signup] = field(default_factory=list)

    def shifts_signed_up(self) -> int:
        """Number of shifts this volunteer has signed up for."""
        return len(self.signups)

    def is_compliant(self) -> bool:
        """Check if volunteer has met their shift requirement."""
        return self.shifts_signed_up() >= self.volunteer.required_shifts

    def shortfall(self) -> int:
        """How many more shifts are needed to meet requirement."""
        return max(0, self.volunteer.required_shifts - self.shifts_signed_up())


@dataclass
class ShiftCoverage:
    """Tracks coverage status for a specific shift."""
    shift_requirement: ShiftRequirement
    signups_by_role: Dict[Role, List[Signup]] = field(default_factory=dict)

    def get_filled_count(self, role: Role) -> int:
        """Number of volunteers signed up for this role."""
        return len(self.signups_by_role.get(role, []))

    def get_needed_count(self, role: Role) -> int:
        """Number of volunteers still needed for this role."""
        required = self.shift_requirement.role_requirements.get(role, 0)
        filled = self.get_filled_count(role)
        return max(0, required - filled)

    def is_fully_covered(self) -> bool:
        """Check if all roles are filled for this shift."""
        for role, required_count in self.shift_requirement.role_requirements.items():
            if self.get_filled_count(role) < required_count:
                return False
        return True

    def get_gaps(self) -> Dict[Role, int]:
        """Get unfilled positions by role."""
        gaps = {}
        for role, required_count in self.shift_requirement.role_requirements.items():
            gap = self.get_needed_count(role)
            if gap > 0:
                gaps[role] = gap
        return gaps
