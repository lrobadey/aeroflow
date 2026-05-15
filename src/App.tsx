/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plane,
  ShieldCheck,
  Coffee,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Plus,
  Minus,
  Database,
  Briefcase,
  Activity,
  Cpu,
  RefreshCw,
  Play,
  Pause as PauseIcon,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { REVENUE_PER_PASSENGER, TICK_RATE_MS, UPGRADE_COSTS } from './constants';
import { ActionType } from './types';
import { step, getQueueState, mutateQueueState } from './sim/engine';
import { formatTickTime } from './sim/schedule';
import { initialWorld } from './sim/world';
import { AircraftType, Flight, FlightStatus, QueueState, World } from './sim/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ENGINE_CONFIG = { exitRevenue: REVENUE_PER_PASSENGER };

export default function App() {
  const [world, setWorld] = useState<World>(() => initialWorld());
  const [isPaused, setIsPaused] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'departures' | 'terminal' | 'manage'>('departures');

  const queueNodes = useMemo<QueueState[]>(
    () => world.systems.filter(s => s.kind === 'queue').map(s => s.state as QueueState),
    [world.systems],
  );
  const nodeById = useMemo<Record<string, QueueState>>(() => {
    const m: Record<string, QueueState> = {};
    for (const n of queueNodes) m[n.id] = n;
    return m;
  }, [queueNodes]);

  const runTick = useCallback(() => {
    setWorld(prev => step(prev, ENGINE_CONFIG));
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(runTick, TICK_RATE_MS);
    return () => clearInterval(interval);
  }, [isPaused, runTick]);

  const handleAction = (action: ActionType) => {
    setWorld(prev => {
      const node = getQueueState(prev, action.nodeId);
      if (!node) return prev;

      switch (action.type) {
        case 'HIRE_STAFF':
          if (prev.funds < UPGRADE_COSTS.STAFF) return prev;
          return {
            ...mutateQueueState(prev, action.nodeId, s => ({ ...s, staff: s.staff + 1 })),
            funds: prev.funds - UPGRADE_COSTS.STAFF,
            alerts: [
              { msg: `STAFF DEPLOYED TO ${node.name.toUpperCase()}`, type: 'info', tick: prev.tick },
              ...prev.alerts,
            ].slice(0, 5),
          };
        case 'FIRE_STAFF':
          if (node.staff <= 0) return prev;
          return mutateQueueState(prev, action.nodeId, s => ({ ...s, staff: s.staff - 1 }));
        case 'UPGRADE_CAPACITY':
          if (prev.funds < UPGRADE_COSTS.CAPACITY) return prev;
          return {
            ...mutateQueueState(prev, action.nodeId, s => ({ ...s, capacity: s.capacity + 10 })),
            funds: prev.funds - UPGRADE_COSTS.CAPACITY,
            alerts: [
              { msg: `INFRASTRUCTURE EXPANDED: ${node.name.toUpperCase()}`, type: 'info', tick: prev.tick },
              ...prev.alerts,
            ].slice(0, 5),
          };
        default: {
          const exhaustive: never = action;
          return exhaustive;
        }
      }
    });
  };

  const lounge = nodeById['lounge'];
  const inflowThrottle = world.emergence.policy.inflowThrottle;
  const bottleneckFact = world.emergence.facts.find(f => f.kind === 'bottleneck');
  const activeFlights = world.flights.filter(flight => flight.status !== 'departed' && flight.status !== 'cancelled');
  const departedFlights = world.flights.filter(flight => flight.status === 'departed');
  const delayedFlights = world.flights.filter(flight => flight.status === 'delayed');
  const missedPassengers = world.flights.reduce((sum, flight) => sum + flight.missedPassengers, 0);
  const onTimeDepartures = departedFlights.filter(
    flight => (flight.actualDepartureTick ?? flight.scheduledDepartureTick) <= flight.scheduledDepartureTick,
  ).length;
  const onTimeRate = departedFlights.length > 0 ? onTimeDepartures / departedFlights.length : 1;
  const upcomingFlights = activeFlights
    .slice()
    .sort((a, b) => a.scheduledDepartureTick - b.scheduledDepartureTick)
    .slice(0, 6);
  const boardingFlights = activeFlights.filter(
    flight => flight.status === 'boarding' || flight.status === 'delayed',
  );
  const allActiveFlightsSorted = activeFlights
    .slice()
    .sort((a, b) => a.scheduledDepartureTick - b.scheduledDepartureTick);
  const hasDelayedFlights = delayedFlights.length > 0;
  const hasBottleneckOrHint =
    bottleneckFact !== undefined ||
    Object.values(world.emergence.policy.staffingHints).some(v => (v as number) > 0);

  return (
    <div className="w-full max-w-full flex flex-col h-[100dvh] bg-surface-950 text-slate-200 overflow-hidden font-sans border-2 border-surface-800">
      <header className="flex flex-col justify-between gap-3 px-3 sm:px-5 py-3 bg-surface-800 border-b border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-brand rounded flex items-center justify-center font-bold text-white shadow-lg shadow-brand/20">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight uppercase flex items-center gap-2">
              AeroFlow <span className="hidden sm:inline text-slate-500 font-mono text-[10px] font-normal border-l border-slate-700 pl-2">DEPARTURES SIM</span>
            </h1>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
              ORD terminal ops
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 md:grid-cols-4 items-center gap-2 w-full">
          <StatBox label="Balance" value={`$${world.funds.toLocaleString()}`} color="text-brand-accent" />
          <StatBox label="Sat" value={`${(world.overallSatisfaction * 100).toFixed(0)}%`} color={world.overallSatisfaction < 0.4 ? 'text-red-500' : 'text-brand-accent'} />
          <StatBox label="Boarded" value={world.totalPassengersProcessed.toLocaleString()} color="text-brand" />
          <StatBox label="Delayed" value={delayedFlights.length.toString()} color={delayedFlights.length > 0 ? 'text-brand-warn' : 'text-slate-300'} />

          {/* Mobile: compact icon-only Pause/Run in 5th column */}
          <div className="flex md:hidden flex-col gap-1 items-end">
            <button
              onClick={() => setIsPaused(true)}
              className={cn(
                'p-2 rounded transition-all',
                isPaused ? 'bg-brand text-white' : 'bg-surface-700 text-slate-400',
              )}
              aria-label="Pause simulation"
            >
              <PauseIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPaused(false)}
              className={cn(
                'p-2 rounded transition-all',
                !isPaused ? 'bg-brand text-white' : 'bg-surface-700 text-slate-400',
              )}
              aria-label="Run simulation"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop: full-width Pause/Run row */}
          <div className="hidden md:flex col-span-4 gap-2 justify-end">
            <button
              onClick={() => setIsPaused(true)}
              className={cn(
                'px-3 py-2 rounded text-[10px] font-bold transition-all uppercase flex items-center gap-2',
                isPaused ? 'bg-brand text-white' : 'bg-surface-700 hover:bg-surface-600 text-slate-300',
              )}
            >
              <PauseIcon className="w-3 h-3" /> Pause
            </button>
            <button
              onClick={() => setIsPaused(false)}
              className={cn(
                'px-3 py-2 rounded text-[10px] font-bold transition-all uppercase flex items-center gap-2',
                !isPaused ? 'bg-brand text-white' : 'bg-surface-700 hover:bg-surface-600 text-slate-300',
              )}
            >
              <Play className="w-3 h-3" /> Run
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* ── Desktop layout (md+) ── unchanged from original */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden min-h-0">
          <aside className="hidden 2xl:flex w-56 bg-surface-900 border-r border-white/5 p-4 flex-col gap-5 overflow-y-auto custom-scrollbar">
            <section>
              <SectionHeader title="Infrastructure Health" icon={<Activity className="w-3 h-3" />} />
              <div className="space-y-4 mt-4">
                <HealthItem label="System Stability" value={world.overallSatisfaction * 100} color="bg-brand-accent" />
                <HealthItem label="On-Time Rate" value={onTimeRate * 100} color="bg-brand-accent" />
                <HealthItem
                  label="Terminal Space"
                  value={lounge ? Math.max(0, 100 - (lounge.queue / lounge.capacity) * 100) : 0}
                  color="bg-brand"
                />
                <HealthItem label="Demand Gate" value={inflowThrottle * 100} color="bg-blue-400" />
              </div>
            </section>

            <section className="flex-1 flex flex-col border-t border-white/5 pt-4">
              <SectionHeader title="Alert Protocol" icon={<Cpu className="w-3 h-3" />} />
              <div className="mt-4 flex-1 space-y-2 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-surface-900 to-transparent z-10"></div>
                <div className="space-y-3 pt-2">
                  <AnimatePresence initial={false}>
                    {world.alerts.map((alert, i) => (
                      <motion.div
                        key={`${alert.tick}-${i}`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className={cn(
                          'text-[10px] font-mono leading-tight border-l-2 pl-2 py-0.5',
                          alert.type === 'crit'
                            ? 'text-red-500 border-red-500'
                            : alert.type === 'warn'
                              ? 'text-brand-warn border-brand-warn'
                              : 'text-slate-400 border-slate-600',
                        )}
                      >
                        <span className="opacity-50">[{alert.type.toUpperCase()}]</span> {alert.msg}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </aside>

          <div className="flex-1 flex flex-col gap-0 bg-surface-950 relative overflow-hidden min-h-[520px]">
            <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none"></div>

            <div className="flex-1 relative flex flex-col items-center justify-center p-3 sm:p-5">
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 items-center px-0 sm:px-8 gap-4 max-w-3xl pb-2">
                <FlowPoint
                  name="Check-in"
                  count={nodeById['checkIn']?.queue ?? 0}
                  isBottleneck={bottleneckFact?.at === 'checkIn'}
                  icon={<Database />}
                  color="brand"
                />
                <FlowConnector active={(nodeById['checkIn']?.queue ?? 0) > 0 && !isPaused} />
                <FlowPoint
                  name="Security"
                  count={nodeById['security']?.queue ?? 0}
                  isBottleneck={bottleneckFact?.at === 'security'}
                  icon={<ShieldCheck />}
                  color="blue"
                />
                <FlowConnector active={(nodeById['security']?.queue ?? 0) > 0 && !isPaused} />
                <FlowPoint
                  name="Lounge"
                  count={nodeById['lounge']?.queue ?? 0}
                  isBottleneck={bottleneckFact?.at === 'lounge'}
                  icon={<Coffee />}
                  color="amber"
                />
                <FlowConnector active={(nodeById['lounge']?.queue ?? 0) > 0 && !isPaused} />
                <FlowPoint
                  name="Boarding"
                  count={nodeById['boarding']?.queue ?? 0}
                  isBottleneck={bottleneckFact?.at === 'boarding'}
                  icon={<LogOut />}
                  color="emerald"
                />
              </div>

              <div className="mt-6 text-[9px] font-mono text-slate-600 uppercase tracking-[0.24em] flex items-center gap-2">
                <RefreshCw className={cn('w-3 h-3', !isPaused && 'animate-spin')} /> Live terminal flow
              </div>

              <FlightBoard
                flights={upcomingFlights}
                activeBoarding={boardingFlights}
                aircraftTypes={world.aircraftTypes}
                missedPassengers={missedPassengers}
              />
            </div>

            <div className="hidden lg:block h-52 bg-surface-900 border-t border-white/5 p-4 relative">
              <SectionHeader title="Throughput Analytics" icon={<TrendingUp className="w-3 h-3" />} />
              <div className="absolute top-6 right-6 flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand"></div>
                  <span className="text-[9px] font-mono uppercase text-slate-500">Check-in</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-accent"></div>
                  <span className="text-[9px] font-mono uppercase text-slate-500">Satisfaction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-warn"></div>
                  <span className="text-[9px] font-mono uppercase text-slate-500">Inflow Throttle</span>
                </div>
              </div>

              <div className="flex-1 h-32 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={world.history}>
                    <defs>
                      <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="tick" hide />
                    <YAxis stroke="#ffffff20" fontSize={9} fontStyle="mono" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', fontSize: '9px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area type="monotone" dataKey="queues.checkIn" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMain)" />
                    <Area type="monotone" dataKey={(d) => d.satisfaction * 100} name="Satisfaction" stroke="#10b981" strokeWidth={2} fill="none" />
                    <Area type="monotone" dataKey={(d) => d.inflowThrottle * 100} name="Inflow" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <aside className="w-full bg-surface-900 border-t border-white/5 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5 bg-surface-800">
              <SectionHeader title="System Nodes" icon={<Briefcase className="w-3 h-3" />} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 sm:p-3">
              {queueNodes.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  funds={world.funds}
                  onAction={handleAction}
                  staffingHint={world.emergence.policy.staffingHints[node.id] ?? 0}
                  isBottleneck={bottleneckFact?.at === node.id}
                />
              ))}
            </div>
            <div className="px-3 py-2 bg-surface-800 border-t border-white/5">
              <div className="text-[8px] font-mono text-slate-500 uppercase mb-1.5 text-center">
                Inflow Gate: {(inflowThrottle * 100).toFixed(0)}%
              </div>
              <button
                disabled={world.funds < 10000}
                className="w-full py-1.5 bg-brand hover:bg-blue-500 disabled:opacity-20 rounded text-[8px] font-bold text-white transition-all uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-[0.98]"
              >
                Auto-balance
              </button>
            </div>
          </aside>
        </div>

        {/* ── Mobile layout (<md) ── 3-tab bottom navigation */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden min-h-0">

          {/* Departures tab */}
          {activeMobileTab === 'departures' && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-800 border-b border-white/5 shrink-0">
                <SectionHeader title="Departures" icon={<Plane className="w-3 h-3" />} />
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {boardingFlights.length > 0 && (
                    <span className="bg-brand/15 text-brand border border-brand/30 px-2 py-0.5 rounded-full text-[8px] font-mono uppercase">
                      {boardingFlights.length} Boarding
                    </span>
                  )}
                  {delayedFlights.length > 0 && (
                    <span className="bg-brand-warn/15 text-brand-warn border border-brand-warn/30 px-2 py-0.5 rounded-full text-[8px] font-mono uppercase">
                      {delayedFlights.length} Delayed
                    </span>
                  )}
                  {missedPassengers > 0 && (
                    <span className="bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[8px] font-mono uppercase">
                      {missedPassengers} Missed
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[52px_64px_minmax(0,1fr)_64px] gap-2 px-4 py-2 text-[8px] font-mono uppercase tracking-widest text-slate-600 border-b border-white/5 bg-surface-900/40 shrink-0">
                <span>Time</span>
                <span>Flight</span>
                <span>Destination</span>
                <span>Status</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {allActiveFlightsSorted.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-[10px] font-mono text-slate-600 uppercase">
                    No active flights
                  </div>
                ) : (
                  allActiveFlightsSorted.map(flight => (
                    <MobileFlightRow
                      key={flight.id}
                      flight={flight}
                      aircraft={world.aircraftTypes[flight.aircraftTypeId]}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Terminal tab */}
          {activeMobileTab === 'terminal' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-6">
                <section>
                  <SectionHeader
                    title="Live Terminal Flow"
                    icon={<RefreshCw className={cn('w-3 h-3', !isPaused && 'animate-spin')} />}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MobileFlowPoint
                      name="Check-in"
                      count={nodeById['checkIn']?.queue ?? 0}
                      isBottleneck={bottleneckFact?.at === 'checkIn'}
                      icon={<Database className="w-7 h-7" />}
                      color="brand"
                    />
                    <MobileFlowPoint
                      name="Security"
                      count={nodeById['security']?.queue ?? 0}
                      isBottleneck={bottleneckFact?.at === 'security'}
                      icon={<ShieldCheck className="w-7 h-7" />}
                      color="blue"
                    />
                    <MobileFlowPoint
                      name="Lounge"
                      count={nodeById['lounge']?.queue ?? 0}
                      isBottleneck={bottleneckFact?.at === 'lounge'}
                      icon={<Coffee className="w-7 h-7" />}
                      color="amber"
                    />
                    <MobileFlowPoint
                      name="Boarding"
                      count={nodeById['boarding']?.queue ?? 0}
                      isBottleneck={bottleneckFact?.at === 'boarding'}
                      icon={<LogOut className="w-7 h-7" />}
                      color="emerald"
                    />
                  </div>
                </section>

                <section className="border-t border-white/5 pt-4">
                  <SectionHeader title="Infrastructure Health" icon={<Activity className="w-3 h-3" />} />
                  <div className="space-y-4 mt-4">
                    <HealthItem label="System Stability" value={world.overallSatisfaction * 100} color="bg-brand-accent" />
                    <HealthItem label="On-Time Rate" value={onTimeRate * 100} color="bg-brand-accent" />
                    <HealthItem
                      label="Terminal Space"
                      value={lounge ? Math.max(0, 100 - (lounge.queue / lounge.capacity) * 100) : 0}
                      color="bg-brand"
                    />
                    <HealthItem label="Demand Gate" value={inflowThrottle * 100} color="bg-blue-400" />
                  </div>
                </section>

                <section className="border-t border-white/5 pt-4">
                  <SectionHeader title="Alert Protocol" icon={<Cpu className="w-3 h-3" />} />
                  <div className="mt-3 space-y-2">
                    {world.alerts.length === 0 ? (
                      <div className="text-[10px] font-mono text-slate-600 uppercase">No alerts</div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {world.alerts.map((alert, i) => (
                          <motion.div
                            key={`${alert.tick}-${i}`}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className={cn(
                              'text-[10px] font-mono leading-tight border-l-2 pl-2 py-1',
                              alert.type === 'crit'
                                ? 'text-red-500 border-red-500'
                                : alert.type === 'warn'
                                  ? 'text-brand-warn border-brand-warn'
                                  : 'text-slate-400 border-slate-600',
                            )}
                          >
                            <span className="opacity-50">[{alert.type.toUpperCase()}]</span> {alert.msg}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </section>

                <section className="border-t border-white/5 pt-4 pb-4">
                  <SectionHeader title="Throughput Analytics" icon={<TrendingUp className="w-3 h-3" />} />
                  <div className="h-36 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={world.history}>
                        <defs>
                          <linearGradient id="colorMainMobile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="tick" hide />
                        <YAxis stroke="#ffffff20" fontSize={9} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', fontSize: '9px', fontFamily: 'monospace' }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Area type="monotone" dataKey="queues.checkIn" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMainMobile)" />
                        <Area type="monotone" dataKey={(d) => d.satisfaction * 100} name="Satisfaction" stroke="#10b981" strokeWidth={2} fill="none" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Manage tab */}
          {activeMobileTab === 'manage' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-4 bg-surface-800 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[8px] font-mono uppercase text-slate-500 tracking-widest mb-1">Available Balance</div>
                    <div className="text-2xl font-bold font-mono text-brand-accent tabular-nums">
                      ${world.funds.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-[8px] font-mono text-slate-600 uppercase space-y-1">
                    <div>Staff hire: <span className="text-slate-400">$1,000</span></div>
                    <div>Capacity +10: <span className="text-slate-400">$5,000</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3">
                {queueNodes.map(node => (
                  <MobileNodeCard
                    key={node.id}
                    node={node}
                    funds={world.funds}
                    onAction={handleAction}
                    staffingHint={world.emergence.policy.staffingHints[node.id] ?? 0}
                    isBottleneck={bottleneckFact?.at === node.id}
                  />
                ))}
              </div>

              <div className="px-3 pb-6 pt-2">
                <div className="text-[8px] font-mono text-slate-500 uppercase mb-2 text-center">
                  Inflow Gate: {(inflowThrottle * 100).toFixed(0)}%
                </div>
                <button
                  disabled={world.funds < 10000}
                  className="w-full py-3 bg-brand hover:bg-blue-500 disabled:opacity-20 rounded text-xs font-bold text-white transition-all uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-[0.98] min-h-11"
                >
                  Auto-balance
                </button>
              </div>
            </div>
          )}

          <MobileTabBar
            active={activeMobileTab}
            onChange={setActiveMobileTab}
            hasDelayed={hasDelayedFlights}
            hasBottleneck={hasBottleneckOrHint}
          />
        </div>
      </main>

      <footer className="hidden md:flex h-8 bg-surface-800 border-t border-white/5 items-center px-4 justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
            <span className="text-brand-accent">CORE READY</span>
          </div>
          <span className="hidden md:inline text-slate-600">SIM TIME: {formatTickTime(world.tick)}</span>
          <span className="hidden lg:inline text-slate-600">SIGNALS: {world.signals.length}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TICK: {world.tick}</span>
          <span className="text-slate-500 uppercase">ACTIVE FLIGHTS: {activeFlights.length}</span>
          <span className="text-slate-500 uppercase">FACTS: {world.emergence.facts.length}</span>
        </div>
      </footer>

      <AnimatePresence>
        {world.overallSatisfaction < 0.15 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 pointer-events-none"
          >
            <div className="bg-surface-900 border border-red-500/50 shadow-2xl shadow-red-900/20 flex flex-col sm:flex-row items-center gap-4 p-4 pointer-events-auto rounded">
              <div className="bg-red-500/20 p-3 flex items-center justify-center rounded">
                <AlertTriangle className="w-8 h-8 animate-pulse text-red-500" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-bold uppercase tracking-tight text-white mt-1">System Breakdown</h2>
                <p className="text-[10px] font-mono opacity-80 mt-1 uppercase tracking-widest text-red-400">Passenger satisfaction critical. Operations failing.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                {!isPaused && (
                  <button
                    onClick={() => setIsPaused(true)}
                    className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-200 font-mono uppercase tracking-widest text-[9px] transition-colors border border-red-900 rounded font-bold"
                  >
                    Halt
                  </button>
                )}
                <button
                  onClick={() => setWorld(prev => ({ ...prev, funds: prev.funds + 50000, overallSatisfaction: 0.5 }))}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-[9px] transition-colors shadow-lg rounded"
                >
                  Inject $50k
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-start md:items-end min-w-12">
      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={cn('font-mono text-sm sm:text-base font-bold tabular-nums leading-none mt-1', color)}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-brand bg-brand/10 p-1 rounded-sm">{icon}</div>
      <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">{title}</h2>
    </div>
  );
}

function HealthItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{label}</span>
        <span className={cn('text-[10px] font-mono', value < 30 ? 'text-red-500' : 'text-emerald-400')}>{value.toFixed(0)}%</span>
      </div>
      <div className="w-full h-0.5 bg-surface-700 rounded-full overflow-hidden">
        <motion.div className={cn('h-full', color)} initial={{ width: 0 }} animate={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

interface FlightBoardProps {
  flights: Flight[];
  activeBoarding: Flight[];
  aircraftTypes: Record<string, AircraftType>;
  missedPassengers: number;
}

function FlightBoard({ flights, activeBoarding, aircraftTypes, missedPassengers }: FlightBoardProps) {
  return (
    <section className="w-full max-w-3xl mt-5 bg-surface-900/90 border border-white/5 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-surface-800/60">
        <SectionHeader title="Departures" icon={<Plane className="w-3 h-3" />} />
        <div className="flex items-center gap-3 text-[8px] font-mono uppercase text-slate-500">
          <span>{activeBoarding.length} boarding</span>
          <span>{missedPassengers} missed</span>
        </div>
      </div>

      <div className="grid grid-cols-[42px_56px_minmax(0,1fr)_58px] gap-2 px-3 py-1.5 text-[7px] font-mono uppercase tracking-widest text-slate-600 border-b border-white/5">
        <span>Time</span>
        <span>Flight</span>
        <span>Destination</span>
        <span>Status</span>
      </div>

      <div className="max-h-36 sm:max-h-44 overflow-y-auto custom-scrollbar">
        {flights.map(flight => (
          <FlightRow key={flight.id} flight={flight} aircraft={aircraftTypes[flight.aircraftTypeId]} />
        ))}
      </div>
    </section>
  );
}

function FlightRow({ flight, aircraft }: { key?: string; flight: Flight; aircraft?: AircraftType }) {
  const boardedPercent = Math.min(100, (flight.boardedPassengers / Math.max(1, flight.bookedPassengers)) * 100);
  const riskPercent = Math.round(flight.delayRisk * 100);
  const status = statusLabel(flight.status);

  return (
    <div className="grid grid-cols-[42px_56px_minmax(0,1fr)_58px] gap-2 items-center px-3 py-1.5 border-b border-white/5 bg-surface-900/40 hover:bg-surface-800/50 transition-colors">
      <span className="font-mono text-[10px] text-white tabular-nums">{formatTickTime(flight.scheduledDepartureTick)}</span>
      <span className="font-mono text-[10px] font-bold text-brand tabular-nums">{flight.flightNumber}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-slate-200 truncate uppercase">{flight.destination}</div>
        <div className="text-[8px] font-mono text-slate-600 truncate uppercase">
          Gate {flight.gateId} / {flight.boardedPassengers.toFixed(0)}/{flight.bookedPassengers} / risk {riskPercent}%
        </div>
      </div>
      <span className={cn('px-1.5 py-0.5 text-[7px] font-bold uppercase rounded-sm border text-center truncate', status.color)}>
        {status.label}
      </span>
      <div className="col-span-4 h-0.5 bg-surface-950 overflow-hidden">
        <div
          className={cn(
            'h-full',
            flight.status === 'delayed' ? 'bg-brand-warn' : flight.delayRisk > 0.6 ? 'bg-red-500' : 'bg-brand',
          )}
          style={{ width: `${boardedPercent}%` }}
        />
      </div>
    </div>
  );
}

function statusLabel(status: FlightStatus): { label: string; color: string } {
  switch (status) {
    case 'scheduled':
      return { label: 'Scheduled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
    case 'checkInOpen':
      return { label: 'Check-in', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    case 'boarding':
      return { label: 'Boarding', color: 'bg-brand/10 text-brand border-brand/40' };
    case 'delayed':
      return { label: 'Delayed', color: 'bg-brand-warn/10 text-brand-warn border-brand-warn/40' };
    case 'departed':
      return { label: 'Departed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/30' };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

interface NodeCardProps {
  node: QueueState;
  funds: number;
  onAction: (a: ActionType) => void;
  staffingHint: number;
  isBottleneck: boolean;
  key?: string | number;
}

function NodeCard({ node, funds, onAction, staffingHint, isBottleneck }: NodeCardProps) {
  const isOverCapacity = node.queue > node.capacity;

  return (
    <div
      className={cn(
        'bg-surface-800 px-2.5 py-2 border border-white/5 border-l-2 transition-all group',
        isBottleneck ? 'border-l-red-500' : isOverCapacity ? 'border-l-brand-warn' : 'border-l-brand',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-[11px] leading-tight text-white uppercase tracking-tight truncate">{node.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-[8px] font-mono uppercase text-slate-500">
            <span>Staff {node.staff}</span>
            <span>Cap {node.capacity}</span>
          </div>
        </div>
        <div
          className={cn(
            'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border',
            isOverCapacity ? 'bg-red-500/10 text-red-500 border-red-500/50' : 'bg-brand/10 text-brand border-brand/50',
          )}
        >
          {Math.floor(node.queue)}
        </div>
      </div>

      {staffingHint > 0 && (
        <div className="mt-1.5 text-[8px] font-mono text-brand-warn uppercase tracking-widest truncate">
          +{staffingHint} staff suggested
        </div>
      )}

      <div className="mt-2 grid grid-cols-3 gap-1">
        <button
          onClick={() => onAction({ type: 'FIRE_STAFF', nodeId: node.id })}
          className="min-h-8 rounded bg-surface-900/70 hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          aria-label={`Reduce staff at ${node.name}`}
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={() => onAction({ type: 'HIRE_STAFF', nodeId: node.id })}
          disabled={funds < UPGRADE_COSTS.STAFF}
          className="min-h-8 rounded bg-surface-900/70 hover:bg-brand/20 border border-white/5 text-brand disabled:opacity-30 transition-colors flex items-center justify-center"
          aria-label={`Add staff at ${node.name}`}
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={() => onAction({ type: 'UPGRADE_CAPACITY', nodeId: node.id })}
          disabled={funds < UPGRADE_COSTS.CAPACITY}
          className="min-h-8 rounded bg-surface-900/70 hover:bg-surface-700 disabled:opacity-25 border border-white/5 text-[8px] font-bold uppercase tracking-wide text-slate-400 hover:text-white transition-all"
        >
          Cap+
        </button>
      </div>
    </div>
  );
}

function FlowPoint({
  name,
  count,
  isBottleneck,
  icon,
  color,
}: {
  name: string;
  count: number;
  isBottleneck: boolean;
  icon: ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'border-brand text-brand shadow-brand/20',
    blue: 'border-blue-500 text-blue-500 shadow-blue-500/20',
    amber: 'border-amber-500 text-amber-500 shadow-amber-500/20',
    emerald: 'border-emerald-500 text-emerald-500 shadow-emerald-500/20',
  };

  return (
    <div className="flex flex-col items-center gap-3 relative z-10">
      <div
        className={cn(
          'w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex items-center justify-center bg-surface-900 transition-all duration-500 shadow-lg',
          isBottleneck ? 'border-red-500 text-red-500 shadow-red-500/40 animate-pulse' : colorMap[color],
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[9px] font-bold text-white uppercase tracking-tight">{name}</div>
        <div className="text-[9px] font-mono text-slate-500 font-bold tabular-nums mt-0.5">{Math.floor(count)} ACTIVE</div>
      </div>
    </div>
  );
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="hidden h-[1px] min-w-8 flex-1 bg-white/5 relative">
      {active && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '100%', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-brand blur-[1px]"
        />
      )}
    </div>
  );
}

// ── Mobile-only components ─────────────────────────────────────────────────────

function MobileFlightRow({ flight }: { key?: string; flight: Flight; aircraft?: AircraftType }) {
  const boardedPercent = Math.min(100, (flight.boardedPassengers / Math.max(1, flight.bookedPassengers)) * 100);
  const riskPercent = Math.round(flight.delayRisk * 100);
  const status = statusLabel(flight.status);

  return (
    <div className="grid grid-cols-[52px_64px_minmax(0,1fr)_64px] gap-2 items-center px-4 py-3 border-b border-white/5 bg-surface-900/40 active:bg-surface-800/60 transition-colors">
      <span className="font-mono text-xs text-white tabular-nums">{formatTickTime(flight.scheduledDepartureTick)}</span>
      <span className="font-mono text-xs font-bold text-brand tabular-nums">{flight.flightNumber}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-200 truncate uppercase">{flight.destination}</div>
        <div className="text-[9px] font-mono text-slate-500 truncate uppercase mt-0.5">
          Gate {flight.gateId} · {flight.boardedPassengers.toFixed(0)}/{flight.bookedPassengers} · risk {riskPercent}%
        </div>
      </div>
      <span className={cn('px-2 py-1 text-[8px] font-bold uppercase rounded border text-center', status.color)}>
        {status.label}
      </span>
      <div className="col-span-4 h-1 bg-surface-950 overflow-hidden -mx-4">
        <div
          className={cn(
            'h-full transition-all duration-500',
            flight.status === 'delayed' ? 'bg-brand-warn' : flight.delayRisk > 0.6 ? 'bg-red-500' : 'bg-brand',
          )}
          style={{ width: `${boardedPercent}%` }}
        />
      </div>
    </div>
  );
}

function MobileFlowPoint({
  name,
  count,
  isBottleneck,
  icon,
  color,
}: {
  name: string;
  count: number;
  isBottleneck: boolean;
  icon: ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'border-brand text-brand shadow-brand/20',
    blue: 'border-blue-500 text-blue-500 shadow-blue-500/20',
    amber: 'border-amber-500 text-amber-500 shadow-amber-500/20',
    emerald: 'border-emerald-500 text-emerald-500 shadow-emerald-500/20',
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-surface-900/60 border border-white/5 rounded-lg p-4">
      <div
        className={cn(
          'w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-surface-900 shadow-lg transition-all duration-500',
          isBottleneck ? 'border-red-500 text-red-500 shadow-red-500/40 animate-pulse' : colorMap[color],
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-white uppercase tracking-tight">{name}</div>
        <div className="text-sm font-mono font-bold tabular-nums text-slate-300 mt-0.5">{Math.floor(count)}</div>
        <div className="text-[8px] font-mono text-slate-600 uppercase mt-0.5">active</div>
      </div>
    </div>
  );
}

function MobileNodeCard({ node, funds, onAction, staffingHint, isBottleneck }: NodeCardProps) {
  const isOverCapacity = node.queue > node.capacity;
  const canHire = funds >= UPGRADE_COSTS.STAFF;
  const canUpgrade = funds >= UPGRADE_COSTS.CAPACITY;

  return (
    <div
      className={cn(
        'bg-surface-800 p-3 border border-white/5 border-l-2 flex flex-col gap-3',
        isBottleneck ? 'border-l-red-500' : isOverCapacity ? 'border-l-brand-warn' : 'border-l-brand',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <h3 className="font-bold text-xs text-white uppercase tracking-tight leading-tight truncate">{node.name}</h3>
          {isBottleneck && (
            <div className="text-[8px] font-mono text-red-400 uppercase mt-0.5">Bottleneck</div>
          )}
          {!isBottleneck && staffingHint > 0 && (
            <div className="text-[8px] font-mono text-brand-warn uppercase mt-0.5">+{staffingHint} suggested</div>
          )}
        </div>
        <div
          className={cn(
            'px-2 py-1 rounded text-xs font-mono font-bold border shrink-0',
            isOverCapacity ? 'bg-red-500/10 text-red-500 border-red-500/50' : 'bg-brand/10 text-brand border-brand/50',
          )}
        >
          {Math.floor(node.queue)}
        </div>
      </div>

      <div className="flex gap-2 text-[9px] font-mono text-slate-500 uppercase">
        <span>Staff: {node.staff}</span>
        <span>·</span>
        <span>Cap: {node.capacity}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => onAction({ type: 'FIRE_STAFF', nodeId: node.id })}
            disabled={node.staff <= 0}
            className="flex-1 min-h-11 rounded bg-surface-900/70 hover:bg-white/5 disabled:opacity-30 border border-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1"
            aria-label={`Remove staff at ${node.name}`}
          >
            <Minus className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase">Fire</span>
          </button>
          <button
            onClick={() => onAction({ type: 'HIRE_STAFF', nodeId: node.id })}
            disabled={!canHire}
            className={cn(
              'flex-1 min-h-11 rounded border transition-colors flex items-center justify-center gap-1',
              canHire
                ? 'bg-surface-900/70 hover:bg-brand/20 border-brand/30 text-brand'
                : 'bg-surface-900/70 border-white/5 text-brand opacity-30',
            )}
            aria-label={`Hire staff at ${node.name}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase">Hire</span>
          </button>
        </div>
        <button
          onClick={() => onAction({ type: 'UPGRADE_CAPACITY', nodeId: node.id })}
          disabled={!canUpgrade}
          className="w-full min-h-11 rounded bg-surface-900/70 hover:bg-surface-700 disabled:opacity-25 border border-white/5 text-[9px] font-bold uppercase tracking-wide text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
        >
          <span>Cap +10</span>
          <span className="text-slate-600 font-mono normal-case">$5k</span>
        </button>
      </div>
    </div>
  );
}

interface MobileTabBarProps {
  active: 'departures' | 'terminal' | 'manage';
  onChange: (tab: 'departures' | 'terminal' | 'manage') => void;
  hasDelayed: boolean;
  hasBottleneck: boolean;
}

function MobileTabBar({ active, onChange, hasDelayed, hasBottleneck }: MobileTabBarProps) {
  const tabs = [
    { id: 'departures' as const, label: 'Departures', icon: <Plane className="w-5 h-5" />, badge: hasDelayed ? 'amber' : null },
    { id: 'terminal' as const, label: 'Terminal', icon: <RefreshCw className="w-5 h-5" />, badge: null as string | null },
    { id: 'manage' as const, label: 'Manage', icon: <Briefcase className="w-5 h-5" />, badge: hasBottleneck ? 'red' : null },
  ];

  return (
    <nav className="shrink-0 flex bg-surface-800 border-t border-white/5 mobile-tab-bar-safe">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 relative transition-colors',
            active === tab.id ? 'text-brand' : 'text-slate-500',
          )}
          aria-label={tab.label}
          aria-pressed={active === tab.id}
        >
          {active === tab.id && (
            <div className="absolute top-0 inset-x-0 h-0.5 bg-brand" />
          )}
          <div className="relative">
            {tab.icon}
            {tab.badge && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full',
                  tab.badge === 'red' ? 'bg-red-500' : 'bg-brand-warn',
                )}
              />
            )}
          </div>
          <span
            className={cn(
              'text-[9px] font-bold uppercase tracking-widest',
              active === tab.id ? 'text-brand' : 'text-slate-600',
            )}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
