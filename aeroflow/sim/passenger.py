"""Passenger model: state, attributes, persistent regulars."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class TravelerType(str, Enum):
    BUSINESS = "BUSINESS"
    LEISURE = "LEISURE"
    CONNECTING = "CONNECTING"
    VFR = "VFR"  # visiting friends/relatives


class PassengerState(str, Enum):
    ARRIVING = "ARRIVING"
    IN_QUEUE = "IN_QUEUE"
    IN_SERVICE = "IN_SERVICE"
    IN_CONCOURSE = "IN_CONCOURSE"
    AT_GATE = "AT_GATE"
    BOARDING = "BOARDING"
    DEPARTED = "DEPARTED"


class Mood(str, Enum):
    HAPPY = "HAPPY"
    NEUTRAL = "NEUTRAL"
    ANXIOUS = "ANXIOUS"
    SOUR = "SOUR"


class FrequentFlyer(str, Enum):
    NONE = "NONE"
    BASIC = "BASIC"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


@dataclass
class PassengerAttributes:
    """Behavioral hidden state. Influences zone dwell times and recap moments."""

    patience: int = 50  # 0..100; lower = leaves queues / gets sour faster
    mood: Mood = Mood.NEUTRAL
    ff_status: FrequentFlyer = FrequentFlyer.NONE
    price_sensitivity: int = 50  # 0..100; high = won't buy concourse food
    dietary: str = ""  # free-text label; matters for retail later


@dataclass
class Passenger:
    """A single passenger in (or about to be in) the terminal."""

    id: str
    name: str
    age: int
    traveler_type: TravelerType
    party_size: int
    story: str  # one-sentence
    attributes: PassengerAttributes
    assigned_flight_id: str
    arrival_time: datetime  # when they show up at ENTRANCE
    current_zone_id: str | None = None
    state: PassengerState = PassengerState.ARRIVING
    regular_id: str | None = None  # None for procedural one-shots
    enqueued_at: datetime | None = None  # to compute wait times for recap

    @property
    def is_regular(self) -> bool:
        return self.regular_id is not None


@dataclass
class RegularDefinition:
    """Static definition of a named regular. Lives in data/regulars.py."""

    id: str
    name: str
    age: int
    home: str
    occupation: str
    traveler_type: TravelerType
    attributes: PassengerAttributes
    story_hook: str
    panel_tag: str
    # Recurring schedule expressed as a list of (weekday, carrier, destination) tuples.
    # weekday: 0=Mon..6=Sun. Matched at flight-assignment time.
    schedule: list[tuple[int, str, str]] = field(default_factory=list)

    def matches_flight(self, weekday: int, carrier: str, destination: str) -> bool:
        return any(
            wd == weekday and c == carrier and d == destination
            for (wd, c, d) in self.schedule
        )
