# AeroFlow

AeroFlow is a browser-based airport logistics simulation. It models a terminal as a chain of nested systems: arrivals feed passenger queues, queues emit operational signals, and an emergence layer turns those signals into bottleneck facts, staffing hints, and inflow throttling.

The goal is not to draw a static dashboard. The app is a live feedback system where small operator decisions affect queue pressure, passenger satisfaction, revenue, and system stability over time.

## What the app simulates

- Passenger flow through check-in, security, lounge, and boarding stages.
- Queue capacity, staffing, processing rate, and passenger pressure at each stage.
- System-wide satisfaction and revenue as passengers move through the terminal.
- Emergent bottlenecks, cascade warnings, starvation signals, and inflow throttling.
- Operator actions such as hiring staff, reducing staff, and expanding capacity.

## System shape

```text
arrivals
  -> check-in
  -> security
  -> lounge
  -> boarding
  -> exit / revenue
```

The simulation is split into a few clear layers:

- `src/App.tsx` renders the cockpit and sends operator actions into the sim.
- `src/sim/world.ts` creates the starting world, system nodes, and flow graph.
- `src/sim/engine.ts` advances the world one tick at a time.
- `src/sim/systems/` contains individual system behaviors, such as arrivals and queue stages.
- `src/sim/emergence.ts` reads recent signals and produces higher-level operational facts.
- `src/constants.ts` holds the initial tuning values and upgrade costs.

## Run locally

Prerequisite: Node.js.

```bash
npm install
npm run dev
```

The dev server runs on port `3000` by default.

## Validate

```bash
npm run lint
npm run build
```

## Notes

This app currently runs fully in the browser. It does not require an API key or backend service.
