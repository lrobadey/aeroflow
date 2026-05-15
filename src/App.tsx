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
import { initialWorld } from './sim/world';
import { QueueState, World } from './sim/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ENGINE_CONFIG = { exitRevenue: REVENUE_PER_PASSENGER };

export default function App() {
  const [world, setWorld] = useState<World>(() => initialWorld());
  const [isPaused, setIsPaused] = useState(false);

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
        default:
          return prev;
      }
    });
  };

  const lounge = nodeById['lounge'];
  const inflowThrottle = world.emergence.policy.inflowThrottle;
  const bottleneckFact = world.emergence.facts.find(f => f.kind === 'bottleneck');

  return (
    <div className="flex flex-col h-screen bg-surface-950 text-slate-200 overflow-hidden font-sans border-4 border-surface-800">
      <header className="flex items-center justify-between px-6 py-4 bg-surface-800 border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand rounded flex items-center justify-center font-bold text-white shadow-lg shadow-brand/20">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase flex items-center gap-2">
              AeroFlow <span className="text-slate-500 font-mono text-xs font-normal border-l border-slate-700 pl-2">V-RC4 // LOGISTICS SIM</span>
            </h1>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
              Terminal Node: ORD-MAIN-SIM-01
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <StatBox label="Balance" value={`$${world.funds.toLocaleString()}`} color="text-brand-accent" />
          <StatBox label="Satisfaction" value={`${(world.overallSatisfaction * 100).toFixed(1)}%`} color={world.overallSatisfaction < 0.4 ? 'text-red-500' : 'text-brand-accent'} />
          <StatBox label="Processed" value={world.totalPassengersProcessed.toLocaleString()} color="text-brand" />
          <StatBox label="Inflow" value={`${(inflowThrottle * 100).toFixed(0)}%`} color={inflowThrottle < 0.7 ? 'text-brand-warn' : 'text-slate-300'} />

          <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(true)}
              className={cn(
                'px-4 py-2 rounded text-[10px] font-bold transition-all uppercase flex items-center gap-2',
                isPaused ? 'bg-brand text-white' : 'bg-surface-700 hover:bg-surface-600 text-slate-300',
              )}
            >
              <PauseIcon className="w-3 h-3" /> Standby
            </button>
            <button
              onClick={() => setIsPaused(false)}
              className={cn(
                'px-4 py-2 rounded text-[10px] font-bold transition-all uppercase flex items-center gap-2',
                !isPaused ? 'bg-brand text-white' : 'bg-surface-700 hover:bg-surface-600 text-slate-300',
              )}
            >
              <Play className="w-3 h-3" /> Execute
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-surface-900 border-r border-white/5 p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <section>
            <SectionHeader title="Infrastructure Health" icon={<Activity className="w-3 h-3" />} />
            <div className="space-y-4 mt-4">
              <HealthItem label="System Stability" value={world.overallSatisfaction * 100} color="bg-brand-accent" />
              <HealthItem
                label="Terminal Space"
                value={lounge ? Math.max(0, 100 - (lounge.queue / lounge.capacity) * 100) : 0}
                color="bg-brand"
              />
              <HealthItem label="Inflow Gate" value={inflowThrottle * 100} color="bg-blue-400" />
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

        <div className="flex-1 flex flex-col gap-0 bg-surface-950 relative overflow-hidden">
          <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none"></div>

          <div className="flex-1 relative flex flex-col items-center justify-center p-8">
            <div className="w-full flex justify-between items-center px-12 gap-8 max-w-4xl">
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

            <div className="mt-12 text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <RefreshCw className={cn('w-3 h-3', !isPaused && 'animate-spin')} /> Real-time stream sync active
            </div>
          </div>

          <div className="h-64 bg-surface-900 border-t border-white/5 p-6 relative">
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

        <aside className="w-80 bg-surface-900 border-l border-white/5 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-surface-800">
            <SectionHeader title="System Nodes" icon={<Briefcase className="w-3 h-3" />} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
          <div className="p-4 bg-surface-800 border-t border-white/5">
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-2 text-center">
              Inflow Gate: {(inflowThrottle * 100).toFixed(0)}%
            </div>
            <button
              disabled={world.funds < 10000}
              className="w-full py-3 bg-brand hover:bg-blue-500 disabled:opacity-20 rounded text-[10px] font-bold text-white transition-all uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-[0.98]"
            >
              Optimize Total Matrix
            </button>
          </div>
        </aside>
      </main>

      <footer className="h-8 bg-surface-800 border-t border-white/5 flex items-center px-4 justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
            <span className="text-brand-accent">CORE READY</span>
          </div>
          <span className="hidden md:inline text-slate-600">ID: ORD-TX-092-2291</span>
          <span className="hidden lg:inline text-slate-600">SIGNALS: {world.signals.length}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TICK: {world.tick}</span>
          <span className="text-slate-500 uppercase">FACTS: {world.emergence.facts.length}</span>
        </div>
      </footer>

      <AnimatePresence>
        {world.overallSatisfaction < 0.15 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 pointer-events-none"
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

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={cn('font-mono text-lg font-bold tabular-nums leading-none mt-1', color)}>{value}</span>
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
      <div className="flex justify-between mb-1.5">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{label}</span>
        <span className={cn('text-[10px] font-mono', value < 30 ? 'text-red-500' : 'text-emerald-400')}>{value.toFixed(0)}%</span>
      </div>
      <div className="w-full h-1 bg-surface-700 rounded-full overflow-hidden">
        <motion.div className={cn('h-full', color)} initial={{ width: 0 }} animate={{ width: `${value}%` }} />
      </div>
    </div>
  );
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
        'bg-surface-800 p-4 border border-white/5 border-l-4 transition-all group',
        isBottleneck ? 'border-l-red-500' : isOverCapacity ? 'border-l-brand-warn' : 'border-l-brand',
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Subsystem</div>
          <h3 className="font-bold text-sm text-white uppercase tracking-tight">{node.name}</h3>
        </div>
        <div
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-mono font-bold border',
            isOverCapacity ? 'bg-red-500/10 text-red-500 border-red-500/50' : 'bg-brand/10 text-brand border-brand/50',
          )}
        >
          {Math.floor(node.queue)} UNITS
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-950/50 p-2 border border-white/5">
          <div className="text-[8px] font-mono text-slate-600 uppercase mb-1 font-bold">Crew Units</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-slate-300">{node.staff}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onAction({ type: 'FIRE_STAFF', nodeId: node.id })}
                className="p-0.5 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onAction({ type: 'HIRE_STAFF', nodeId: node.id })}
                disabled={funds < UPGRADE_COSTS.STAFF}
                className="p-0.5 hover:bg-brand/20 rounded text-brand disabled:opacity-30 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        <div className="bg-surface-950/50 p-2 border border-white/5">
          <div className="text-[8px] font-mono text-slate-600 uppercase mb-1 font-bold">Cap Limit</div>
          <div className="font-mono text-xs text-slate-300">{node.capacity}</div>
        </div>
      </div>

      {staffingHint > 0 && (
        <div className="text-[9px] font-mono text-brand-warn uppercase mb-2 tracking-widest">
          ↗ Emergence suggests +{staffingHint} staff
        </div>
      )}

      <button
        onClick={() => onAction({ type: 'UPGRADE_CAPACITY', nodeId: node.id })}
        disabled={funds < UPGRADE_COSTS.CAPACITY}
        className="w-full py-2 bg-surface-700 hover:bg-surface-600 disabled:opacity-20 border border-white/10 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-white transition-all active:scale-[0.98]"
      >
        Expand Logic Core
      </button>
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
          'w-14 h-14 rounded-lg border-2 flex items-center justify-center bg-surface-900 transition-all duration-500 shadow-lg',
          isBottleneck ? 'border-red-500 text-red-500 shadow-red-500/40 animate-pulse' : colorMap[color],
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-white uppercase tracking-tight">{name}</div>
        <div className="text-[9px] font-mono text-slate-500 font-bold tabular-nums mt-0.5">{Math.floor(count)} ACTIVE</div>
      </div>
    </div>
  );
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="h-[1px] flex-1 bg-white/5 relative">
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
