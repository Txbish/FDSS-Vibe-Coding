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

interface TaxChartProps {
  snapshots: DailySnapshot[];
}

export function TaxChart({ snapshots }: TaxChartProps) {
  // Build cumulative tax data
  let cumTax = 0;
  let cumCapGains = 0;
  const data = snapshots.map((s) => {
    cumTax += s.taxPaid ?? 0;
    cumCapGains += s.capitalGainsTax ?? 0;
    return {
      day: s.day,
      cumulativeTax: Number(cumTax.toFixed(2)),
      cumulativeCapGains: Number(cumCapGains.toFixed(2)),
      cumulativeTotal: Number((cumTax + cumCapGains).toFixed(2)),
    };
  });

  const totalTax = data[data.length - 1]?.cumulativeTotal ?? 0;
  if (totalTax <= 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Tax Burden</h3>
        <InfoTip
          title="Cumulative Taxes"
          content="This shows the total taxes paid over the simulation period. Income tax is calculated using progressive tax brackets (each income range is taxed at a different rate). Capital gains tax applies when assets are liquidated at a profit."
        />
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Cumulative income tax and capital gains tax over time
      </p>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4a044" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#d4a044" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="capGainsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c85228" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#c85228" stopOpacity={0} />
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
                formatCurrency(value),
                name === 'cumulativeTax'
                  ? 'Income Tax'
                  : name === 'cumulativeCapGains'
                    ? 'Capital Gains Tax'
                    : 'Total Tax',
              ]}
              labelFormatter={(day: number) => `Day ${day}`}
            />
            <Area
              type="monotone"
              dataKey="cumulativeTax"
              stackId="tax"
              stroke="#d4a044"
              strokeWidth={1.5}
              fill="url(#taxGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="cumulativeCapGains"
              stackId="tax"
              stroke="#c85228"
              strokeWidth={1.5}
              fill="url(#capGainsGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
