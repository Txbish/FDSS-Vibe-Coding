import type { DailySnapshot } from '@future-wallet/shared-types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InfoTip } from '../InfoTip';

interface HealthIndicatorsChartProps {
  snapshots: DailySnapshot[];
}

export function HealthIndicatorsChart({ snapshots }: HealthIndicatorsChartProps) {
  const data = snapshots.map((s) => ({
    day: s.day,
    liquidityRatio: Number(Math.min(s.liquidityRatio, 5).toFixed(3)),
    shockResilience: Number(s.shockResilienceIndex.toFixed(1)),
  }));

  const maxDay = data[data.length - 1]?.day ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Financial Health Indicators</h3>
        <InfoTip
          title="Health Metrics"
          content={
            <div className="space-y-2">
              <p>
                <strong>Liquidity Ratio</strong> measures how easily you can cover short-term
                obligations. Above 1.0 means you have enough liquid assets to cover your debts.
                Below 1.0 means you might struggle to pay bills.
              </p>
              <p>
                <strong>Shock Resilience Index</strong> (0-100) measures how well your finances can
                absorb unexpected events. Higher is better — above 60 is resilient, below 30 is
                fragile.
              </p>
            </div>
          }
        />
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Two key health metrics tracked over the simulation period
      </p>

      {/* Split into two stacked charts for clarity (no dual-axis confusion) */}
      <div className="space-y-4">
        {/* Liquidity Ratio Chart */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-ink">Liquidity Ratio</span>
            <span className="text-[10px] text-ink-muted ml-auto">Target: above 1.0</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#7a756c' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e0d5' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#7a756c' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e0d5' }}
                  width={40}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#f8f6f1',
                    border: '1px solid #e5e0d5',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number) => [value.toFixed(2), 'Liquidity Ratio']}
                  labelFormatter={(day: number) => `Day ${day}`}
                />
                {/* Danger zone: below 1.0 */}
                <ReferenceArea y1={0} y2={1} x1={0} x2={maxDay} fill="#ef4444" fillOpacity={0.04} />
                <ReferenceLine
                  y={1}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: 'Healthy threshold',
                    position: 'insideTopLeft',
                    fontSize: 9,
                    fill: '#f59e0b',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="liquidityRatio"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#liquidityGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shock Resilience Chart */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span className="text-xs font-medium text-ink">Shock Resilience Index</span>
            <span className="text-[10px] text-ink-muted ml-auto">0 = fragile, 100 = resilient</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="resilienceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#7a756c' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e0d5' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#7a756c' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e0d5' }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#f8f6f1',
                    border: '1px solid #e5e0d5',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number) => [value.toFixed(0), 'Shock Resilience']}
                  labelFormatter={(day: number) => `Day ${day}`}
                />
                {/* Zone fills */}
                <ReferenceArea
                  y1={0}
                  y2={30}
                  x1={0}
                  x2={maxDay}
                  fill="#ef4444"
                  fillOpacity={0.05}
                />
                <ReferenceArea
                  y1={30}
                  y2={60}
                  x1={0}
                  x2={maxDay}
                  fill="#f59e0b"
                  fillOpacity={0.04}
                />
                <ReferenceArea
                  y1={60}
                  y2={100}
                  x1={0}
                  x2={maxDay}
                  fill="#22c55e"
                  fillOpacity={0.04}
                />
                <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
                <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Area
                  type="monotone"
                  dataKey="shockResilience"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#resilienceGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#8b5cf6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-ink-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" /> Strong (&gt;60)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" /> Moderate (30-60)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger" /> Fragile (&lt;30)
          </span>
        </div>
      </div>
    </div>
  );
}
