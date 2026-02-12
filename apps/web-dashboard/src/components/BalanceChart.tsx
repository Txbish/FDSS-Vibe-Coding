import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DailySnapshot } from '@future-wallet/shared-types';

interface BalanceChartProps {
  snapshots: DailySnapshot[];
}

export function BalanceChart({ snapshots }: BalanceChartProps) {
  const data = snapshots.map((s) => ({
    day: s.day,
    date: s.date,
    balance: Number(s.balance.toFixed(2)),
    creditScore: s.creditScore,
    nav: Number(s.assetNAV.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
        <XAxis
          dataKey="day"
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          label={{ value: 'Day', position: 'insideBottomRight', offset: -5, fill: '#71717a' }}
        />
        <YAxis
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1d27',
            border: '1px solid #2a2d3a',
            borderRadius: '8px',
            color: '#e4e4e7',
          }}
          formatter={(value: number, name: string) => [
            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            name,
          ]}
          labelFormatter={(label: number) => `Day ${label}`}
        />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          name="Balance"
        />
        <Line
          type="monotone"
          dataKey="nav"
          stroke="#22c55e"
          strokeWidth={1.5}
          dot={false}
          name="NAV"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
