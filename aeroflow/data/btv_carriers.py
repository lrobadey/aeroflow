"""BTV carrier-route patterns. Drives the procedural schedule generator.

These are plausible reflections of BTV's actual mid-2020s schedule, captured as
patterns rather than a frozen day. (Spot-check from FlightAware / BTV's site
when refining.)
"""

from __future__ import annotations

from ..sim.schedule import CarrierRoute, TimeCluster


# daily_freq_by_season is (spring, summer, fall, winter)
BTV_ROUTES: list[CarrierRoute] = [
    # JetBlue — Boston commuter and east coast
    CarrierRoute(
        carrier="B6", destination="BOS",
        aircraft="E190", capacity=100, typical_load_factor=0.85,
        daily_freq_by_season=(4, 4, 4, 4),
        departure_clusters=[
            TimeCluster(hour=6.25, std_minutes=20),
            TimeCluster(hour=10.75, std_minutes=25),
            TimeCluster(hour=15.5, std_minutes=25),
            TimeCluster(hour=19.5, std_minutes=25),
        ],
    ),
    CarrierRoute(
        carrier="B6", destination="JFK",
        aircraft="E190", capacity=100, typical_load_factor=0.82,
        daily_freq_by_season=(2, 3, 2, 3),
        departure_clusters=[
            TimeCluster(hour=7.0, std_minutes=20),
            TimeCluster(hour=14.5, std_minutes=30),
            TimeCluster(hour=18.75, std_minutes=25),
        ],
    ),
    CarrierRoute(
        carrier="B6", destination="FLL",
        aircraft="A320", capacity=150, typical_load_factor=0.88,
        daily_freq_by_season=(0, 0, 0, 1),  # winter only
        departure_clusters=[TimeCluster(hour=11.0, std_minutes=30)],
    ),

    # Delta — Detroit, NY, ATL hubs
    CarrierRoute(
        carrier="DL", destination="DTW",
        aircraft="CRJ-700", capacity=76, typical_load_factor=0.78,
        daily_freq_by_season=(2, 2, 2, 2),
        departure_clusters=[
            TimeCluster(hour=7.25, std_minutes=20),
            TimeCluster(hour=15.0, std_minutes=25),
        ],
    ),
    CarrierRoute(
        carrier="DL", destination="LGA",
        aircraft="CRJ-700", capacity=76, typical_load_factor=0.80,
        daily_freq_by_season=(2, 2, 2, 2),
        departure_clusters=[
            TimeCluster(hour=6.5, std_minutes=20),
            TimeCluster(hour=17.25, std_minutes=25),
        ],
    ),
    CarrierRoute(
        carrier="DL", destination="JFK",
        aircraft="CRJ-700", capacity=76, typical_load_factor=0.78,
        daily_freq_by_season=(1, 1, 1, 1),
        departure_clusters=[TimeCluster(hour=12.5, std_minutes=30)],
    ),
    CarrierRoute(
        carrier="DL", destination="ATL",
        aircraft="717", capacity=110, typical_load_factor=0.83,
        daily_freq_by_season=(1, 1, 1, 1),
        departure_clusters=[TimeCluster(hour=11.0, std_minutes=25)],
    ),

    # United — EWR, ORD, IAD
    CarrierRoute(
        carrier="UA", destination="EWR",
        aircraft="E175", capacity=76, typical_load_factor=0.80,
        daily_freq_by_season=(3, 3, 3, 3),
        departure_clusters=[
            TimeCluster(hour=6.0, std_minutes=20),
            TimeCluster(hour=12.0, std_minutes=30),
            TimeCluster(hour=18.0, std_minutes=25),
        ],
    ),
    CarrierRoute(
        carrier="UA", destination="ORD",
        aircraft="E175", capacity=76, typical_load_factor=0.78,
        daily_freq_by_season=(1, 1, 1, 1),
        departure_clusters=[TimeCluster(hour=10.5, std_minutes=25)],
    ),
    CarrierRoute(
        carrier="UA", destination="IAD",
        aircraft="CRJ-200", capacity=50, typical_load_factor=0.75,
        daily_freq_by_season=(1, 1, 1, 1),
        departure_clusters=[TimeCluster(hour=14.5, std_minutes=30)],
    ),

    # American — CLT, DCA, PHL
    CarrierRoute(
        carrier="AA", destination="CLT",
        aircraft="CRJ-700", capacity=65, typical_load_factor=0.80,
        daily_freq_by_season=(2, 2, 2, 2),
        departure_clusters=[
            TimeCluster(hour=6.5, std_minutes=20),
            TimeCluster(hour=17.0, std_minutes=25),
        ],
    ),
    CarrierRoute(
        carrier="AA", destination="DCA",
        aircraft="CRJ-700", capacity=65, typical_load_factor=0.78,
        daily_freq_by_season=(1, 1, 1, 1),
        departure_clusters=[TimeCluster(hour=13.0, std_minutes=30)],
    ),
    CarrierRoute(
        carrier="AA", destination="PHL",
        aircraft="CRJ-200", capacity=50, typical_load_factor=0.72,
        daily_freq_by_season=(1, 1, 1, 1),
        departure_clusters=[TimeCluster(hour=15.5, std_minutes=30)],
    ),

    # Allegiant (seasonal ULCC)
    CarrierRoute(
        carrier="G4", destination="MCO",
        aircraft="A320", capacity=180, typical_load_factor=0.92,
        daily_freq_by_season=(0, 0, 0, 1),  # winter only
        departure_clusters=[TimeCluster(hour=12.5, std_minutes=20)],
    ),
]
