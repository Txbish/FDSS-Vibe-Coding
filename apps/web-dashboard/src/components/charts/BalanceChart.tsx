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

interface BalanceChartProps {
  snapshots: DailySnapshot[];
  branchSnapshots?: DailySnapshot[];
  collapseDay?: number | null;
}

export function BalanceChart({ snapshots, branchSnapshots, collapseDay }: BalanceChartProps) {
  const data = snapshots.map((s, i) => ({
    day: s.day,
    balance: Number(s.balance.toFixed(2)),
    nav: Number(s.assetNAV.toFixed(2)),
    ...(branchSnapshots?.[i]
      ? {
          branchBalance: Number(branchSnapshots[i].balance.toFixed(2)),
          branchNav: Number(branchSnapshots[i].assetNAV.toFixed(2)),
        }
      : {}),
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Balance & Net Asset Value</h3>
        <InfoTip
          title="Balance Trajectory"
          content="This chart shows your cash balance (solid line) and Net Asset Value (dashed line) over the simulation period. The NAV includes the value of all your assets converted to your base currency."
        />
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Track how your cash and total asset value evolve day by day
        {branchSnapshots && ' — orange lines show the what-if branch scenario'}
      </p>
      <div className="h-[320px] sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2a5a42" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2a5a42" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="branchGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c85228" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#c85228" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
              label={{
                value: 'Day',
                position: 'insideBottomRight',
                offset: -5,
                fontSize: 11,
                fill: '#7a756c',
              }}
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
                formatCurrency(value),
                name === 'balance'
                  ? 'Balance'
                  : name === 'nav'
                    ? 'Net Asset Value'
                    : name === 'branchBalance'
                      ? 'Branch Balance'
                      : name === 'branchNav'
                        ? 'Branch NAV'
                        : name,
              ]}
              labelFormatter={(day: number) => `Day ${day}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value: string) =>
                value === 'balance'
                  ? 'Balance'
                  : value === 'nav'
                    ? 'Net Asset Value'
                    : value === 'branchBalance'
                      ? 'Branch Balance'
                      : value === 'branchNav'
                        ? 'Branch NAV'
                        : value
              }
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            {collapseDay != null && (
              <ReferenceLine
                x={collapseDay}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'Collapse', fill: '#ef4444', fontSize: 11 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#2a5a42"
              strokeWidth={2}
              fill="url(#balanceGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#2a5a42' }}
            />
            <Area
              type="monotone"
              dataKey="nav"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="url(#navGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#3b82f6' }}
            />
            {branchSnapshots && (
              <>
                <Area
                  type="monotone"
                  dataKey="branchBalance"
                  stroke="#c85228"
                  strokeWidth={2}
                  fill="url(#branchGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#c85228' }}
                />
                <Area
                  type="monotone"
                  dataKey="branchNav"
                  stroke="#d4a044"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  fill="none"
                  dot={false}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
