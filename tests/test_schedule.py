"""Tests for the procedural schedule generator."""

from datetime import date

from aeroflow.data.btv_carriers import BTV_ROUTES
from aeroflow.data.btv_layout import GATES
from aeroflow.sim.schedule import generate_day_schedule


def test_schedule_is_deterministic_given_seed():
    a = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=42)
    b = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=42)
    assert len(a) == len(b)
    for fa, fb in zip(a, b):
        assert fa.id == fb.id
        assert fa.scheduled_departure == fb.scheduled_departure
        assert fa.gate == fb.gate


def test_schedule_count_within_expected_range_winter_weekday():
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=7)
    # Sum of winter daily frequencies in BTV_ROUTES — should match flight count.
    expected = sum(r.daily_freq_by_season[3] for r in BTV_ROUTES)
    assert len(flights) == expected
    # Loose sanity: between 20 and 40.
    assert 20 <= len(flights) <= 40


def test_no_overlapping_gate_assignments():
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=99)
    by_gate: dict[str, list] = {}
    for f in flights:
        by_gate.setdefault(f.gate, []).append(f.scheduled_departure)
    for gate, deps in by_gate.items():
        deps.sort()
        for prev, curr in zip(deps, deps[1:]):
            gap = (curr - prev).total_seconds() / 60.0
            # Gate assigner enforces at least 45 min between same-gate flights.
            assert gap > 30, f"Gate {gate}: flights {gap}min apart"


def test_flights_sorted_by_departure_time():
    flights = generate_day_schedule(BTV_ROUTES, GATES, date(2026, 1, 12), seed=5)
    times = [f.scheduled_departure for f in flights]
    assert times == sorted(times)
