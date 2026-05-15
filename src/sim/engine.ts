/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { analyze } from './emergence';
import { downstreamOf } from './graph';
import {
  AlertEntry,
  QueueState,
  Signal,
  StepResult,
  SystemId,
  SystemInstance,
  World,
} from './types';

const SIGNAL_WINDOW = 40;
const HISTORY_WINDOW = 40;
const ALERT_WINDOW = 5;

export interface EngineConfig {
  exitRevenue: number;
}

export function step(world: World, config: EngineConfig): World {
  const nextTick = world.tick + 1;
  const policy = world.emergence.policy;

  const outputs: Record<SystemId, StepResult<any>> = {};
  for (const sys of world.systems) {
    outputs[sys.id] = sys.step({
      state: sys.state,
      inbox: 0,
      tick: nextTick,
      policy,
    });
  }

  const inboxes: Record<SystemId, number> = {};
  let exitCount = 0;
  for (const sys of world.systems) {
    const out = outputs[sys.id].outbox;
    if (out <= 0) continue;
    const targets = downstreamOf(world.flows, sys.id);
    if (targets.length === 0) {
      exitCount += out;
    } else {
      const share = out / targets.length;
      for (const t of targets) {
        inboxes[t] = (inboxes[t] ?? 0) + share;
      }
    }
  }

  let totalStaffCost = 0;
  const nextSystems: SystemInstance<any>[] = world.systems.map(sys => {
    const result = outputs[sys.id];
    let nextState = result.state;
    const incoming = inboxes[sys.id] ?? 0;
    if (incoming > 0 && sys.kind === 'queue') {
      const q = nextState as QueueState;
      nextState = { ...q, queue: q.queue + incoming };
    }
    totalStaffCost += result.staffCost ?? 0;
    return { ...sys, state: nextState };
  });

  const revenue = exitCount * config.exitRevenue;
  const nextFunds = world.funds + revenue - totalStaffCost;

  const newSignals: Signal[] = [];
  for (const id of Object.keys(outputs)) newSignals.push(...outputs[id].signals);
  const allSignals = [...world.signals, ...newSignals].slice(-SIGNAL_WINDOW * world.systems.length);

  const queueStates: Record<SystemId, QueueState> = {};
  for (const sys of nextSystems) {
    if (sys.kind === 'queue') queueStates[sys.id] = sys.state as QueueState;
  }

  const analysis = analyze({
    tick: nextTick,
    flows: world.flows,
    queueStates,
    recentSignals: allSignals,
    prevSatisfaction: world.overallSatisfaction,
    systems: nextSystems,
  });

  const nextSatisfaction = clamp(world.overallSatisfaction + analysis.satisfactionDelta, 0, 1);

  const newAlerts: AlertEntry[] = analysis.facts
    .filter(f => f.kind !== 'nominal' || nextTick % 20 === 0)
    .map(f => ({ msg: f.message, type: f.level, tick: nextTick }));
  const nextAlerts = [...newAlerts, ...world.alerts].slice(0, ALERT_WINDOW);

  const queuesSnapshot: Record<string, number> = {};
  for (const id of Object.keys(queueStates)) queuesSnapshot[id] = queueStates[id].queue;

  const nextHistory = [
    ...world.history,
    {
      tick: nextTick,
      funds: nextFunds,
      satisfaction: nextSatisfaction,
      queues: queuesSnapshot,
      inflowThrottle: analysis.policy.inflowThrottle,
    },
  ].slice(-HISTORY_WINDOW);

  return {
    ...world,
    tick: nextTick,
    funds: nextFunds,
    totalPassengersProcessed: world.totalPassengersProcessed + exitCount,
    overallSatisfaction: nextSatisfaction,
    systems: nextSystems,
    signals: allSignals,
    emergence: { facts: analysis.facts, policy: analysis.policy },
    history: nextHistory,
    alerts: nextAlerts,
  };
}

export function getQueueState(world: World, id: SystemId): QueueState | undefined {
  const sys = world.systems.find(s => s.id === id);
  if (!sys || sys.kind !== 'queue') return undefined;
  return sys.state as QueueState;
}

export function mutateQueueState(
  world: World,
  id: SystemId,
  fn: (s: QueueState) => QueueState,
): World {
  return {
    ...world,
    systems: world.systems.map(s => {
      if (s.id !== id || s.kind !== 'queue') return s;
      return { ...s, state: fn(s.state as QueueState) };
    }),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
