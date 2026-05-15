/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { downstreamOf } from './graph';
import {
  EmergenceFact,
  FlowEdge,
  Policy,
  QueueState,
  Signal,
  SystemId,
  SystemInstance,
} from './types';

const WINDOW = 8;

const BOTTLENECK_PRESSURE = 0.15;
const CASCADE_PRESSURE = 0.08;
const STARVATION_THRESHOLD = 0.7;
const OSCILLATION_VARIANCE = 0.25;

const RECOVERY_PER_TICK = 0.001;
const SATISFACTION_DRAG = 0.5;

const THROTTLE_FLOOR = 0.3;
const THROTTLE_CEILING = 1.0;

interface AnalysisInput {
  tick: number;
  flows: FlowEdge[];
  queueStates: Record<SystemId, QueueState>;
  recentSignals: Signal[];
  prevSatisfaction: number;
  systems: SystemInstance<any>[];
}

export interface AnalysisOutput {
  facts: EmergenceFact[];
  policy: Policy;
  satisfactionDelta: number;
}

export function analyze(input: AnalysisInput): AnalysisOutput {
  const { tick, flows, queueStates, recentSignals, prevSatisfaction, systems } = input;

  const pressureByNode = lastValueByNode(recentSignals, 'pressure');
  const loadByNode = lastValueByNode(recentSignals, 'load');
  const starvationByNode = lastValueByNode(recentSignals, 'starvation');

  const facts: EmergenceFact[] = [];

  let maxStress = 0;
  let bottleneckId: SystemId | undefined;
  let totalWeightedStress = 0;

  for (const id of Object.keys(queueStates)) {
    const node = queueStates[id];
    const pressure = pressureByNode[id] ?? 0;
    const stress = pressure * Math.max(1, node.satisfactionImpact * 1000);
    const weightedDrag = pressure * node.satisfactionImpact;
    totalWeightedStress += weightedDrag;

    if (pressure > maxStress) {
      maxStress = pressure;
      if (pressure > BOTTLENECK_PRESSURE) bottleneckId = id;
    }
  }

  if (bottleneckId) {
    const bn = queueStates[bottleneckId];
    facts.push({
      kind: 'bottleneck',
      at: bottleneckId,
      severity: clamp01(maxStress),
      level: maxStress > 0.35 ? 'crit' : 'warn',
      message: `BOTTLENECK at ${bn.name.toUpperCase()} — pressure ${(maxStress * 100).toFixed(0)}%`,
      tick,
    });
  }

  if (bottleneckId) {
    for (const downId of downstreamOf(flows, bottleneckId)) {
      if ((pressureByNode[downId] ?? 0) > CASCADE_PRESSURE) {
        facts.push({
          kind: 'cascade',
          at: downId,
          severity: clamp01((pressureByNode[downId] ?? 0) + maxStress),
          level: 'warn',
          message: `CASCADE forming from ${bottleneckId.toUpperCase()} into ${queueStates[downId].name.toUpperCase()}`,
          tick,
        });
        break;
      }
    }
  }

  for (const id of Object.keys(queueStates)) {
    if ((starvationByNode[id] ?? 0) > STARVATION_THRESHOLD && (loadByNode[id] ?? 0) < 0.1) {
      const node = queueStates[id];
      facts.push({
        kind: 'starvation',
        at: id,
        severity: starvationByNode[id] ?? 0,
        level: 'info',
        message: `${node.name.toUpperCase()} STARVED — capacity idle, upstream blocked`,
        tick,
      });
    }
  }

  for (const id of Object.keys(queueStates)) {
    const series = pressureSeriesFor(recentSignals, id);
    if (series.length >= WINDOW) {
      const variance = stddev(series);
      const mean = avg(series);
      if (variance > OSCILLATION_VARIANCE && mean > 0.05) {
        facts.push({
          kind: 'oscillation',
          at: id,
          severity: clamp01(variance),
          level: 'warn',
          message: `${queueStates[id].name.toUpperCase()} OSCILLATING — feedback loop unstable`,
          tick,
        });
      }
    }
  }

  if (facts.length === 0 && tick % 20 === 0) {
    facts.push({
      kind: 'nominal',
      severity: 0,
      level: 'info',
      message: 'SYSTEM OPERATIONS NOMINAL',
      tick,
    });
  }

  const inflowThrottle = clamp(
    THROTTLE_CEILING - maxStress * 1.2,
    THROTTLE_FLOOR,
    THROTTLE_CEILING,
  );

  const staffingHints: Record<SystemId, number> = {};
  for (const sys of systems) {
    if (sys.kind === 'queue') staffingHints[sys.id] = 0;
  }
  if (bottleneckId) staffingHints[bottleneckId] = 1;

  const satisfactionDelta = RECOVERY_PER_TICK - totalWeightedStress * SATISFACTION_DRAG;

  return {
    facts,
    policy: { inflowThrottle, staffingHints },
    satisfactionDelta,
  };
}

function lastValueByNode(signals: Signal[], kind: Signal['kind']): Record<SystemId, number> {
  const out: Record<SystemId, number> = {};
  let highestTick = -Infinity;
  for (const s of signals) if (s.tick > highestTick) highestTick = s.tick;
  for (const s of signals) {
    if (s.kind !== kind) continue;
    if (s.tick === highestTick) out[s.source] = s.value;
  }
  return out;
}

function pressureSeriesFor(signals: Signal[], id: SystemId): number[] {
  return signals.filter(s => s.source === id && s.kind === 'pressure').map(s => s.value);
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  const sq = xs.map(x => (x - m) ** 2);
  return Math.sqrt(avg(sq));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}
