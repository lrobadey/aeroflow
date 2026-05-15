/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PassengerBatch, QueueState, Signal, StepContext, StepResult, SystemInstance } from '../types';

export function queueStage(initial: QueueState, staffCostPerTick: number): SystemInstance<QueueState> {
  return {
    id: initial.id,
    kind: 'queue',
    state: initial,
    step({ state, inboundBatches, tick }: StepContext<QueueState>): StepResult<QueueState> {
      const queueBatches = compactBatches([...state.batches, ...inboundBatches]);
      const queueAfterInbox = totalBatchCount(queueBatches);
      const capacityProc = state.staff * state.processingRate;
      const processed = Math.min(queueAfterInbox, capacityProc);
      const { remaining, processed: outboxBatches } = drainBatches(queueBatches, processed);
      const nextQueue = totalBatchCount(remaining);

      const loadRatio = queueAfterInbox / Math.max(1, state.capacity);
      const pressure = Math.max(0, queueAfterInbox - state.capacity) / Math.max(1, state.capacity);
      const utilization = capacityProc > 0 ? processed / capacityProc : 0;
      const starvation = capacityProc > 0 && utilization < 0.2 ? 1 - utilization : 0;

      const signals: Signal[] = [
        { source: state.id, kind: 'load', value: loadRatio, tick },
        { source: state.id, kind: 'pressure', value: pressure, tick },
        { source: state.id, kind: 'throughput', value: processed, tick },
        { source: state.id, kind: 'starvation', value: starvation, tick },
      ];

      return {
        state: { ...state, queue: nextQueue, batches: remaining },
        outbox: processed,
        outboxBatches,
        signals,
        staffCost: state.staff * staffCostPerTick,
      };
    },
  };
}

function totalBatchCount(batches: PassengerBatch[]): number {
  return batches.reduce((sum, batch) => sum + batch.count, 0);
}

function compactBatches(batches: PassengerBatch[]): PassengerBatch[] {
  const byKey: Record<string, PassengerBatch> = {};
  for (const batch of batches) {
    if (batch.count <= 0) continue;
    const key = `${batch.cohortId}:${batch.flightId}`;
    const existing = byKey[key];
    byKey[key] = existing
      ? { ...existing, count: existing.count + batch.count }
      : { ...batch };
  }
  return Object.values(byKey);
}

function drainBatches(
  batches: PassengerBatch[],
  amount: number,
): { remaining: PassengerBatch[]; processed: PassengerBatch[] } {
  let remainingCapacity = amount;
  const remaining: PassengerBatch[] = [];
  const processed: PassengerBatch[] = [];

  for (const batch of batches) {
    if (remainingCapacity <= 0) {
      remaining.push(batch);
      continue;
    }

    const moved = Math.min(batch.count, remainingCapacity);
    processed.push({ ...batch, count: moved });
    remainingCapacity -= moved;

    const left = batch.count - moved;
    if (left > 0) remaining.push({ ...batch, count: left });
  }

  return { remaining: compactBatches(remaining), processed: compactBatches(processed) };
}
