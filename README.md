# AeroFlow

A small-airport simulation. The current target is BTV (Burlington, VT) — seven gates, single concourse, business commuter and ski-leisure mix.

v0 is **pure observation**: you watch a sim day unfold from 5am to midnight. Named passengers move through zones (check-in, security, concourse, gate seating, jetway). You can pause, speed up, click a passenger to read their story. At day end, a recap surfaces the day's moments.

There are no operator controls in v0. The goal is to prove the simulation looks and feels believable before any gameplay is layered on.

## Design

- **Real airport.** BTV's actual carrier mix (B6, DL, UA, AA) and routes drive a procedural schedule generator. Each sim day is novel but plausible.
- **Zone-based.** Passengers transition between named zones with realistic dwell times. No walking, no pathfinding.
- **Rich human stories.** A small named cast of regulars with persistent biographies and recurring travel patterns, plus procedural one-shots that fill the airport.
- **Portable sim core.** The `aeroflow/sim/` package has no pygame imports. The renderer is a thin layer. If we ever move to a real game engine, the sim ports unchanged.

## Layout

```
aeroflow/
  sim/      # pure Python simulation (no rendering imports)
  render/   # pygame layer
  data/     # BTV layout, carrier routes, regulars cast, name pool
tests/      # pytest for sim core
legacy/     # original TypeScript prototype (reference only)
```

## Run

```bash
pip install -e .
python -m aeroflow
```

## Test

```bash
pytest
```

## Controls

- `space` — pause / resume
- `1` / `2` / `3` — 1× / 10× / 60× speed
- click a passenger dot — open story panel
- click outside — close story panel
