/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrivalState, Signal, StepContext, StepResult, SystemInstance } from '../types';

export function arrivalSource(initial: ArrivalState): SystemInstance<ArrivalState> {
  return {
    id: initial.id,
    kind: 'source',
    state: initial,
    step({ state, tick }: StepContext<ArrivalState>): StepResult<ArrivalState> {
      const dueCohorts = state.cohorts.filter(
        cohort => cohort.status === 'waitingToArrive' && cohort.arrivalTick <= tick,
      );
      const outboxBatches = dueCohorts.map(cohort => ({
        cohortId: cohort.id,
        flightId: cohort.flightId,
        count: cohort.passengerCount,
      }));
      const produced = outboxBatches.reduce((sum, batch) => sum + batch.count, 0);

      const emittedIds = new Set(dueCohorts.map(cohort => cohort.id));
      const nextCohorts = state.cohorts.map(cohort =>
        emittedIds.has(cohort.id) ? { ...cohort, status: 'inTerminal' as const } : cohort,
      );

      const signals: Signal[] = [
        { source: state.id, kind: 'throughput', value: produced, tick },
      ];

      return {
        state: { ...state, cohorts: nextCohorts },
        outbox: produced,
        outboxBatches,
        signals,
      };
    },
  };
}
