"""Passenger generator: produces a list of Passengers for each flight."""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from .flight import Flight
from .passenger import (
    FrequentFlyer,
    Mood,
    Passenger,
    PassengerAttributes,
    RegularDefinition,
    TravelerType,
)


# Per-route weights for traveler type. Falls back to a default if route missing.
TRAVELER_TYPE_WEIGHTS_BY_DESTINATION: dict[str, dict[TravelerType, float]] = {
    "BOS": {TravelerType.BUSINESS: 0.55, TravelerType.LEISURE: 0.25,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.05},
    "JFK": {TravelerType.BUSINESS: 0.35, TravelerType.LEISURE: 0.35,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.15},
    "LGA": {TravelerType.BUSINESS: 0.55, TravelerType.LEISURE: 0.20,
            TravelerType.VFR: 0.20, TravelerType.CONNECTING: 0.05},
    "EWR": {TravelerType.BUSINESS: 0.30, TravelerType.LEISURE: 0.25,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.30},
    "DCA": {TravelerType.BUSINESS: 0.55, TravelerType.LEISURE: 0.15,
            TravelerType.VFR: 0.25, TravelerType.CONNECTING: 0.05},
    "CLT": {TravelerType.BUSINESS: 0.20, TravelerType.LEISURE: 0.25,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.40},
    "PHL": {TravelerType.BUSINESS: 0.25, TravelerType.LEISURE: 0.25,
            TravelerType.VFR: 0.20, TravelerType.CONNECTING: 0.30},
    "DTW": {TravelerType.BUSINESS: 0.25, TravelerType.LEISURE: 0.25,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.35},
    "ATL": {TravelerType.BUSINESS: 0.25, TravelerType.LEISURE: 0.30,
            TravelerType.VFR: 0.10, TravelerType.CONNECTING: 0.35},
    "ORD": {TravelerType.BUSINESS: 0.30, TravelerType.LEISURE: 0.25,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.30},
    "IAD": {TravelerType.BUSINESS: 0.30, TravelerType.LEISURE: 0.20,
            TravelerType.VFR: 0.15, TravelerType.CONNECTING: 0.35},
    "FLL": {TravelerType.BUSINESS: 0.05, TravelerType.LEISURE: 0.70,
            TravelerType.VFR: 0.20, TravelerType.CONNECTING: 0.05},
    "MCO": {TravelerType.BUSINESS: 0.05, TravelerType.LEISURE: 0.70,
            TravelerType.VFR: 0.20, TravelerType.CONNECTING: 0.05},
}

DEFAULT_WEIGHTS = {
    TravelerType.BUSINESS: 0.25,
    TravelerType.LEISURE: 0.40,
    TravelerType.VFR: 0.20,
    TravelerType.CONNECTING: 0.15,
}


# One-sentence story templates per traveler type. Filled with destination + small flavor.
STORY_TEMPLATES = {
    TravelerType.BUSINESS: [
        "Heading to {dest} for a Monday morning client meeting.",
        "On the {dest} route again — third time this month.",
        "Quarterly review in {dest}, hasn't prepared the slides.",
        "Sales trip to {dest}; new territory, knows nobody.",
        "{dest} for a conference keynote, slightly hungover.",
    ],
    TravelerType.LEISURE: [
        "Long weekend in {dest} with college friends.",
        "Bachelorette trip to {dest}; matching shirts and all.",
        "First real vacation in two years, {dest}-bound.",
        "Heading to {dest} to ski; bags came in late from outfitter.",
        "Reunion of high school friends in {dest}.",
    ],
    TravelerType.VFR: [
        "Going to {dest} to visit a grandchild for the first time.",
        "Helping a parent move into assisted living in {dest}.",
        "{dest} for a cousin's wedding; doesn't know the bride well.",
        "Surprise visit to {dest} — older brother turns 60 this weekend.",
        "Catching up with a friend in {dest}; haven't seen them since college.",
    ],
    TravelerType.CONNECTING: [
        "Connecting through {dest} on the way to a job interview.",
        "BTV→{dest} is the painful leg; the next leg is the fun part.",
        "Connecting at {dest}, hoping for an upgrade on the longhaul.",
        "On a punishing routing through {dest}; bought tickets late.",
        "{dest} connection for a delayed honeymoon.",
    ],
}


def _weighted_choice(weights: dict, rng: random.Random):
    items = list(weights.items())
    total = sum(w for _, w in items)
    r = rng.uniform(0, total)
    upto = 0.0
    for k, w in items:
        upto += w
        if r <= upto:
            return k
    return items[-1][0]


def _arrival_offset_minutes(traveler_type: TravelerType, rng: random.Random) -> int:
    """How many minutes before scheduled departure does this passenger arrive at the entrance?"""
    if traveler_type == TravelerType.BUSINESS:
        return int(rng.gauss(60, 15))
    if traveler_type == TravelerType.CONNECTING:
        return int(rng.gauss(45, 10))  # connecting pax don't arrive at the entrance in reality
    if traveler_type == TravelerType.VFR:
        return int(rng.gauss(90, 20))
    return int(rng.gauss(105, 25))  # LEISURE


def _random_attributes(traveler_type: TravelerType, rng: random.Random) -> PassengerAttributes:
    if traveler_type == TravelerType.BUSINESS:
        patience = int(rng.gauss(65, 12))
        ff = rng.choices(
            [FrequentFlyer.NONE, FrequentFlyer.BASIC, FrequentFlyer.SILVER,
             FrequentFlyer.GOLD, FrequentFlyer.PLATINUM],
            weights=[0.10, 0.25, 0.30, 0.25, 0.10])[0]
        price = int(rng.gauss(70, 15))
    elif traveler_type == TravelerType.LEISURE:
        patience = int(rng.gauss(40, 15))
        ff = rng.choices(
            [FrequentFlyer.NONE, FrequentFlyer.BASIC, FrequentFlyer.SILVER],
            weights=[0.55, 0.30, 0.15])[0]
        price = int(rng.gauss(40, 18))
    elif traveler_type == TravelerType.VFR:
        patience = int(rng.gauss(55, 18))
        ff = rng.choices(
            [FrequentFlyer.NONE, FrequentFlyer.BASIC, FrequentFlyer.SILVER],
            weights=[0.65, 0.25, 0.10])[0]
        price = int(rng.gauss(45, 20))
    else:  # CONNECTING
        patience = int(rng.gauss(50, 18))
        ff = rng.choices(
            [FrequentFlyer.NONE, FrequentFlyer.BASIC, FrequentFlyer.SILVER, FrequentFlyer.GOLD],
            weights=[0.25, 0.30, 0.30, 0.15])[0]
        price = int(rng.gauss(55, 18))
    return PassengerAttributes(
        patience=max(5, min(100, patience)),
        mood=Mood.NEUTRAL,
        ff_status=ff,
        price_sensitivity=max(0, min(100, price)),
        dietary="",
    )


def _passenger_from_regular(reg: RegularDefinition, flight: Flight, rng: random.Random) -> Passenger:
    offset = _arrival_offset_minutes(reg.traveler_type, rng)
    return Passenger(
        id=f"reg-{reg.id}-{flight.id}",
        name=reg.name,
        age=reg.age,
        traveler_type=reg.traveler_type,
        party_size=1,
        story=reg.story_hook,
        attributes=PassengerAttributes(
            patience=reg.attributes.patience,
            mood=reg.attributes.mood,
            ff_status=reg.attributes.ff_status,
            price_sensitivity=reg.attributes.price_sensitivity,
            dietary=reg.attributes.dietary,
        ),
        assigned_flight_id=flight.id,
        arrival_time=flight.scheduled_departure - timedelta(minutes=offset),
        regular_id=reg.id,
    )


def generate_passengers_for_flight(
    flight: Flight,
    regulars: list[RegularDefinition],
    name_pool,  # NamePool — duck-typed
    seed: int | None = None,
) -> list[Passenger]:
    rng = random.Random(seed if seed is not None else hash(flight.id) & 0xFFFFFFFF)
    weekday = flight.scheduled_departure.weekday()

    passengers: list[Passenger] = []

    # Insert any regulars whose schedule matches this flight.
    matching_regulars = [r for r in regulars if r.matches_flight(weekday, flight.carrier, flight.destination)]
    for reg in matching_regulars:
        passengers.append(_passenger_from_regular(reg, flight, rng))

    # Fill remaining seats procedurally.
    target = flight.expected_passenger_count
    remaining = max(0, target - len(passengers))
    weights = TRAVELER_TYPE_WEIGHTS_BY_DESTINATION.get(flight.destination, DEFAULT_WEIGHTS)

    for _ in range(remaining):
        ttype: TravelerType = _weighted_choice(weights, rng)
        attrs = _random_attributes(ttype, rng)
        name = name_pool.next_name(rng)
        age = int(max(2, min(92, rng.gauss(42, 18))))
        story_template = rng.choice(STORY_TEMPLATES[ttype])
        story = story_template.format(dest=flight.destination)
        offset = _arrival_offset_minutes(ttype, rng)
        pax = Passenger(
            id=uuid.UUID(int=rng.getrandbits(128)).hex[:12],
            name=name,
            age=age,
            traveler_type=ttype,
            party_size=1,
            story=story,
            attributes=attrs,
            assigned_flight_id=flight.id,
            arrival_time=flight.scheduled_departure - timedelta(minutes=max(20, offset)),
            regular_id=None,
        )
        passengers.append(pax)

    return passengers
