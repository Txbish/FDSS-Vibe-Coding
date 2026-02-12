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
} from 'recharts';
import { formatNumber } from '../../utils';
import { InfoTip } from '../InfoTip';

interface CreditScoreChartProps {
  snapshots: DailySnapshot[];
}

function getScoreColor(score: number): string {
  if (score >= 700) return '#22c55e';
  if (score >= 550) return '#f59e0b';
  return '#ef4444';
}

export function CreditScoreChart({ snapshots }: CreditScoreChartProps) {
  const data = snapshots.map((s) => ({
    day: s.day,
    creditScore: Number(s.creditScore.toFixed(0)),
  }));

  const lastScore = data[data.length - 1]?.creditScore ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">Credit Score</h3>
        <InfoTip
          title="Credit Score (0-850)"
          content="Your simulated credit score ranges from 0 to 850. Above 700 is considered 'Good' (green zone). 550-700 is 'Fair' (yellow zone). Below 550 is 'Poor' (red zone). The score is influenced by your debt-to-income ratio, payment history, and overall financial health."
        />
      </div>
      <p className="text-xs text-ink-muted mb-4">Simulated credit score trajectory (0-850 scale)</p>
      <div className="h-[250px]">
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
              domain={[0, 850]}
              tick={{ fontSize: 11, fill: '#7a756c' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e0d5' }}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#f8f6f1',
                border: '1px solid #e5e0d5',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatNumber(value), 'Credit Score']}
              labelFormatter={(day: number) => `Day ${day}`}
            />
            {/* Score zone reference lines */}
            <ReferenceLine y={700} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine y={550} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="creditScore"
              stroke={getScoreColor(lastScore)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-ink-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" /> Good (700+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" /> Fair (550-700)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-danger" /> Poor (&lt;550)
        </span>
      </div>
    </div>
  );
}
