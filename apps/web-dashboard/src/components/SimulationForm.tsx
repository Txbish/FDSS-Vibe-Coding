import { useState } from 'react';
import type { SimulationInput } from '@future-wallet/shared-types';
import { v4Fallback } from '../utils';

interface SimulationFormProps {
  onSubmit: (input: SimulationInput) => void;
  loading: boolean;
}

export function SimulationForm({ onSubmit, loading }: SimulationFormProps) {
  const [initialBalance, setInitialBalance] = useState(10000);
  const [horizonDays, setHorizonDays] = useState(365);
  const [seed, setSeed] = useState(42);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [monthlyRent, setMonthlyRent] = useState(1500);
  const [dailyFood, setDailyFood] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: SimulationInput = {
      seed,
      horizonDays,
      baseCurrency,
      initialBalance,
      incomeStreams: [
        {
          id: v4Fallback(),
          name: 'Monthly Income',
          amount: monthlyIncome,
          currency: baseCurrency,
          recurrence: 'monthly',
          startDay: 0,
        },
      ],
      expenses: [
        {
          id: v4Fallback(),
          name: 'Rent',
          amount: monthlyRent,
          currency: baseCurrency,
          recurrence: 'monthly',
          startDay: 0,
          essential: true,
        },
        {
          id: v4Fallback(),
          name: 'Food',
          amount: dailyFood,
          currency: baseCurrency,
          recurrence: 'daily',
          startDay: 0,
          essential: true,
        },
      ],
      assets: [],
      liabilities: [],
      exchangeRates: [],
    };

    onSubmit(input);
  };

  return (
    <form className="form-section" onSubmit={handleSubmit}>
      <h2>⚙️ Simulation Parameters</h2>
      <div className="form-grid">
        <div className="form-group">
          <label>Initial Balance ($)</label>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Horizon (days)</label>
          <input
            type="number"
            min={1}
            max={3650}
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Seed</label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Base Currency</label>
          <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="PKR">PKR</option>
          </select>
        </div>
        <div className="form-group">
          <label>Monthly Income ($)</label>
          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Monthly Rent ($)</label>
          <input
            type="number"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Daily Food ($)</label>
          <input
            type="number"
            value={dailyFood}
            onChange={(e) => setDailyFood(Number(e.target.value))}
          />
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? '⏳ Simulating…' : '🚀 Run Simulation'}
        </button>
      </div>
    </form>
  );
}
