# Legacy: AeroFlow TypeScript prototype

This directory holds the original browser-based AeroFlow prototype: a TypeScript / React / Vite app modeling passenger flow through check-in, security, lounge, and boarding, with emergent bottlenecks and operator controls.

It is **retained for reference only** and superseded by the Python implementation at the repo root.

## Why kept?

- Design intuition. The TS prototype solved similar zone-flow and emergence problems and is useful to look back at when shaping the Python sim.
- Carrier and passenger flow heuristics in `src/sim/` may inform tuning values.

## Why not ported directly?

The new design philosophy differs:

- Real airport (BTV) rather than abstract terminal.
- Named passengers with persistent biographies, not anonymous flow.
- Pure-Python sim core for portability to a real game engine later.
- v0 is pure observation; no operator controls yet.

## Running the legacy app

If you want to spin it up for comparison:

```bash
cd legacy
npm install
npm run dev
```
