/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEdge, SystemId } from './types';

export function downstreamOf(flows: FlowEdge[], id: SystemId): SystemId[] {
  return flows.filter(f => f.from === id).map(f => f.to);
}

export function upstreamOf(flows: FlowEdge[], id: SystemId): SystemId[] {
  return flows.filter(f => f.to === id).map(f => f.from);
}
