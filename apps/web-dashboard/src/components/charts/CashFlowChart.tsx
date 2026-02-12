import { useMemo, useState } from 'react';
import type { DailySnapshot } from '@future-wallet/shared-types';
import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { formatCurrency } from '../../utils';
import { InfoTip } from '../InfoTip';

interface CashFlowChartProps {
  snapshots: DailySnapshot[];
}

type AggMode = 'weekly' | 'biweekly' | 'monthly';

function aggregateSnapshots(snapshots: DailySnapshot[], mode: AggMode) {
  const bucketSize = mode === 'weekly' ? 7 : mode === 'biweekly' ? 14 : 30;
  const buckets: {
    label: string;
    day: number;
    income: number;
    expenses: number;
    netCashFlow: number;
  }[] = [];

  for (let i = 0; i < snapshots.length; i += bucketSize) {
    const slice = snapshots.slice(i, i + bucketSize);
    const totalIncome = slice.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalExpenses = slice.reduce((sum, s) => sum + s.totalExpenses, 0);
    const startDay = slice[0].day;
    const endDay = slice[slice.length - 1].day;

    buckets.push({
      label: slice.length > 1 ? `D${startDay}-${endDay}` : `D${startDay}`,
      day: startDay,
      income: Number(totalIncome.toFixed(2)),
      expenses: Number((-totalExpenses).toFixed(2)),
      netCashFlow: Number((totalIncome - totalExpenses).toFixed(2)),
    });
  }

  return buckets;
}

export function CashFlowChart({ snapshots }: CashFlowChartProps) {
  // Auto-select aggregation based on horizon length
  const defaultMode: AggMode =
    snapshots.length <= 60 ? 'weekly' : snapshots.length <= 180 ? 'biweekly' : 'monthly';
  const [mode, setMode] = useState<AggMode>(defaultMode);

  const data = useMemo(() => aggregateSnapshots(snapshots, mode), [snapshots, mode]);

  const modeLabel = mode === 'weekly' ? 'Weekly' : mode === 'biweekly' ? 'Bi-weekly' : 'Monthly';

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Cash Flow</h3>
        <InfoTip
          title="Cash Flow Analysis"
          content="Income (green bars) shows money coming in. Expenses (red bars) shows money going out. The blue line is the net cash flow — above zero means you earned more than you spent that period. Data is aggregated to reduce noise from daily spikes."
        />
        <div className="ml-auto flex items-center gap-1">
          {(['weekly', 'biweekly', 'monthly'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                mode === m
                  ? 'bg-rust/15 text-rust'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-alt'
              }`}
            >
              {m === 'weekly' ? '7d' : m === 'biweekly' ? '14d' : '30d'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {modeLabel} income, expenses, and net cash flow over the simulation
      </p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
              interval={Math.max(0, Math.floor(data.length / 10) - 1)}
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
              formatter={(value: number, name: string) => [
                formatCurrency(Math.abs(value)),
                name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net Cash Flow',
              ]}
              labelFormatter={(label: string) => label}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value: string) =>
                value === 'income' ? 'Income' : value === 'expenses' ? 'Expenses' : 'Net Cash Flow'
              }
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#7a756c" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Bar dataKey="income" fill="#22c55e" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" fill="#ef4444" fillOpacity={0.7} radius={[0, 0, 3, 3]} />
            <Line
              type="monotone"
              dataKey="netCashFlow"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#3b82f6' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
