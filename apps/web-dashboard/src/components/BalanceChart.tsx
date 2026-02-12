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
        <CartesianGrid strokeDasharray="4 4" stroke="var(--line-muted)" />
        <XAxis
          dataKey="day"
          stroke="var(--ink-muted)"
          fontSize={12}
          tickLine={false}
          label={{
            value: 'Day',
            position: 'insideBottomRight',
            offset: -5,
            fill: 'var(--ink-muted)',
          }}
        />
        <YAxis
          stroke="var(--ink-muted)"
          fontSize={12}
          tickLine={false}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--paper-solid)',
            border: '1px solid var(--ink-soft)',
            borderRadius: '10px',
            color: 'var(--ink)',
          }}
          formatter={(value: number, name: string) => [
            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            name,
          ]}
          labelFormatter={(label: number) => `Day ${label}`}
        />
        <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="var(--rust)"
          strokeWidth={2.2}
          dot={false}
          name="Balance"
        />
        <Line
          type="monotone"
          dataKey="nav"
          stroke="var(--terra-green)"
          strokeWidth={1.8}
          dot={false}
          name="NAV"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
