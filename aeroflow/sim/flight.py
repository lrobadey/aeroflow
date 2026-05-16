"""Flight + Carrier data structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum


class FlightStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    DEPARTED = "DEPARTED"
    DELAYED = "DELAYED"


@dataclass
class Flight:
    id: str
    carrier: str  # e.g. "B6"
    flight_number: str  # e.g. "442"
    destination: str  # IATA, e.g. "BOS"
    scheduled_departure: datetime
    gate: str  # e.g. "G3"
    aircraft_type: str  # e.g. "E190"
    capacity: int
    load_factor: float = 0.82
    status: FlightStatus = FlightStatus.SCHEDULED
    delay_minutes: int = 0

    @property
    def actual_departure(self) -> datetime:
        return self.scheduled_departure + timedelta(minutes=self.delay_minutes)

    @property
    def display_code(self) -> str:
        return f"{self.carrier}{self.flight_number}"

    @property
    def expected_passenger_count(self) -> int:
        return max(1, int(round(self.capacity * self.load_factor)))

    def boarding_starts_at(self) -> datetime:
        """Boarding begins ~30 minutes before scheduled departure."""
        return self.actual_departure - timedelta(minutes=30)
