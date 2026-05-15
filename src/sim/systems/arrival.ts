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
    step({ state, tick, policy }: StepContext<ArrivalState>): StepResult<ArrivalState> {
      const variance = 0.8 + Math.random() * 0.4;
      const produced = Math.floor(state.baseRate * policy.inflowThrottle * variance);

      const signals: Signal[] = [
        { source: state.id, kind: 'throughput', value: produced, tick },
      ];

      return {
        state,
        outbox: produced,
        signals,
      };
    },
  };
}
