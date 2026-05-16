"""Tests for zone queue dynamics: enqueue, drain, completion, removal."""

from datetime import datetime, timedelta

from aeroflow.sim.passenger import (
    Mood,
    Passenger,
    PassengerAttributes,
    PassengerState,
    TravelerType,
)
from aeroflow.sim.zone import Zone, ZoneRect, ZoneType


def _make_pax(idx: int) -> Passenger:
    return Passenger(
        id=f"p{idx}",
        name=f"Pax {idx}",
        age=30,
        traveler_type=TravelerType.BUSINESS,
        party_size=1,
        story="Test passenger.",
        attributes=PassengerAttributes(),
        assigned_flight_id="F0",
        arrival_time=datetime(2026, 1, 12, 5, 0),
    )


def _security_zone() -> Zone:
    return Zone(
        id="SEC",
        type=ZoneType.SECURITY,
        label="Security",
        rect=ZoneRect(0, 0, 100, 100),
        service_rate_per_min=12.0,
        service_seconds_min=60.0,
    )


def test_enqueue_puts_passenger_in_queue_for_security():
    z = _security_zone()
    p = _make_pax(1)
    now = datetime(2026, 1, 12, 5, 0)
    z.enqueue(p, now)
    assert p.state == PassengerState.IN_QUEUE
    assert p in z.queue


def test_queue_drains_at_service_rate():
    z = _security_zone()  # 12/min
    now = datetime(2026, 1, 12, 5, 0)
    for i in range(20):
        z.enqueue(_make_pax(i), now)
    # 60 sim seconds → 12 should pull into service.
    z.tick(now, 60.0)
    assert len(z.in_service) == 12
    assert len(z.queue) == 8


def test_completed_after_service_seconds_min():
    z = _security_zone()
    now = datetime(2026, 1, 12, 5, 0)
    z.enqueue(_make_pax(1), now)
    # First tick pulls into service immediately.
    z.tick(now, 1.0)
    assert len(z.in_service) == 1
    # Tick again 30 sim seconds later — not yet complete (min 60s).
    completed = z.tick(now + timedelta(seconds=30), 30.0)
    assert completed == []
    # Tick at 65 seconds — complete.
    completed = z.tick(now + timedelta(seconds=65), 35.0)
    assert len(completed) == 1


def test_concourse_does_not_auto_complete():
    z = Zone(
        id="C", type=ZoneType.CONCOURSE, label="Concourse",
        rect=ZoneRect(0, 0, 100, 100),
    )
    now = datetime(2026, 1, 12, 5, 0)
    z.enqueue(_make_pax(1), now)
    completed = z.tick(now + timedelta(minutes=30), 1800.0)
    assert completed == []
    assert len(z.in_service) == 1


def test_remove_pulls_from_in_service():
    z = Zone(
        id="C", type=ZoneType.CONCOURSE, label="Concourse",
        rect=ZoneRect(0, 0, 100, 100),
    )
    p = _make_pax(1)
    z.enqueue(p, datetime(2026, 1, 12, 5, 0))
    assert z.remove(p) is True
    assert p.id not in z.in_service


def test_carrier_filter_on_check_in():
    z = Zone(
        id="CHK", type=ZoneType.CHECK_IN, label="DL Check-in",
        rect=ZoneRect(0, 0, 100, 100),
        accepts_carrier="DL",
    )
    p = _make_pax(1)
    assert z.accepts(p, flight_carrier="DL", flight_gate="G3") is True
    assert z.accepts(p, flight_carrier="B6", flight_gate="G3") is False
