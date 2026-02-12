import type { DailySnapshot } from '@future-wallet/shared-types';
import {
  Line,
  LineChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
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
        Liquidity ratio and shock resilience index over time
      </p>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
            />
            <YAxis
              yAxisId="liquidity"
              orientation="left"
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
              label={{
                value: 'Liquidity',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#7a756c',
              }}
              width={55}
            />
            <YAxis
              yAxisId="resilience"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
              label={{
                value: 'Resilience',
                angle: 90,
                position: 'insideRight',
                fontSize: 10,
                fill: '#7a756c',
              }}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#f8f6f1',
                border: '1px solid #e5e0d5',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => [
                name === 'liquidityRatio' ? value.toFixed(2) : value.toFixed(0),
                name === 'liquidityRatio' ? 'Liquidity Ratio' : 'Shock Resilience',
              ]}
              labelFormatter={(day: number) => `Day ${day}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value: string) =>
                value === 'liquidityRatio' ? 'Liquidity Ratio' : 'Shock Resilience'
              }
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px' }}
            />
            <ReferenceLine
              yAxisId="liquidity"
              y={1}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              yAxisId="resilience"
              y={60}
              stroke="#22c55e"
              strokeDasharray="4 4"
              strokeOpacity={0.3}
            />
            <ReferenceLine
              yAxisId="resilience"
              y={30}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.3}
            />
            <Line
              yAxisId="liquidity"
              type="monotone"
              dataKey="liquidityRatio"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#3b82f6' }}
            />
            <Line
              yAxisId="resilience"
              type="monotone"
              dataKey="shockResilience"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#8b5cf6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-ink-muted">
        <span>Liquidity &gt; 1.0 = Healthy</span>
        <span>Resilience &gt; 60 = Strong</span>
      </div>
    </div>
  );
}
