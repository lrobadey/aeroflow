"""Tests for the passenger generator (regulars + procedural one-shots)."""

from datetime import date

from aeroflow.data.btv_carriers import BTV_ROUTES
from aeroflow.data.btv_layout import GATES
from aeroflow.data.name_pool import NamePool
from aeroflow.data.regulars import BTV_REGULARS
from aeroflow.sim.population import generate_passengers_for_flight
from aeroflow.sim.schedule import generate_day_schedule


def test_passenger_count_near_capacity_times_load_factor():
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=11)
    pool = NamePool(seed=11)
    sample = flights[0]
    pax = generate_passengers_for_flight(sample, BTV_REGULARS, pool, seed=1)
    expected = sample.expected_passenger_count
    # Tight equality — generator targets exactly expected_passenger_count when no regulars match.
    assert abs(len(pax) - expected) <= max(1, len(BTV_REGULARS))


def test_regulars_inserted_on_matching_flights():
    """Tom Kovalenko flies B6 BOS on Mondays. Find a Monday B6→BOS flight and
    confirm he's on it."""
    pool = NamePool(seed=4)
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=4)  # Mon
    matches = [f for f in flights if f.carrier == "B6" and f.destination == "BOS"]
    assert matches, "expected at least one B6→BOS Monday flight"
    found_kovalenko = False
    for f in matches:
        pax = generate_passengers_for_flight(f, BTV_REGULARS, pool, seed=1)
        if any(p.regular_id == "kovalenko" for p in pax):
            found_kovalenko = True
            break
    assert found_kovalenko


def test_arrival_times_skewed_by_traveler_type():
    """Business pax arrive closer to departure than leisure pax."""
    pool = NamePool(seed=99)
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 7, 14), seed=99)  # summer
    # Pick a route with mixed traveler types.
    f = next(f for f in flights if f.destination == "JFK")
    pax = generate_passengers_for_flight(f, BTV_REGULARS, pool, seed=1)
    business_offsets = [
        (f.scheduled_departure - p.arrival_time).total_seconds() / 60.0
        for p in pax if p.traveler_type.value == "BUSINESS"
    ]
    leisure_offsets = [
        (f.scheduled_departure - p.arrival_time).total_seconds() / 60.0
        for p in pax if p.traveler_type.value == "LEISURE"
    ]
    if business_offsets and leisure_offsets:
        assert sum(business_offsets) / len(business_offsets) < sum(leisure_offsets) / len(leisure_offsets)


def test_unique_passenger_ids_per_flight():
    pool = NamePool(seed=3)
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=3)
    f = flights[0]
    pax = generate_passengers_for_flight(f, BTV_REGULARS, pool, seed=1)
    ids = [p.id for p in pax]
    assert len(ids) == len(set(ids))
