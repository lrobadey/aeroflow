/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueueState, Signal, StepContext, StepResult, SystemInstance } from '../types';

export function queueStage(initial: QueueState, staffCostPerTick: number): SystemInstance<QueueState> {
  return {
    id: initial.id,
    kind: 'queue',
    state: initial,
    step({ state, inbox, tick }: StepContext<QueueState>): StepResult<QueueState> {
      const queueAfterInbox = state.queue + inbox;
      const capacityProc = state.staff * state.processingRate;
      const processed = Math.min(queueAfterInbox, capacityProc);
      const nextQueue = queueAfterInbox - processed;

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
        state: { ...state, queue: nextQueue },
        outbox: processed,
        signals,
        staffCost: state.staff * staffCostPerTick,
      };
    },
  };
}
