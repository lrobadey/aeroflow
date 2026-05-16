"""Named regulars: a small persistent cast that recurs across sim days.

Each regular has a recurring schedule expressed as (weekday, carrier, destination)
tuples. weekday: 0=Mon..6=Sun. The population generator inserts them on matching
flights before filling the rest with procedural passengers.
"""

from __future__ import annotations

from ..sim.passenger import (
    FrequentFlyer,
    Mood,
    PassengerAttributes,
    RegularDefinition,
    TravelerType,
)


BTV_REGULARS: list[RegularDefinition] = [
    RegularDefinition(
        id="kovalenko",
        name="Tom Kovalenko",
        age=47,
        home="Burlington, lives in the New North End",
        occupation="Software architect, commutes to Wayfair Boston",
        traveler_type=TravelerType.BUSINESS,
        attributes=PassengerAttributes(
            patience=78, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.PLATINUM,
            price_sensitivity=85, dietary="",
        ),
        story_hook="Six years on the M-Th BOS commute. His marriage is fraying from it, but he hasn't told anyone.",
        panel_tag="BTV regular · M–Th BOS commuter",
        schedule=[
            (0, "B6", "BOS"),  # Monday morning out
            (3, "B6", "BOS"),  # Thursday — last leg of week (return is later in evening, modeled separately)
        ],
    ),
    RegularDefinition(
        id="mendoza",
        name="Carla Mendoza",
        age=53,
        home="Shelburne, lives on the lake",
        occupation="Owns a Chelsea art gallery",
        traveler_type=TravelerType.BUSINESS,
        attributes=PassengerAttributes(
            patience=60, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.GOLD,
            price_sensitivity=30, dietary="vegetarian",
        ),
        story_hook="Flies to NYC every Tuesday for opening-week visits. Always orders the Skinny Pancake bowl.",
        panel_tag="BTV regular · Tuesday NYC",
        schedule=[(1, "B6", "JFK")],
    ),
    RegularDefinition(
        id="colonel",
        name="Hank Demeritte",
        age=71,
        home="Essex Junction",
        occupation="Retired Air Force colonel",
        traveler_type=TravelerType.VFR,
        attributes=PassengerAttributes(
            patience=88, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.SILVER,
            price_sensitivity=70, dietary="",
        ),
        story_hook="Visits his daughter in DC every other Friday. Always reads the actual newspaper.",
        panel_tag="BTV regular · 'The Colonel'",
        schedule=[(4, "AA", "DCA")],
    ),
    RegularDefinition(
        id="petersen",
        name="Sarah Petersen",
        age=31,
        home="Brooklyn, NY",
        occupation="Wedding photographer",
        traveler_type=TravelerType.LEISURE,
        attributes=PassengerAttributes(
            patience=45, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.BASIC,
            price_sensitivity=55, dietary="",
        ),
        story_hook="Shoots a Stowe wedding most Saturdays in summer; on the Sunday morning JFK return she is always running on coffee.",
        panel_tag="BTV regular · Stowe wedding circuit",
        schedule=[(6, "B6", "JFK")],  # Sunday return
    ),
    RegularDefinition(
        id="whitcomb_dad",
        name="Mark Whitcomb",
        age=39,
        home="South Burlington",
        occupation="Plumbing-supply manager",
        traveler_type=TravelerType.LEISURE,
        attributes=PassengerAttributes(
            patience=55, mood=Mood.HAPPY,
            ff_status=FrequentFlyer.NONE,
            price_sensitivity=50, dietary="",
        ),
        story_hook="Annual family ski-then-Florida trip. His seven-year-old has never flown before; everybody is wearing matching neon.",
        panel_tag="BTV regular · annual FLL family trip",
        schedule=[(5, "B6", "FLL")],  # winter Saturday
    ),
    RegularDefinition(
        id="thibault",
        name="Marie Thibault",
        age=64,
        home="St. Albans",
        occupation="Hospice nurse",
        traveler_type=TravelerType.VFR,
        attributes=PassengerAttributes(
            patience=82, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.NONE,
            price_sensitivity=80, dietary="",
        ),
        story_hook="Flies to Detroit one weekend a month to help her son raise his twins. Brings a Costco bag of homemade cookies every time.",
        panel_tag="BTV regular · Detroit grandkids",
        schedule=[(4, "DL", "DTW")],  # Friday afternoon
    ),
    RegularDefinition(
        id="okafor",
        name="Adaeze Okafor",
        age=28,
        home="Williston",
        occupation="Travel nurse, currently posted in Charlotte",
        traveler_type=TravelerType.BUSINESS,
        attributes=PassengerAttributes(
            patience=65, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.SILVER,
            price_sensitivity=40, dietary="",
        ),
        story_hook="On a 13-week contract in Charlotte. Comes home every other Sunday night, leaves Monday at dawn. Knows the AA gate agents by name.",
        panel_tag="BTV regular · Charlotte travel nurse",
        schedule=[(0, "AA", "CLT")],  # Monday morning back to CLT
    ),
    RegularDefinition(
        id="fontaine",
        name="Pierre Fontaine",
        age=58,
        home="Montréal originally; St. Albans now",
        occupation="Cabinetmaker",
        traveler_type=TravelerType.VFR,
        attributes=PassengerAttributes(
            patience=75, mood=Mood.NEUTRAL,
            ff_status=FrequentFlyer.NONE,
            price_sensitivity=85, dietary="",
        ),
        story_hook="Visits a brother in Newark twice a year for the Yankees series. Refuses to check a bag.",
        panel_tag="BTV regular · Yankees series",
        schedule=[(2, "UA", "EWR")],  # Wednesday afternoon
    ),
]
