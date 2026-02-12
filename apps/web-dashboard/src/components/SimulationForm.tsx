import { useState } from 'react';
import type {
  SimulationInput,
  Asset,
  Liability,
  TaxConfig,
  ExchangeRate,
  IncomeStream,
  Expense,
  Recurrence,
} from '@future-wallet/shared-types';
import { generateId } from '../utils';
import { InfoTip } from './InfoTip';
import { clsx } from 'clsx';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  CreditCard,
  Globe,
  Receipt,
  GitBranch,
  Settings,
  Play,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SimulationFormProps {
  onSubmit: (input: SimulationInput) => void;
  onBranch?: (base: SimulationInput, branchDay: number, modified: Partial<SimulationInput>) => void;
  loading: boolean;
  hasResult?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'once', label: 'One-time' },
];

const ASSET_TYPES = [
  { value: 'liquid' as const, label: 'Liquid (Cash, Savings)' },
  { value: 'illiquid' as const, label: 'Illiquid (Real Estate)' },
  { value: 'yield_generating' as const, label: 'Yield Generating (Bonds)' },
  { value: 'volatile' as const, label: 'Volatile (Stocks, Crypto)' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'NGN'];

const US_TAX_BRACKETS: TaxConfig = {
  brackets: [
    { upperBound: 11600, rate: 0.1 },
    { upperBound: 47150, rate: 0.12 },
    { upperBound: 100525, rate: 0.22 },
    { upperBound: 191950, rate: 0.24 },
    { upperBound: 243725, rate: 0.32 },
    { upperBound: 609350, rate: 0.35 },
  ],
  capitalGainsRate: 0.15,
  currency: 'USD',
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionToggle({
  label,
  open,
  onToggle,
  icon,
  badge,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-surface-alt hover:bg-paper-dark border border-border transition-all text-left group"
    >
      <span className="text-ink-muted group-hover:text-rust transition-colors">{icon}</span>
      <span className="text-sm font-medium text-ink flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[10px] font-bold bg-rust/10 text-rust px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      {open ? (
        <ChevronDown className="w-4 h-4 text-ink-muted" />
      ) : (
        <ChevronRight className="w-4 h-4 text-ink-muted" />
      )}
    </button>
  );
}

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <label className="flex items-center gap-1 text-xs font-medium text-ink-muted mb-1.5">
      {label}
      {tooltip && <InfoTip content={tooltip} />}
    </label>
  );
}

function Input({
  type = 'number',
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  className,
}: {
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={clsx(
        'w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink',
        'focus:outline-none focus:ring-2 focus:ring-rust/30 focus:border-rust/50',
        'placeholder:text-ink-muted/50 transition-all',
        className,
      )}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        'w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink',
        'focus:outline-none focus:ring-2 focus:ring-rust/30 focus:border-rust/50 transition-all',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Form                                                          */
/* ------------------------------------------------------------------ */

export function SimulationForm({ onSubmit, onBranch, loading, hasResult }: SimulationFormProps) {
  // Core
  const [initialBalance, setInitialBalance] = useState(10000);
  const [horizonDays, setHorizonDays] = useState(365);
  const [seed, setSeed] = useState(42);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [monteCarloRuns, setMonteCarloRuns] = useState(100);

  // Income streams
  const [incomes, setIncomes] = useState<IncomeStream[]>([
    {
      id: generateId(),
      name: 'Monthly Salary',
      amount: 5000,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
    },
  ]);

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: generateId(),
      name: 'Rent',
      amount: 1500,
      currency: 'USD',
      recurrence: 'monthly',
      startDay: 0,
      essential: true,
    },
    {
      id: generateId(),
      name: 'Food & Groceries',
      amount: 30,
      currency: 'USD',
      recurrence: 'daily',
      startDay: 0,
      essential: true,
    },
  ]);

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);

  // Liabilities
  const [liabilities, setLiabilities] = useState<Liability[]>([]);

  // Tax
  const [taxEnabled, setTaxEnabled] = useState(false);

  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  // Branch
  const [branchDay, setBranchDay] = useState(90);
  const [branchIncome, setBranchIncome] = useState(7000);

  // Section visibility
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    income: true,
    expenses: true,
    assets: false,
    liabilities: false,
    tax: false,
    exchange: false,
    branch: false,
    advanced: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ---- Build input ---- */
  function buildInput(): SimulationInput {
    const input: SimulationInput = {
      seed,
      horizonDays,
      baseCurrency,
      initialBalance,
      incomeStreams: incomes,
      expenses,
      assets,
      liabilities,
      exchangeRates,
    };

    if (monteCarloRuns > 1) {
      input.monteCarloConfig = { runs: monteCarloRuns, perturbationFactor: 0.05 };
    }

    if (taxEnabled) {
      input.taxConfig = { ...US_TAX_BRACKETS, currency: baseCurrency };
    }

    return input;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(buildInput());
  }

  function handleBranch() {
    if (!onBranch) return;
    const base = buildInput();
    const modified: Partial<SimulationInput> = {
      incomeStreams: incomes.map((inc) => ({
        ...inc,
        amount: branchIncome,
      })),
    };
    onBranch(base, branchDay, modified);
  }

  /* ---- Add/remove helpers ---- */
  function addIncome() {
    setIncomes((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        amount: 0,
        currency: baseCurrency,
        recurrence: 'monthly',
        startDay: 0,
      },
    ]);
  }

  function removeIncome(id: string) {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  }

  function updateIncome(id: string, field: keyof IncomeStream, value: string | number) {
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  function addExpense() {
    setExpenses((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        amount: 0,
        currency: baseCurrency,
        recurrence: 'monthly',
        startDay: 0,
        essential: false,
      },
    ]);
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExpense(id: string, field: keyof Expense, value: string | number | boolean) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function addAsset() {
    setAssets((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        type: 'liquid' as const,
        value: 0,
        currency: baseCurrency,
        volatility: 0,
        yieldRate: 0,
        liquidationPenalty: 0,
        locked: false,
      },
    ]);
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function updateAsset(id: string, field: string, value: string | number | boolean) {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }

  function addLiability() {
    setLiabilities((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        principal: 0,
        interestRate: 0.05,
        currency: baseCurrency,
        minimumPayment: 0,
        remainingTermDays: 365,
      },
    ]);
  }

  function removeLiability(id: string) {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLiability(id: string, field: string, value: string | number) {
    setLiabilities((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  function addExchangeRate() {
    setExchangeRates((prev) => [
      ...prev,
      { from: 'EUR', to: baseCurrency, rate: 1.1, date: '2026-01-01', volatility: 0 },
    ]);
  }

  function removeExchangeRate(idx: number) {
    setExchangeRates((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateExchangeRate(idx: number, field: string, value: string | number) {
    setExchangeRates((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ---- Core Parameters ---- */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-rust" />
          <h3 className="text-sm font-semibold text-ink">Core Parameters</h3>
          <InfoTip content="These are the basic settings for your simulation. The initial balance is your starting cash, and the horizon is how many days to simulate." />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <FieldLabel
              label="Initial Balance"
              tooltip="Starting cash balance in your base currency"
            />
            <Input
              value={initialBalance}
              onChange={(v) => setInitialBalance(Number(v))}
              min={0}
              step={100}
            />
          </div>
          <div>
            <FieldLabel
              label="Horizon (Days)"
              tooltip="Number of days to simulate (1-3650, up to 10 years)"
            />
            <Input
              value={horizonDays}
              onChange={(v) => setHorizonDays(Number(v))}
              min={1}
              max={3650}
            />
          </div>
          <div>
            <FieldLabel
              label="Base Currency"
              tooltip="All values will be reported in this currency"
            />
            <Select
              value={baseCurrency}
              onChange={setBaseCurrency}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <FieldLabel
              label="Seed"
              tooltip="Random seed for reproducibility. Same seed = same results every time."
            />
            <Input value={seed} onChange={(v) => setSeed(Number(v))} />
          </div>
        </div>
      </div>

      {/* ---- Income Streams ---- */}
      <div>
        <SectionToggle
          label="Income Streams"
          open={openSections.income}
          onToggle={() => toggleSection('income')}
          icon={<DollarSign className="w-4 h-4" />}
          badge={incomes.length}
        />
        {openSections.income && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <p className="text-xs text-ink-muted">
              Add your income sources. The simulation will credit these amounts to your balance
              based on the recurrence schedule.
            </p>
            {incomes.map((inc) => (
              <div
                key={inc.id}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end p-3 rounded-lg bg-surface-alt"
              >
                <div className="col-span-2 sm:col-span-1">
                  <FieldLabel label="Name" />
                  <Input
                    type="text"
                    value={inc.name}
                    onChange={(v) => updateIncome(inc.id, 'name', v)}
                    placeholder="e.g. Salary"
                  />
                </div>
                <div>
                  <FieldLabel label="Amount" />
                  <Input
                    value={inc.amount}
                    onChange={(v) => updateIncome(inc.id, 'amount', Number(v))}
                    min={0}
                  />
                </div>
                <div>
                  <FieldLabel label="Frequency" />
                  <Select
                    value={inc.recurrence}
                    onChange={(v) => updateIncome(inc.id, 'recurrence', v)}
                    options={RECURRENCE_OPTIONS}
                  />
                </div>
                <div>
                  <FieldLabel label="Currency" />
                  <Select
                    value={inc.currency}
                    onChange={(v) => updateIncome(inc.id, 'currency', v)}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeIncome(inc.id)}
                    className="p-2 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                    aria-label="Remove income"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addIncome}
              className="flex items-center gap-1.5 text-xs font-medium text-rust hover:text-rust-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Income Stream
            </button>
          </div>
        )}
      </div>

      {/* ---- Expenses ---- */}
      <div>
        <SectionToggle
          label="Expenses"
          open={openSections.expenses}
          onToggle={() => toggleSection('expenses')}
          icon={<Receipt className="w-4 h-4" />}
          badge={expenses.length}
        />
        {openSections.expenses && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <p className="text-xs text-ink-muted">
              Add your recurring expenses. Essential expenses are always paid first; non-essential
              ones may be skipped if cash runs low.
            </p>
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end p-3 rounded-lg bg-surface-alt"
              >
                <div className="col-span-2 sm:col-span-1">
                  <FieldLabel label="Name" />
                  <Input
                    type="text"
                    value={exp.name}
                    onChange={(v) => updateExpense(exp.id, 'name', v)}
                    placeholder="e.g. Rent"
                  />
                </div>
                <div>
                  <FieldLabel label="Amount" />
                  <Input
                    value={exp.amount}
                    onChange={(v) => updateExpense(exp.id, 'amount', Number(v))}
                    min={0}
                  />
                </div>
                <div>
                  <FieldLabel label="Frequency" />
                  <Select
                    value={exp.recurrence}
                    onChange={(v) => updateExpense(exp.id, 'recurrence', v)}
                    options={RECURRENCE_OPTIONS}
                  />
                </div>
                <div>
                  <FieldLabel label="Currency" />
                  <Select
                    value={exp.currency}
                    onChange={(v) => updateExpense(exp.id, 'currency', v)}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exp.essential}
                      onChange={(e) => updateExpense(exp.id, 'essential', e.target.checked)}
                      className="rounded border-border text-rust focus:ring-rust/30 w-4 h-4"
                    />
                    <span className="text-xs text-ink-muted">Essential</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeExpense(exp.id)}
                    className="p-2 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                    aria-label="Remove expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addExpense}
              className="flex items-center gap-1.5 text-xs font-medium text-rust hover:text-rust-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </button>
          </div>
        )}
      </div>

      {/* ---- Assets ---- */}
      <div>
        <SectionToggle
          label="Assets"
          open={openSections.assets}
          onToggle={() => toggleSection('assets')}
          icon={<TrendingUp className="w-4 h-4" />}
          badge={assets.length}
        />
        {openSections.assets && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <p className="text-xs text-ink-muted">
              Assets like stocks, bonds, or real estate. Volatile assets fluctuate daily.
              Yield-generating assets produce returns. Illiquid assets have a penalty when
              liquidated.
            </p>
            {assets.map((asset) => (
              <div key={asset.id} className="p-3 rounded-lg bg-surface-alt space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <FieldLabel label="Name" />
                    <Input
                      type="text"
                      value={asset.name}
                      onChange={(v) => updateAsset(asset.id, 'name', v)}
                      placeholder="e.g. AAPL Stock"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Type" />
                    <Select
                      value={asset.type}
                      onChange={(v) => updateAsset(asset.id, 'type', v)}
                      options={ASSET_TYPES}
                    />
                  </div>
                  <div>
                    <FieldLabel label="Value" tooltip="Current market value of this asset" />
                    <Input
                      value={asset.value}
                      onChange={(v) => updateAsset(asset.id, 'value', Number(v))}
                      min={0}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Volatility"
                      tooltip="Daily price volatility (0 = stable, 0.05 = moderate, 0.2 = very volatile)"
                    />
                    <Input
                      value={asset.volatility ?? 0}
                      onChange={(v) => updateAsset(asset.id, 'volatility', Number(v))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <FieldLabel
                      label="Annual Yield"
                      tooltip="Expected annual return rate (e.g. 0.05 = 5%)"
                    />
                    <Input
                      value={asset.yieldRate ?? 0}
                      onChange={(v) => updateAsset(asset.id, 'yieldRate', Number(v))}
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Liquidation Penalty"
                      tooltip="Fee charged when selling this asset (0 to 1)"
                    />
                    <Input
                      value={asset.liquidationPenalty ?? 0}
                      onChange={(v) => updateAsset(asset.id, 'liquidationPenalty', Number(v))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>
                  <div className="flex items-end col-span-2 justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={asset.locked ?? false}
                        onChange={(e) => updateAsset(asset.id, 'locked', e.target.checked)}
                        className="rounded border-border text-rust focus:ring-rust/30 w-4 h-4"
                      />
                      <span className="text-xs text-ink-muted">Locked (cannot liquidate)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      className="p-2 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                      aria-label="Remove asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addAsset}
              className="flex items-center gap-1.5 text-xs font-medium text-rust hover:text-rust-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </button>
          </div>
        )}
      </div>

      {/* ---- Liabilities ---- */}
      <div>
        <SectionToggle
          label="Liabilities"
          open={openSections.liabilities}
          onToggle={() => toggleSection('liabilities')}
          icon={<CreditCard className="w-4 h-4" />}
          badge={liabilities.length}
        />
        {openSections.liabilities && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <p className="text-xs text-ink-muted">
              Debts like loans, credit cards, or mortgages. Interest accrues daily. The simulation
              will make minimum payments automatically when cash is available.
            </p>
            {liabilities.map((liab) => (
              <div
                key={liab.id}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end p-3 rounded-lg bg-surface-alt"
              >
                <div>
                  <FieldLabel label="Name" />
                  <Input
                    type="text"
                    value={liab.name}
                    onChange={(v) => updateLiability(liab.id, 'name', v)}
                    placeholder="e.g. Car Loan"
                  />
                </div>
                <div>
                  <FieldLabel label="Principal" tooltip="Outstanding balance owed" />
                  <Input
                    value={liab.principal}
                    onChange={(v) => updateLiability(liab.id, 'principal', Number(v))}
                    min={0}
                  />
                </div>
                <div>
                  <FieldLabel
                    label="Interest Rate"
                    tooltip="Annual interest rate (e.g. 0.05 = 5%)"
                  />
                  <Input
                    value={liab.interestRate}
                    onChange={(v) => updateLiability(liab.id, 'interestRate', Number(v))}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
                <div>
                  <FieldLabel label="Min Payment" tooltip="Minimum payment per period" />
                  <Input
                    value={liab.minimumPayment}
                    onChange={(v) => updateLiability(liab.id, 'minimumPayment', Number(v))}
                    min={0}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FieldLabel label="Term (Days)" />
                    <Input
                      value={liab.remainingTermDays}
                      onChange={(v) => updateLiability(liab.id, 'remainingTermDays', Number(v))}
                      min={1}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLiability(liab.id)}
                    className="p-2 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                    aria-label="Remove liability"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addLiability}
              className="flex items-center gap-1.5 text-xs font-medium text-rust hover:text-rust-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Liability
            </button>
          </div>
        )}
      </div>

      {/* ---- Tax Configuration ---- */}
      <div>
        <SectionToggle
          label="Tax Configuration"
          open={openSections.tax}
          onToggle={() => toggleSection('tax')}
          icon={<Receipt className="w-4 h-4" />}
        />
        {openSections.tax && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <p className="text-xs text-ink-muted">
              Enable to apply US progressive tax brackets to income. Capital gains tax (15%) applies
              when assets are liquidated at a profit.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="rounded border-border text-rust focus:ring-rust/30 w-4 h-4"
              />
              <span className="text-sm font-medium text-ink">Enable US Tax Brackets</span>
            </label>
            {taxEnabled && (
              <div className="text-xs text-ink-muted space-y-1 bg-surface-alt p-3 rounded-lg">
                <p className="font-medium text-ink mb-1">Applied brackets:</p>
                {US_TAX_BRACKETS.brackets.map((b, i) => (
                  <p key={i}>
                    Up to ${b.upperBound.toLocaleString()} — {(b.rate * 100).toFixed(0)}%
                  </p>
                ))}
                <p className="mt-1">
                  Capital gains rate: {(US_TAX_BRACKETS.capitalGainsRate * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Exchange Rates ---- */}
      <div>
        <SectionToggle
          label="Exchange Rates"
          open={openSections.exchange}
          onToggle={() => toggleSection('exchange')}
          icon={<Globe className="w-4 h-4" />}
          badge={exchangeRates.length}
        />
        {openSections.exchange && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <p className="text-xs text-ink-muted">
              Define exchange rates for multi-currency scenarios. Required if any income, expense,
              or asset uses a different currency than your base currency.
            </p>
            {exchangeRates.map((rate, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end p-3 rounded-lg bg-surface-alt"
              >
                <div>
                  <FieldLabel label="From" />
                  <Select
                    value={rate.from}
                    onChange={(v) => updateExchangeRate(idx, 'from', v)}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>
                <div>
                  <FieldLabel label="To" />
                  <Select
                    value={rate.to}
                    onChange={(v) => updateExchangeRate(idx, 'to', v)}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>
                <div>
                  <FieldLabel label="Rate" />
                  <Input
                    value={rate.rate}
                    onChange={(v) => updateExchangeRate(idx, 'rate', Number(v))}
                    min={0}
                    step={0.001}
                  />
                </div>
                <div>
                  <FieldLabel
                    label="Volatility"
                    tooltip="Daily fluctuation factor (0 = fixed rate, 0.01 = 1% daily movement)"
                  />
                  <Input
                    value={rate.volatility ?? 0}
                    onChange={(v) => updateExchangeRate(idx, 'volatility', Number(v))}
                    min={0}
                    max={1}
                    step={0.001}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeExchangeRate(idx)}
                    className="p-2 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                    aria-label="Remove exchange rate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addExchangeRate}
              className="flex items-center gap-1.5 text-xs font-medium text-rust hover:text-rust-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Exchange Rate
            </button>
          </div>
        )}
      </div>

      {/* ---- Monte Carlo & Advanced ---- */}
      <div>
        <SectionToggle
          label="Advanced Settings"
          open={openSections.advanced}
          onToggle={() => toggleSection('advanced')}
          icon={<Settings className="w-4 h-4" />}
        />
        {openSections.advanced && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
            <div>
              <FieldLabel
                label="Monte Carlo Runs"
                tooltip="Number of simulations to run with slight random variations. More runs = more accurate probability estimates. 1 = single deterministic run (no confidence intervals)."
              />
              <Input
                value={monteCarloRuns}
                onChange={(v) => setMonteCarloRuns(Number(v))}
                min={1}
                max={1000}
              />
              <p className="text-[10px] text-ink-muted mt-1">
                {monteCarloRuns === 1
                  ? 'Single run — no confidence intervals'
                  : `${monteCarloRuns} runs — enables P5/P95 confidence intervals`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---- What-If Branch ---- */}
      {onBranch && (
        <div>
          <SectionToggle
            label="What-If Branch"
            open={openSections.branch}
            onToggle={() => toggleSection('branch')}
            icon={<GitBranch className="w-4 h-4" />}
          />
          {openSections.branch && (
            <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-4 animate-fade-in">
              <p className="text-xs text-ink-muted">
                Compare your baseline scenario with an alternative. For example: &quot;What if my
                income changed to $7,000/month starting day 90?&quot;
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel
                    label="Branch at Day"
                    tooltip="The day when the alternative scenario diverges from the baseline"
                  />
                  <Input
                    value={branchDay}
                    onChange={(v) => setBranchDay(Number(v))}
                    min={0}
                    max={horizonDays}
                  />
                </div>
                <div>
                  <FieldLabel
                    label="New Income Amount"
                    tooltip="The new income amount in the branch scenario"
                  />
                  <Input
                    value={branchIncome}
                    onChange={(v) => setBranchIncome(Number(v))}
                    min={0}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleBranch}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-terra text-white hover:bg-terra-light disabled:opacity-50 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                Run Branch Comparison
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- Submit ---- */}
      <button
        type="submit"
        disabled={loading}
        className={clsx(
          'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all',
          'bg-rust text-white hover:bg-rust-light shadow-sm hover:shadow-md',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <Play className="w-4 h-4" />
        {loading ? 'Running Simulation...' : hasResult ? 'Re-run Simulation' : 'Run Simulation'}
      </button>
    </form>
  );
}
