"""Zone model. Zones are the airport's stages — entrance, check-in, security, concourse, gate seating, jetway."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Iterable

from .passenger import Passenger, PassengerState


class ZoneType(str, Enum):
    ENTRANCE = "ENTRANCE"
    CHECK_IN = "CHECK_IN"
    SECURITY = "SECURITY"
    CONCOURSE = "CONCOURSE"
    GATE_SEATING = "GATE_SEATING"
    JETWAY = "JETWAY"


@dataclass
class ZoneRect:
    """Screen-space rectangle for the renderer. Sim does not use this."""

    x: int
    y: int
    width: int
    height: int


@dataclass
class Zone:
    """A stage. Has a queue, an in-service set, and a service rate."""

    id: str
    type: ZoneType
    label: str
    rect: ZoneRect
    service_rate_per_min: float = 30.0  # passengers per minute completing service
    service_seconds_min: float = 30.0  # minimum dwell time when "in service"
    capacity: int = 60  # soft cap for visual cramming; not enforced strictly
    # Filtering for which passengers this zone accepts (e.g. per-airline check-in)
    accepts_carrier: str | None = None
    accepts_gate: str | None = None

    # Runtime state
    queue: deque[Passenger] = field(default_factory=deque)
    in_service: dict[str, tuple[Passenger, datetime]] = field(default_factory=dict)
    # Passengers who finished and are awaiting transition by the World
    completed: list[Passenger] = field(default_factory=list)

    @property
    def total_occupancy(self) -> int:
        return len(self.queue) + len(self.in_service)

    def accepts(self, passenger: Passenger, flight_carrier: str | None, flight_gate: str | None) -> bool:
        if self.accepts_carrier and self.accepts_carrier != flight_carrier:
            return False
        if self.accepts_gate and self.accepts_gate != flight_gate:
            return False
        return True

    def enqueue(self, passenger: Passenger, now: datetime) -> None:
        passenger.current_zone_id = self.id
        passenger.enqueued_at = now
        if self.type in (ZoneType.CONCOURSE, ZoneType.GATE_SEATING, ZoneType.ENTRANCE):
            # No real queue — passengers sit/linger here. Put them straight into "in service".
            passenger.state = self._zone_state()
            self.in_service[passenger.id] = (passenger, now)
        else:
            passenger.state = PassengerState.IN_QUEUE
            self.queue.append(passenger)

    def _zone_state(self) -> PassengerState:
        return {
            ZoneType.ENTRANCE: PassengerState.ARRIVING,
            ZoneType.CHECK_IN: PassengerState.IN_SERVICE,
            ZoneType.SECURITY: PassengerState.IN_SERVICE,
            ZoneType.CONCOURSE: PassengerState.IN_CONCOURSE,
            ZoneType.GATE_SEATING: PassengerState.AT_GATE,
            ZoneType.JETWAY: PassengerState.BOARDING,
        }[self.type]

    def tick(self, now: datetime, dt_sim_seconds: float) -> list[Passenger]:
        """Advance queue → service → completed. Returns passengers ready to transition."""
        # Step 1: pull from queue into service, capped by service_rate.
        # service_rate_per_min passengers complete per minute, so available slots
        # over this tick = rate * (dt/60).
        if self.queue:
            slots = max(1, int(self.service_rate_per_min * dt_sim_seconds / 60.0))
            for _ in range(slots):
                if not self.queue:
                    break
                pax = self.queue.popleft()
                pax.state = PassengerState.IN_SERVICE
                self.in_service[pax.id] = (pax, now)

        # Step 2: check service completion for queueing zones.
        # For lingering zones (CONCOURSE, GATE_SEATING, ENTRANCE), completion is
        # driven by the World based on flight timing — we don't auto-pop them here.
        completed_now: list[Passenger] = []
        if self.type in (ZoneType.CHECK_IN, ZoneType.SECURITY, ZoneType.JETWAY):
            min_dwell = timedelta(seconds=self.service_seconds_min)
            done_ids = [
                pid for pid, (_, started) in self.in_service.items()
                if now - started >= min_dwell
            ]
            for pid in done_ids:
                pax, _ = self.in_service.pop(pid)
                completed_now.append(pax)
        # Stash on self.completed so the World can pick them up in its post-tick passes.
        self.completed.extend(completed_now)
        return completed_now

    def remove(self, passenger: Passenger) -> bool:
        """Force-remove a passenger (e.g. World pulls them from concourse to gate)."""
        if passenger.id in self.in_service:
            self.in_service.pop(passenger.id)
            return True
        try:
            self.queue.remove(passenger)
            return True
        except ValueError:
            return False

    def occupants(self) -> Iterable[Passenger]:
        for pax, _ in self.in_service.values():
            yield pax
        for pax in self.queue:
            yield pax
