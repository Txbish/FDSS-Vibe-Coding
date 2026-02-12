import type { DailySnapshot } from '@future-wallet/shared-types';
import {
  Area,
  AreaChart,
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

export function CashFlowChart({ snapshots }: CashFlowChartProps) {
  const data = snapshots.map((s) => ({
    day: s.day,
    income: Number(s.totalIncome.toFixed(2)),
    expenses: Number((-s.totalExpenses).toFixed(2)),
    netCashFlow: Number(s.netCashFlow.toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Cash Flow</h3>
        <InfoTip
          title="Daily Cash Flow"
          content="Income (green) shows money coming in each day. Expenses (red) shows money going out. The blue line is the net cash flow — when it's above zero you're earning more than spending."
        />
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Daily income, expenses, and net cash flow over the simulation
      </p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
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
              formatter={(value: number, name: string) => [
                formatCurrency(Math.abs(value)),
                name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net Cash Flow',
              ]}
              labelFormatter={(day: number) => `Day ${day}`}
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
            <Area
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={1.5}
              fill="url(#incomeGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#expenseGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="netCashFlow"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={{ r: 3, fill: '#3b82f6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
