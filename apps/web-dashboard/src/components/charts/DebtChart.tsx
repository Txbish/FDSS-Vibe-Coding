import type { DailySnapshot } from '@future-wallet/shared-types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils';
import { InfoTip } from '../InfoTip';

interface DebtChartProps {
  snapshots: DailySnapshot[];
}

export function DebtChart({ snapshots }: DebtChartProps) {
  const data = snapshots.map((s) => ({
    day: s.day,
    totalDebt: Number(s.totalDebt.toFixed(2)),
  }));

  const hasDebt = data.some((d) => d.totalDebt > 0);
  if (!hasDebt) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Total Debt</h3>
        <InfoTip
          title="Debt Over Time"
          content="This shows your total outstanding debt across all liabilities. Debt accrues interest daily based on each liability's annual interest rate. The simulation makes minimum payments automatically when cash is available."
        />
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Outstanding debt trajectory including accrued interest
      </p>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
              tickFormatter={(v: number) => formatCurrency(v)}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#f8f6f1',
                border: '1px solid #e5e0d5',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Total Debt']}
              labelFormatter={(day: number) => `Day ${day}`}
            />
            <Area
              type="monotone"
              dataKey="totalDebt"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#debtGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
