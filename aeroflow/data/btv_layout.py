"""BTV terminal layout: zones with screen positions.

Top-down view of a single concourse. From top to bottom:

    [ ENTRANCE ] [ DL CHECK-IN ] [ B6 CHECK-IN ] [ UA CHECK-IN ] [ AA CHECK-IN ]
                          [    SECURITY (TSA)    ]
              [               CONCOURSE                          ]
    [ G1 ] [ G2 ] [ G3 ] [ G4 ] [ G5 ] [ G6 ] [ G7 ]
    [JG1 ] [JG2 ] [JG3 ] [JG4 ] [JG5 ] [JG6 ] [JG7 ]
"""

from __future__ import annotations

from ..sim.zone import Zone, ZoneRect, ZoneType


GATES = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"]


def build_btv_zones() -> dict[str, Zone]:
    zones: dict[str, Zone] = {}

    # Row 1: entrance + per-airline check-in
    zones["ENTRANCE"] = Zone(
        id="ENTRANCE",
        type=ZoneType.ENTRANCE,
        label="Curb / Entrance",
        rect=ZoneRect(x=20, y=72, width=140, height=108),
        capacity=40,
    )
    for i, carrier in enumerate(["DL", "B6", "UA", "AA"]):
        zones[f"CHECKIN_{carrier}"] = Zone(
            id=f"CHECKIN_{carrier}",
            type=ZoneType.CHECK_IN,
            label=f"{carrier} Check-in",
            rect=ZoneRect(x=180 + i * 260, y=72, width=240, height=108),
            service_rate_per_min=12.0,
            service_seconds_min=60.0,
            capacity=50,
            accepts_carrier=carrier,
        )

    # Row 2: security
    zones["SECURITY"] = Zone(
        id="SECURITY",
        type=ZoneType.SECURITY,
        label="TSA Security",
        rect=ZoneRect(x=320, y=200, width=600, height=140),
        service_rate_per_min=22.0,
        service_seconds_min=45.0,
        capacity=120,
    )

    # Row 3: concourse
    zones["CONCOURSE"] = Zone(
        id="CONCOURSE",
        type=ZoneType.CONCOURSE,
        label="Concourse  ·  Skinny Pancake  ·  Vermont Flannel  ·  Newsstand",
        rect=ZoneRect(x=20, y=360, width=1180, height=180),
        capacity=400,
    )

    # Row 4: gate seating G1..G7
    gate_w = 160
    for i, gate in enumerate(GATES):
        x = 20 + i * (gate_w + 10)
        zones[f"GATE_{gate}"] = Zone(
            id=f"GATE_{gate}",
            type=ZoneType.GATE_SEATING,
            label=f"Gate {gate}",
            rect=ZoneRect(x=x, y=560, width=gate_w, height=160),
            capacity=80,
            accepts_gate=gate,
        )
        # Row 5: per-gate jetway
        zones[f"JETWAY_{gate}"] = Zone(
            id=f"JETWAY_{gate}",
            type=ZoneType.JETWAY,
            label=f"Jetway {gate}",
            rect=ZoneRect(x=x, y=730, width=gate_w, height=90),
            service_rate_per_min=40.0,
            service_seconds_min=20.0,
            capacity=60,
            accepts_gate=gate,
        )

    return zones
