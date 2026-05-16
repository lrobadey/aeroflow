"""Procedural BTV flight-schedule generator.

Encodes carrier-route patterns (frequency, time clusters, aircraft) and samples
a believable but novel day each call. Deterministic given seed.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

from .flight import Flight, FlightStatus


# 0=spring, 1=summer, 2=fall, 3=winter
def season_index(d: date) -> int:
    m = d.month
    if m in (3, 4, 5):
        return 0
    if m in (6, 7, 8):
        return 1
    if m in (9, 10, 11):
        return 2
    return 3


SEASON_NAMES = ("spring", "summer", "fall", "winter")


@dataclass
class TimeCluster:
    """A peak departure window for a route. Hour of day + std-dev in minutes."""

    hour: float
    std_minutes: float = 25.0


@dataclass
class CarrierRoute:
    """A repeating BTV carrier route. Frequency varies by season."""

    carrier: str
    destination: str
    aircraft: str
    capacity: int
    typical_load_factor: float
    daily_freq_by_season: tuple[int, int, int, int]  # spring, summer, fall, winter
    departure_clusters: list[TimeCluster] = field(default_factory=list)


def _sample_departure_time(d: date, cluster: TimeCluster, rng: random.Random) -> datetime:
    """Sample a departure time around the given cluster."""
    minute_of_day = cluster.hour * 60.0 + rng.gauss(0, cluster.std_minutes)
    minute_of_day = max(5 * 60, min(23 * 60 + 50, minute_of_day))  # clamp 5:00–23:50
    h, m = divmod(int(round(minute_of_day)), 60)
    return datetime.combine(d, time(hour=h, minute=m))


def _assign_gate(carrier: str, gate_pool: list[str], used: dict[str, list[datetime]],
                 departure: datetime, rng: random.Random) -> str:
    """Pick a gate that's not occupied within +/- 45 min of this departure."""
    candidates = list(gate_pool)
    rng.shuffle(candidates)
    for gate in candidates:
        clashes = used.get(gate, [])
        if all(abs((c - departure).total_seconds()) > 45 * 60 for c in clashes):
            used.setdefault(gate, []).append(departure)
            return gate
    # Fallback: cram onto a random gate.
    gate = candidates[0]
    used.setdefault(gate, []).append(departure)
    return gate


def generate_day_schedule(
    routes: list[CarrierRoute],
    gates: list[str],
    day: date,
    seed: int | None = None,
) -> list[Flight]:
    """Generate a full day of departures for BTV."""
    rng = random.Random(seed if seed is not None else day.toordinal())
    season = season_index(day)
    used_gates: dict[str, list[datetime]] = {}
    flights: list[Flight] = []

    for route in routes:
        n = route.daily_freq_by_season[season]
        if n == 0 or not route.departure_clusters:
            continue
        # Distribute n flights across clusters (round-robin with some jitter).
        for i in range(n):
            cluster = route.departure_clusters[i % len(route.departure_clusters)]
            dep = _sample_departure_time(day, cluster, rng)
            gate = _assign_gate(route.carrier, gates, used_gates, dep, rng)
            flight_number = str(rng.randint(100, 4999))
            flight = Flight(
                id=f"{route.carrier}{flight_number}-{day.isoformat()}-{i}",
                carrier=route.carrier,
                flight_number=flight_number,
                destination=route.destination,
                scheduled_departure=dep,
                gate=gate,
                aircraft_type=route.aircraft,
                capacity=route.capacity,
                load_factor=max(0.4, min(0.99, rng.gauss(route.typical_load_factor, 0.08))),
                status=FlightStatus.SCHEDULED,
            )
            # Winter weather: small chance of a 20-90 min delay.
            if season == 3 and rng.random() < 0.10:
                flight.delay_minutes = rng.randint(20, 90)
                flight.status = FlightStatus.DELAYED
            flights.append(flight)

    flights.sort(key=lambda f: f.scheduled_departure)
    return flights
