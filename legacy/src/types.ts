/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AirportNode {
  id: string;
  name: string;
  capacity: number;
  staff: number;
  processingRate: number; // base passengers per tick
  queue: number;
  satisfactionImpact: number; // how much long queues hurt satisfaction
}

export interface SimulationState {
  tick: number;
  funds: number;
  totalPassengersProcessed: number;
  overallSatisfaction: number; // 0 to 1
  nodes: Record<string, AirportNode>;
  history: SimHistoryPoint[];
}

export interface SimHistoryPoint {
  tick: number;
  funds: number;
  satisfaction: number;
  queues: Record<string, number>;
}

export type ActionType = 
  | { type: 'HIRE_STAFF'; nodeId: string }
  | { type: 'FIRE_STAFF'; nodeId: string }
  | { type: 'UPGRADE_CAPACITY'; nodeId: string };
