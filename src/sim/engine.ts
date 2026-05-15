/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { analyze } from './emergence';
import { downstreamOf } from './graph';
import { advanceFlights } from './systems/flights';
import {
  ArrivalState,
  AlertEntry,
  PassengerBatch,
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
      inboundBatches: [],
      tick: nextTick,
      policy,
    });
  }

  const inboxes: Record<SystemId, number> = {};
  const batchInboxes: Record<SystemId, PassengerBatch[]> = {};
  const boardedBatches: PassengerBatch[] = [];
  for (const sys of world.systems) {
    const out = outputs[sys.id].outbox;
    const outboxBatches = outputs[sys.id].outboxBatches;
    if (out <= 0) continue;
    const targets = downstreamOf(world.flows, sys.id);
    if (targets.length === 0) {
      boardedBatches.push(...outboxBatches);
    } else {
      const share = out / targets.length;
      for (const t of targets) {
        inboxes[t] = (inboxes[t] ?? 0) + share;
        batchInboxes[t] = [...(batchInboxes[t] ?? []), ...splitBatches(outboxBatches, targets.length)];
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
      const incomingBatches = batchInboxes[sys.id] ?? [];
      nextState = {
        ...q,
        queue: q.queue + incoming,
        batches: [...q.batches, ...incomingBatches],
      };
    }
    totalStaffCost += result.staffCost ?? 0;
    return { ...sys, state: nextState };
  });

  const lifecycleQueueStates: Record<SystemId, QueueState> = {};
  for (const sys of nextSystems) {
    if (sys.kind === 'queue') lifecycleQueueStates[sys.id] = sys.state as QueueState;
  }

  const sourceState = nextSystems.find(sys => sys.kind === 'source')?.state as ArrivalState | undefined;
  const sourceCohorts = sourceState?.cohorts ?? world.passengerCohorts;
  const flightLifecycle = advanceFlights({
    tick: nextTick,
    aircraftTypes: world.aircraftTypes,
    flights: world.flights,
    gates: world.gates,
    passengerCohorts: sourceCohorts,
    queueStates: lifecycleQueueStates,
    boardedBatches,
  });

  const closedFlightIds = new Set(
    flightLifecycle.flights
      .filter(flight => flight.status === 'departed' || flight.status === 'cancelled')
      .map(flight => flight.id),
  );
  const synchronizedSystems = nextSystems.map(sys => {
    if (sys.kind === 'queue') {
      return { ...sys, state: removeBatchesForFlights(sys.state as QueueState, closedFlightIds) };
    }
    if (sys.kind !== 'source') return sys;
    return { ...sys, state: { ...(sys.state as ArrivalState), cohorts: flightLifecycle.passengerCohorts } };
  });

  const queueStates: Record<SystemId, QueueState> = {};
  for (const sys of synchronizedSystems) {
    if (sys.kind === 'queue') queueStates[sys.id] = sys.state as QueueState;
  }

  const revenue = flightLifecycle.boardedPassengers * config.exitRevenue;
  const nextFunds = world.funds + revenue - totalStaffCost;

  const newSignals: Signal[] = [];
  for (const id of Object.keys(outputs)) newSignals.push(...outputs[id].signals);
  newSignals.push(...flightLifecycle.signals);
  const allSignals = [...world.signals, ...newSignals].slice(-SIGNAL_WINDOW * world.systems.length);

  const analysis = analyze({
    tick: nextTick,
    flows: world.flows,
    queueStates,
    recentSignals: allSignals,
    prevSatisfaction: world.overallSatisfaction,
    systems: synchronizedSystems,
  });

  const nextSatisfaction = clamp(world.overallSatisfaction + analysis.satisfactionDelta, 0, 1);

  const newAlerts: AlertEntry[] = analysis.facts
    .filter(f => f.kind !== 'nominal' || nextTick % 20 === 0)
    .map(f => ({ msg: f.message, type: f.level, tick: nextTick }));
  const flightAlerts: AlertEntry[] = flightLifecycle.events.map(event => ({
    msg: event.message.toUpperCase(),
    type: event.level,
    tick: event.tick,
  }));
  const nextAlerts = [...flightAlerts, ...newAlerts, ...world.alerts].slice(0, ALERT_WINDOW);

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
      delayedFlights: flightLifecycle.flights.filter(flight => flight.status === 'delayed').length,
      boardedPassengers: world.totalPassengersProcessed + flightLifecycle.boardedPassengers,
    },
  ].slice(-HISTORY_WINDOW);

  return {
    ...world,
    tick: nextTick,
    funds: nextFunds,
    totalPassengersProcessed: world.totalPassengersProcessed + flightLifecycle.boardedPassengers,
    overallSatisfaction: nextSatisfaction,
    flights: flightLifecycle.flights,
    gates: flightLifecycle.gates,
    passengerCohorts: flightLifecycle.passengerCohorts,
    flightEvents: [...flightLifecycle.events, ...world.flightEvents].slice(0, 40),
    systems: synchronizedSystems,
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

function splitBatches(batches: PassengerBatch[], targetCount: number): PassengerBatch[] {
  if (targetCount <= 1) return batches;
  return batches.map(batch => ({ ...batch, count: batch.count / targetCount }));
}

function removeBatchesForFlights(state: QueueState, flightIds: Set<string>): QueueState {
  if (flightIds.size === 0) return state;
  const batches = state.batches.filter(batch => !flightIds.has(batch.flightId));
  return { ...state, queue: totalBatchCount(batches), batches };
}

function totalBatchCount(batches: PassengerBatch[]): number {
  return batches.reduce((sum, batch) => sum + batch.count, 0);
}
