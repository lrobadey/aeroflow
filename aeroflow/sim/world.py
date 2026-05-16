"""World: holds the sim state and ticks it forward."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from .clock import SimClock
from .flight import Flight, FlightStatus
from .passenger import Mood, Passenger, PassengerState, RegularDefinition
from .schedule import generate_day_schedule, CarrierRoute
from .population import generate_passengers_for_flight
from .seeding import stable_u32
from .zone import Zone, ZoneType


@dataclass
class WorldEvent:
    """A noteworthy thing that happened. Used by recap."""

    timestamp: datetime
    kind: str  # e.g. "FLIGHT_DELAYED", "REGULAR_MOOD_CHANGED", "BUSY_SECURITY"
    text: str
    passenger_id: str | None = None
    flight_id: str | None = None


@dataclass
class World:
    clock: SimClock
    zones: dict[str, Zone]
    routes: list[CarrierRoute]
    gates: list[str]
    regulars: list[RegularDefinition]
    name_pool: object  # NamePool

    flights: list[Flight] = field(default_factory=list)
    flights_by_id: dict[str, Flight] = field(default_factory=dict)
    passengers: dict[str, Passenger] = field(default_factory=dict)
    pending_arrivals: list[Passenger] = field(default_factory=list)  # sorted by arrival_time desc (pop from end)
    events: list[WorldEvent] = field(default_factory=list)
    seed: int = 0
    _last_security_busy_emit: datetime | None = None
    _peak_security_queue: int = 0
    _peak_security_at: datetime | None = None
    _passengers_served_today: int = 0
    _on_time_count: int = 0
    _delayed_count: int = 0

    def begin_day(self) -> None:
        """Generate today's flight schedule + passengers, queue them up."""
        d = self.clock.current_time.date()
        rng_seed = stable_u32(self.seed, d.isoformat())
        self.flights = generate_day_schedule(self.routes, self.gates, d, seed=rng_seed)
        self.flights_by_id = {f.id: f for f in self.flights}

        all_pax: list[Passenger] = []
        for f in self.flights:
            pax_list = generate_passengers_for_flight(
                f, self.regulars, self.name_pool, seed=stable_u32(rng_seed, f.id)
            )
            all_pax.extend(pax_list)

        # Drop any pax who would have arrived before the day began (shouldn't happen, but safe).
        day_start = datetime.combine(d, self.clock.current_time.time())
        all_pax = [p for p in all_pax if p.arrival_time >= day_start - timedelta(hours=2)]

        # Sort by arrival_time DESCENDING so we can pop from end as time advances.
        all_pax.sort(key=lambda p: p.arrival_time, reverse=True)
        self.pending_arrivals = all_pax

        # Reset day-level counters.
        self._passengers_served_today = 0
        self._on_time_count = 0
        self._delayed_count = 0
        self._peak_security_queue = 0
        self._peak_security_at = None
        for f in self.flights:
            if f.status == FlightStatus.DELAYED:
                self._delayed_count += 1
                self.events.append(WorldEvent(
                    timestamp=self.clock.current_time,
                    kind="FLIGHT_DELAYED",
                    text=f"{f.display_code} → {f.destination} delayed {f.delay_minutes} min (departs {f.actual_departure.strftime('%H:%M')}).",
                    flight_id=f.id,
                ))

    # ------------------------------------------------------------------
    # Per-tick logic
    # ------------------------------------------------------------------
    def tick(self, dt_real_seconds: float) -> None:
        if self.clock.speed == 0:
            return
        before = self.clock.current_time
        self.clock.tick(dt_real_seconds)
        now = self.clock.current_time
        dt_sim = (now - before).total_seconds()
        if dt_sim <= 0:
            return

        self._spawn_arrivals(now)
        self._tick_zones(now, dt_sim)
        self._move_after_checkin(now)
        self._move_after_security(now)
        self._board_flights(now)
        self._depart_flights(now)
        self._sample_metrics(now)

    # ------------------------------------------------------------------
    def _spawn_arrivals(self, now: datetime) -> None:
        """Place any passengers whose arrival_time has passed at the entrance."""
        entrance = self._zone_for_type(ZoneType.ENTRANCE)
        while self.pending_arrivals and self.pending_arrivals[-1].arrival_time <= now:
            pax = self.pending_arrivals.pop()
            self.passengers[pax.id] = pax
            entrance.enqueue(pax, now)

    def _zone_for_type(self, ztype: ZoneType) -> Zone:
        for z in self.zones.values():
            if z.type == ztype:
                return z
        raise KeyError(f"No zone of type {ztype}")

    def _checkin_zone_for_carrier(self, carrier: str) -> Zone:
        for z in self.zones.values():
            if z.type == ZoneType.CHECK_IN and z.accepts_carrier == carrier:
                return z
        # Fallback: any check-in.
        for z in self.zones.values():
            if z.type == ZoneType.CHECK_IN:
                return z
        raise KeyError("No CHECK_IN zone")

    def _gate_zone(self, gate: str) -> Zone | None:
        for z in self.zones.values():
            if z.type == ZoneType.GATE_SEATING and z.accepts_gate == gate:
                return z
        return None

    def _tick_zones(self, now: datetime, dt_sim: float) -> None:
        # Move people out of ENTRANCE → check-in shortly after they arrive.
        entrance = self._zone_for_type(ZoneType.ENTRANCE)
        moved_out = []
        for pax in list(entrance.in_service.values()):
            p, started = pax
            # Spend ~3 sim minutes wandering in.
            if (now - started).total_seconds() >= 180:
                moved_out.append(p)
        for p in moved_out:
            entrance.remove(p)
            flight = self.flights_by_id.get(p.assigned_flight_id)
            carrier = flight.carrier if flight else "B6"
            checkin = self._checkin_zone_for_carrier(carrier)
            checkin.enqueue(p, now)

        # Tick every zone (drains queues into service, completes services).
        for z in self.zones.values():
            z.tick(now, dt_sim)

    def _move_after_checkin(self, now: datetime) -> None:
        """Anyone completed at check-in goes to security."""
        security = self._zone_for_type(ZoneType.SECURITY)
        for z in self.zones.values():
            if z.type != ZoneType.CHECK_IN:
                continue
            for pax in z.completed:
                security.enqueue(pax, now)
            z.completed.clear()

    def _move_after_security(self, now: datetime) -> None:
        """After security, passenger goes to concourse OR straight to their gate seating
        depending on how close to boarding they are."""
        concourse = self._zone_for_type(ZoneType.CONCOURSE)
        security = self._zone_for_type(ZoneType.SECURITY)
        for pax in security.completed:
            flight = self.flights_by_id.get(pax.assigned_flight_id)
            if flight is None:
                continue
            time_to_dep = (flight.actual_departure - now).total_seconds() / 60.0
            target_zone: Zone
            gate_zone = self._gate_zone(flight.gate)
            if gate_zone is None:
                target_zone = concourse
            elif time_to_dep <= 35:
                target_zone = gate_zone
            else:
                target_zone = concourse
            target_zone.enqueue(pax, now)
        security.completed.clear()

    def _board_flights(self, now: datetime) -> None:
        """When boarding starts, sweep concourse + gate-seating into the jetway."""
        for f in self.flights:
            if f.status not in (FlightStatus.SCHEDULED, FlightStatus.DELAYED):
                continue
            if now < f.boarding_starts_at():
                continue
            if now >= f.actual_departure:
                continue
            f.status = FlightStatus.BOARDING
            jetway = self._jetway_for_gate(f.gate)
            if jetway is None:
                continue
            # Pull passengers for this flight from concourse + gate seating.
            for z in list(self.zones.values()):
                if z.type not in (ZoneType.CONCOURSE, ZoneType.GATE_SEATING):
                    continue
                pax_to_move = [p for p in z.occupants() if p.assigned_flight_id == f.id]
                for p in pax_to_move:
                    z.remove(p)
                    jetway.enqueue(p, now)

    def _jetway_for_gate(self, gate: str) -> Zone | None:
        for z in self.zones.values():
            if z.type == ZoneType.JETWAY and z.accepts_gate == gate:
                return z
        # Fallback: any jetway.
        for z in self.zones.values():
            if z.type == ZoneType.JETWAY:
                return z
        return None

    def _depart_flights(self, now: datetime) -> None:
        for f in self.flights:
            if f.status == FlightStatus.DEPARTED:
                continue
            if now < f.actual_departure:
                continue
            # Sweep ALL zones for any pax on this flight — at high sim speeds the
            # entrance / check-in / security stages may not have fully drained yet,
            # but anyone with the right flight_id "made it on" at compression time.
            served = 0
            for zone in list(self.zones.values()):
                pax_for_flight = [
                    p for p in list(zone.occupants()) + zone.completed
                    if p.assigned_flight_id == f.id
                ]
                for p in pax_for_flight:
                    zone.remove(p)
                    p.state = PassengerState.DEPARTED
                    p.current_zone_id = None
                    self.passengers.pop(p.id, None)
                    served += 1
                    if p.is_regular and f.delay_minutes >= 30 and p.attributes.mood != Mood.SOUR:
                        p.attributes.mood = Mood.SOUR
                        self.events.append(WorldEvent(
                            timestamp=now,
                            kind="REGULAR_MOOD_CHANGED",
                            text=f"{p.name}'s mood dropped to SOUR after the {f.display_code} delay.",
                            passenger_id=p.id,
                            flight_id=f.id,
                        ))
            self._passengers_served_today += served
            if f.delay_minutes == 0:
                self._on_time_count += served
            f.status = FlightStatus.DEPARTED

    def _sample_metrics(self, now: datetime) -> None:
        sec = self._zone_for_type(ZoneType.SECURITY)
        q = len(sec.queue)
        if q > self._peak_security_queue:
            self._peak_security_queue = q
            self._peak_security_at = now
        if q >= 25 and (
            self._last_security_busy_emit is None
            or (now - self._last_security_busy_emit).total_seconds() >= 30 * 60
        ):
            self.events.append(WorldEvent(
                timestamp=now,
                kind="BUSY_SECURITY",
                text=f"Security queue hit {q} at {now.strftime('%H:%M')}.",
            ))
            self._last_security_busy_emit = now

    # ------------------------------------------------------------------
    # Snapshot accessors used by the renderer
    # ------------------------------------------------------------------
    @property
    def total_in_terminal(self) -> int:
        return len(self.passengers)

    def upcoming_flights(self, within_minutes: int = 60) -> list[Flight]:
        now = self.clock.current_time
        horizon = now + timedelta(minutes=within_minutes)
        return [f for f in self.flights
                if f.status in (FlightStatus.SCHEDULED, FlightStatus.DELAYED, FlightStatus.BOARDING)
                and now <= f.actual_departure <= horizon]
