/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SystemId = string;

export type AlertLevel = 'info' | 'warn' | 'crit';

export interface QueueState {
  id: SystemId;
  name: string;
  capacity: number;
  staff: number;
  processingRate: number;
  queue: number;
  satisfactionImpact: number;
}

export interface ArrivalState {
  id: SystemId;
  baseRate: number;
}

export type SignalKind = 'load' | 'pressure' | 'throughput' | 'starvation';

export interface Signal {
  source: SystemId;
  kind: SignalKind;
  value: number;
  tick: number;
}

export type FactKind =
  | 'bottleneck'
  | 'cascade'
  | 'oscillation'
  | 'starvation'
  | 'nominal';

export interface EmergenceFact {
  kind: FactKind;
  at?: SystemId;
  severity: number;
  message: string;
  tick: number;
  level: AlertLevel;
}

export interface Policy {
  inflowThrottle: number;
  staffingHints: Record<SystemId, number>;
}

export interface FlowEdge {
  from: SystemId;
  to: SystemId;
}

export interface StepContext<S> {
  state: S;
  inbox: number;
  tick: number;
  policy: Policy;
}

export interface StepResult<S> {
  state: S;
  outbox: number;
  signals: Signal[];
  revenue?: number;
  staffCost?: number;
}

export interface SystemInstance<S> {
  id: SystemId;
  kind: 'queue' | 'source' | 'sink';
  state: S;
  step: (ctx: StepContext<S>) => StepResult<S>;
}

export interface SimHistoryPoint {
  tick: number;
  funds: number;
  satisfaction: number;
  queues: Record<string, number>;
  inflowThrottle: number;
}

export interface AlertEntry {
  msg: string;
  type: AlertLevel;
  tick: number;
}

export interface World {
  tick: number;
  funds: number;
  totalPassengersProcessed: number;
  overallSatisfaction: number;
  systems: SystemInstance<any>[];
  flows: FlowEdge[];
  signals: Signal[];
  emergence: {
    facts: EmergenceFact[];
    policy: Policy;
  };
  history: SimHistoryPoint[];
  alerts: AlertEntry[];
}
