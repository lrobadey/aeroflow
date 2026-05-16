"""End-of-day recap builder."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime

from .world import World, WorldEvent


@dataclass
class DayRecap:
    day: int
    date_str: str
    passengers_served: int
    on_time_pct: float
    delayed_flights: int
    total_flights: int
    busiest_hour: tuple[int, int] | None  # (hour, count)
    peak_security_queue: int
    peak_security_at: str | None
    moments: list[str] = field(default_factory=list)


def build_day_recap(world: World, ending_day: int) -> DayRecap:
    total_flights = len(world.flights)
    on_time = world._on_time_count
    served = world._passengers_served_today
    on_time_pct = (on_time / served * 100.0) if served else 0.0

    # Busiest hour by flight departures.
    if world.flights:
        hour_counts = Counter(f.actual_departure.hour for f in world.flights)
        busiest_hour = max(hour_counts.items(), key=lambda kv: kv[1])
    else:
        busiest_hour = None

    # Moments: prefer regular-related and busy-security events from today.
    today_date = world.clock.current_time.date()
    todays_events: list[WorldEvent] = [
        e for e in world.events if e.timestamp.date() in (today_date, _previous_day(today_date))
    ]
    # Rank: regular events first, then delays, then busy-security.
    rank = {"REGULAR_MOOD_CHANGED": 0, "FLIGHT_DELAYED": 1, "BUSY_SECURITY": 2}
    todays_events.sort(key=lambda e: rank.get(e.kind, 9))
    moments = [f"[{e.timestamp.strftime('%H:%M')}] {e.text}" for e in todays_events[:5]]

    return DayRecap(
        day=ending_day,
        date_str=world.clock.current_time.date().isoformat(),
        passengers_served=served,
        on_time_pct=on_time_pct,
        delayed_flights=world._delayed_count,
        total_flights=total_flights,
        busiest_hour=busiest_hour,
        peak_security_queue=world._peak_security_queue,
        peak_security_at=(
            world._peak_security_at.strftime('%H:%M')
            if world._peak_security_at else None
        ),
        moments=moments,
    )


def _previous_day(d):
    from datetime import timedelta
    return d - timedelta(days=1)
