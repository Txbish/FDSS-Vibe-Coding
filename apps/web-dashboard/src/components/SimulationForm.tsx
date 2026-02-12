import { useState } from 'react';
import type {
  SimulationInput,
  Asset,
  Liability,
  TaxConfig,
  ExchangeRate,
} from '@future-wallet/shared-types';
import { v4Fallback } from '../utils';

interface SimulationFormProps {
  onSubmit: (input: SimulationInput) => void;
  onBranch?: (
    input: SimulationInput,
    branchDay: number,
    modified: Partial<SimulationInput>,
  ) => void;
  loading: boolean;
  hasResult?: boolean;
}

export function SimulationForm({ onSubmit, onBranch, loading, hasResult }: SimulationFormProps) {
  const [initialBalance, setInitialBalance] = useState(10000);
  const [horizonDays, setHorizonDays] = useState(365);
  const [seed, setSeed] = useState(42);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [incomeCurrency, setIncomeCurrency] = useState('USD');
  const [monthlyRent, setMonthlyRent] = useState(1500);
  const [dailyFood, setDailyFood] = useState(30);
  const [monteCarloRuns, setMonteCarloRuns] = useState(1);

  // Asset state
  const [showAssets, setShowAssets] = useState(false);
  const [assetName, setAssetName] = useState('Savings');
  const [assetValue, setAssetValue] = useState(5000);
  const [assetType, setAssetType] = useState<Asset['type']>('liquid');
  const [assetVolatility, setAssetVolatility] = useState(0);
  const [assetYield, setAssetYield] = useState(0.04);
  const [assetPenalty, setAssetPenalty] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Liability state
  const [showLiabilities, setShowLiabilities] = useState(false);
  const [liabilityName, setLiabilityName] = useState('Loan');
  const [liabilityPrincipal, setLiabilityPrincipal] = useState(10000);
  const [liabilityRate, setLiabilityRate] = useState(0.05);
  const [liabilityMinPayment, setLiabilityMinPayment] = useState(300);
  const [liabilityTerm, setLiabilityTerm] = useState(365);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);

  // Tax state
  const [showTax, setShowTax] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);

  // Exchange rate state
  const [showExchange, setShowExchange] = useState(false);
  const [exchangeFrom, setExchangeFrom] = useState('EUR');
  const [exchangeTo, setExchangeTo] = useState('USD');
  const [exchangeRateVal, setExchangeRateVal] = useState(1.1);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  // Branch state
  const [showBranch, setShowBranch] = useState(false);
  const [branchDay, setBranchDay] = useState(90);
  const [branchIncome, setBranchIncome] = useState(7000);

  const addAsset = () => {
    setAssets([
      ...assets,
      {
        id: v4Fallback(),
        name: assetName,
        type: assetType,
        value: assetValue,
        currency: baseCurrency,
        volatility: assetVolatility,
        yieldRate: assetYield,
        liquidationPenalty: assetPenalty,
        locked: false,
      },
    ]);
    setAssetName('Savings');
    setAssetValue(5000);
  };

  const addLiability = () => {
    setLiabilities([
      ...liabilities,
      {
        id: v4Fallback(),
        name: liabilityName,
        principal: liabilityPrincipal,
        interestRate: liabilityRate,
        currency: baseCurrency,
        minimumPayment: liabilityMinPayment,
        remainingTermDays: liabilityTerm,
      },
    ]);
    setLiabilityName('Loan');
    setLiabilityPrincipal(10000);
  };

  const addExchangeRate = () => {
    setExchangeRates([
      ...exchangeRates,
      {
        from: exchangeFrom,
        to: exchangeTo,
        rate: exchangeRateVal,
        date: '2026-01-01',
        volatility: 0,
      },
    ]);
  };

  const buildInput = (): SimulationInput => {
    const taxConfig: TaxConfig | undefined = taxEnabled
      ? {
          brackets: [
            { upperBound: 10000, rate: 0.1 },
            { upperBound: 40000, rate: 0.12 },
            { upperBound: 85000, rate: 0.22 },
            { upperBound: 165000, rate: 0.24 },
            { upperBound: 215000, rate: 0.32 },
            { upperBound: 540000, rate: 0.35 },
          ],
          capitalGainsRate: 0.15,
          currency: baseCurrency,
        }
      : undefined;

    return {
      seed,
      horizonDays,
      baseCurrency,
      initialBalance,
      monteCarloConfig: { runs: monteCarloRuns, perturbationFactor: 0.05 },
      incomeStreams: [
        {
          id: v4Fallback(),
          name: 'Monthly Income',
          amount: monthlyIncome,
          currency: incomeCurrency,
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
      assets,
      liabilities,
      exchangeRates,
      taxConfig,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(buildInput());
  };

  const handleBranch = () => {
    if (!onBranch) return;
    const input = buildInput();
    onBranch(input, branchDay, {
      incomeStreams: [
        {
          id: v4Fallback(),
          name: 'Branch Income',
          amount: branchIncome,
          currency: incomeCurrency,
          recurrence: 'monthly',
          startDay: 0,
        },
      ],
    });
  };

  return (
    <form className={`form-section ${hasResult ? 'has-result' : ''}`} onSubmit={handleSubmit}>
      <h2>Simulation Parameters</h2>
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
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
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
          <label>Monthly Income</label>
          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Income Currency</label>
          <select value={incomeCurrency} onChange={(e) => setIncomeCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="PKR">PKR</option>
          </select>
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
        <div className="form-group">
          <label>Monte Carlo Runs</label>
          <input
            type="number"
            min={1}
            max={100}
            value={monteCarloRuns}
            onChange={(e) => setMonteCarloRuns(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Toggle panels */}
      <div className="form-toggles">
        <button
          type="button"
          className={`toggle-pill ${showTax ? 'active' : ''}`}
          onClick={() => setShowTax(!showTax)}
        >
          {showTax ? '−' : '+'} Taxation
        </button>
        <button
          type="button"
          className={`toggle-pill ${showAssets ? 'active' : ''}`}
          onClick={() => setShowAssets(!showAssets)}
        >
          {showAssets ? '−' : '+'} Assets
        </button>
        <button
          type="button"
          className={`toggle-pill ${showLiabilities ? 'active' : ''}`}
          onClick={() => setShowLiabilities(!showLiabilities)}
        >
          {showLiabilities ? '−' : '+'} Liabilities
        </button>
        <button
          type="button"
          className={`toggle-pill ${showExchange ? 'active' : ''}`}
          onClick={() => setShowExchange(!showExchange)}
        >
          {showExchange ? '−' : '+'} Exchange Rates
        </button>
        <button
          type="button"
          className={`toggle-pill ${showBranch ? 'active' : ''}`}
          onClick={() => setShowBranch(!showBranch)}
        >
          {showBranch ? '−' : '+'} What-If Branch
        </button>
      </div>

      {/* Tax Config */}
      {showTax && (
        <div className="form-panel">
          <h3>Tax Configuration</h3>
          <div
            className="form-group"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <label style={{ marginBottom: 0 }}>Enable US Tax Brackets</label>
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
            />
          </div>
          {taxEnabled && (
            <p className="form-hint">
              10% up to $10k · 12% up to $40k · 22% up to $85k · 24% up to $165k · 32% up to $215k ·
              35% up to $540k + 15% capital gains
            </p>
          )}
        </div>
      )}

      {/* Assets */}
      {showAssets && (
        <div className="form-panel">
          <h3>Assets ({assets.length})</h3>
          {assets.map((a, i) => (
            <div key={a.id} className="form-item-row">
              <span>
                {a.name}: ${a.value.toLocaleString()} ({a.type})
              </span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => setAssets(assets.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <div className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Value ($)</label>
              <input
                type="number"
                value={assetValue}
                onChange={(e) => setAssetValue(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as Asset['type'])}
              >
                <option value="liquid">Liquid</option>
                <option value="illiquid">Illiquid</option>
                <option value="yield_generating">Yield Generating</option>
                <option value="volatile">Volatile</option>
              </select>
            </div>
            <div className="form-group">
              <label>Volatility (0-1)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={assetVolatility}
                onChange={(e) => setAssetVolatility(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Yield Rate (annual)</label>
              <input
                type="number"
                step="0.01"
                value={assetYield}
                onChange={(e) => setAssetYield(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Liquidation Penalty</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={assetPenalty}
                onChange={(e) => setAssetPenalty(Number(e.target.value))}
              />
            </div>
          </div>
          <button type="button" className="add-btn" onClick={addAsset}>
            + Add Asset
          </button>
        </div>
      )}

      {/* Liabilities */}
      {showLiabilities && (
        <div className="form-panel">
          <h3>Liabilities ({liabilities.length})</h3>
          {liabilities.map((l, i) => (
            <div key={l.id} className="form-item-row">
              <span>
                {l.name}: ${l.principal.toLocaleString()} @ {(l.interestRate * 100).toFixed(1)}%
              </span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => setLiabilities(liabilities.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <div className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={liabilityName}
                onChange={(e) => setLiabilityName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Principal ($)</label>
              <input
                type="number"
                value={liabilityPrincipal}
                onChange={(e) => setLiabilityPrincipal(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Interest Rate (annual)</label>
              <input
                type="number"
                step="0.01"
                value={liabilityRate}
                onChange={(e) => setLiabilityRate(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Min. Payment (monthly)</label>
              <input
                type="number"
                value={liabilityMinPayment}
                onChange={(e) => setLiabilityMinPayment(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Term (days)</label>
              <input
                type="number"
                value={liabilityTerm}
                onChange={(e) => setLiabilityTerm(Number(e.target.value))}
              />
            </div>
          </div>
          <button type="button" className="add-btn" onClick={addLiability}>
            + Add Liability
          </button>
        </div>
      )}

      {/* Exchange Rates */}
      {showExchange && (
        <div className="form-panel">
          <h3>Exchange Rates ({exchangeRates.length})</h3>
          {exchangeRates.map((r, i) => (
            <div key={i} className="form-item-row">
              <span>
                {r.from} → {r.to}: {r.rate}
              </span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => setExchangeRates(exchangeRates.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <div className="form-grid">
            <div className="form-group">
              <label>From</label>
              <select value={exchangeFrom} onChange={(e) => setExchangeFrom(e.target.value)}>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="form-group">
              <label>To</label>
              <select value={exchangeTo} onChange={(e) => setExchangeTo(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rate</label>
              <input
                type="number"
                step="0.001"
                value={exchangeRateVal}
                onChange={(e) => setExchangeRateVal(Number(e.target.value))}
              />
            </div>
          </div>
          <button type="button" className="add-btn" onClick={addExchangeRate}>
            + Add Rate
          </button>
        </div>
      )}

      {/* Branch / What-If */}
      {showBranch && (
        <div className="form-panel">
          <h3>What-If Branch Scenario</h3>
          <p className="form-hint">
            Fork the simulation at a specific day with different income to see how the trajectory
            changes.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label>Branch at Day</label>
              <input
                type="number"
                min={1}
                max={horizonDays - 1}
                value={branchDay}
                onChange={(e) => setBranchDay(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Branch Monthly Income</label>
              <input
                type="number"
                value={branchIncome}
                onChange={(e) => setBranchIncome(Number(e.target.value))}
              />
            </div>
          </div>
          <button type="button" className="add-btn" onClick={handleBranch} disabled={loading}>
            {loading ? 'Running...' : 'Run What-If Branch'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>
    </form>
  );
}
