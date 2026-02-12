# Future Wallet — Test Scenarios & Verification Guide

**Dashboard URL:** http://localhost:5173  
**API URL:** http://localhost:3001

---

## 🧪 Test Scenario 1: **Stable Financial Health** (Baseline)

### Input Parameters:

- **Initial Balance:** `10,000`
- **Horizon:** `365` days (1 year)
- **Seed:** `42`
- **Base Currency:** `USD`
- **Monthly Income:** `5,000`
- **Monthly Rent:** `1,500`
- **Daily Food:** `30`

### Expected Results:

- ✅ **Final Balance:** ~$31,500-$33,000 (positive growth)
- ✅ **Collapse Probability:** 0% (no deficits)
- ✅ **Credit Score:** ~650-700 (stable)
- ✅ **Vibe State:** Thriving 🌟 or Stable 😊
- ✅ **Pet State:** Happy 🐱 or Content 🐈
- ✅ **Liquidity Ratio:** High (no debt)
- ✅ **Balance Trajectory:** Steady upward slope

### What to Verify:

- Chart shows smooth upward trend
- No red (negative) sections on balance line
- Final balance = initial + (income - expenses) × periods

---

## 🔥 Test Scenario 2: **Financial Stress** (High Expenses)

### Input Parameters:

- **Initial Balance:** `5,000`
- **Horizon:** `180` days (6 months)
- **Seed:** `42`
- **Monthly Income:** `3,000`
- **Monthly Rent:** `2,500` ← **High rent eats most income**
- **Daily Food:** `50` ← **Expensive lifestyle**

### Expected Results:

- ⚠️ **Final Balance:** Likely negative (deficit)
- ⚠️ **Collapse Probability:** 50-100%
- ⚠️ **Collapse Day:** ~Day 60-90
- ⚠️ **Credit Score:** Declining (600-500 range)
- ⚠️ **Vibe State:** Strained 😰, Critical 🚨, or Collapsed 💀
- ⚠️ **Pet State:** Anxious 🙀, Distressed 😿, or Fainted 😵
- ⚠️ **Balance Trajectory:** Downward slope, crosses zero

### What to Verify:

- Chart crosses the red zero line
- "Collapse Probability" metric shows high %
- Credit score drops over time
- Vibe/Pet state indicators turn critical

---

## 📈 Test Scenario 3: **Wealth Accumulation** (High Income)

### Input Parameters:

- **Initial Balance:** `50,000`
- **Horizon:** `730` days (2 years)
- **Seed:** `99`
- **Monthly Income:** `15,000` ← **High earner**
- **Monthly Rent:** `2,000`
- **Daily Food:** `40`

### Expected Results:

- 🚀 **Final Balance:** $300,000+ (massive growth)
- ✅ **Collapse Probability:** 0%
- ✅ **Credit Score:** 700-850 (excellent)
- ✅ **Vibe State:** Thriving 🌟
- ✅ **Pet State:** Happy 🐱
- ✅ **Shock Resilience:** 80-100/100
- 🎯 **Balance Range (P5-P95):** Wide spread, all positive

### What to Verify:

- Steep upward trajectory
- Final balance >> initial balance
- All health indicators green/positive
- No negative balance events

---

## 🎲 Test Scenario 4: **Determinism Verification** (Same Seed = Same Result)

### Test Steps:

1. Run Scenario 1 with **Seed = 42**
2. Note the **exact final balance** (e.g., $32,450.78)
3. **Reload the page** (clear state)
4. Run again with **identical inputs** and **Seed = 42**
5. Compare final balances

### Expected Results:

- ✅ **Final balances must match to the cent** (bit-exact determinism)
- ✅ All snapshots identical day-by-day
- ✅ Credit scores match at every timestamp

### What to Verify:

- Copy final balance from first run
- Second run produces **exact same number**
- This proves the engine is deterministic per spec

---

## 🔄 Test Scenario 5: **Different Seeds = Different Volatility**

### Test Steps:

1. Run Scenario 1 with **Seed = 1**
2. Run Scenario 1 with **Seed = 999**
3. Compare final balances and trajectories

### Expected Results:

- ⚠️ Final balances will differ slightly
- ⚠️ Chart trajectories will have different micro-patterns
- ✅ Both should still be positive (same income/expense structure)

### What to Verify:

- Seed affects RNG-driven randomness (if volatility/shocks present)
- Different seeds = different paths (proves stochastic components work)

---

## 💸 Test Scenario 6: **Minimal Survival** (Tight Budget)

### Input Parameters:

- **Initial Balance:** `1,000`
- **Horizon:** `90` days (3 months)
- **Monthly Income:** `2,000`
- **Monthly Rent:** `1,500`
- **Daily Food:** `15`

### Expected Results:

- ⚠️ **Final Balance:** Close to zero or slightly negative
- ⚠️ **Collapse Probability:** 20-50%
- ⚠️ **Vibe State:** Strained 😰
- ⚠️ **Credit Score:** ~600-650
- ⚠️ **Balance Trajectory:** Hovering near zero line

### What to Verify:

- Balance stays barely positive or dips negative occasionally
- "Strained" status reflects the tight margins
- Demonstrates engine handles edge cases

---

## 🧮 Manual Calculation Verification

### Simple 30-Day Check:

**Inputs:**

- Initial: `$10,000`
- Income: `$3,000/month` (once at day 0)
- Rent: `$1,500/month` (once at day 0)
- Food: `$30/day` × 30 days = `$900`

**Expected Final Balance:**

```
$10,000 + $3,000 - $1,500 - $900 = $10,600
```

### Test Steps:

1. Set horizon to `30` days
2. Input above parameters
3. Check final balance ≈ `$10,600`

### What to Verify:

- Engine math matches manual calculation
- Confirms basic arithmetic is correct

---

## 🚨 Edge Cases to Test

### Test 7: **Zero Income** (Depletion)

- Income: `0`, Expenses: `1,000/month`, Initial: `5,000`
- Should deplete to zero in ~5 months
- Collapse probability: 100%

### Test 8: **Zero Expenses** (Pure Accumulation)

- Income: `5,000/month`, Expenses: `0`, Initial: `0`
- Should grow linearly: `$5k → $10k → $15k...`

### Test 9: **Very Long Horizon** (10 Years)

- Set horizon to `3,650` days
- Verify engine handles large simulations without crashing
- May take 2-3 seconds to compute

---

## 📊 What to Look For in the Dashboard

### Balance Trajectory Chart:

- ✅ Green line (NAV) tracks total assets
- ✅ Blue line (Balance) shows cash position
- ✅ Red dashed line at zero marks bankruptcy threshold
- ✅ Smooth curves (no sudden jumps unless recurrence triggers)

### KPI Cards:

- **Final Balance:** Should match chart endpoint
- **Collapse Probability:** 0-100%, increases with deficits
- **Credit Score:** 300-850 range, gradual changes
- **NAV:** Includes asset values (0 in basic scenarios)
- **Liquidity Ratio:** Infinity or 999 when no debt
- **Shock Resilience:** 0-100, drops when shocks occur

### Status Badges:

- Thriving = Green background
- Critical/Collapsed = Red background
- Text should match emoji indicators

---

## 🐛 Known Limitations (Expected Behavior)

1. **No Multi-Currency Conversion Yet**
   - All amounts stay in base currency
   - Exchange rates in schema but not applied

2. **No Taxation Applied**
   - Realized gains tracked but not taxed
   - No progressive bracket deductions

3. **Assets Not Pre-Populated**
   - Form doesn't add assets yet (future feature)
   - Asset valuation logic exists but unused in basic test

4. **Monthly Recurrence = Day 0, 30, 60...**
   - Not true calendar months (30-day approximation)

---

## ✅ Success Criteria

The system is working correctly if:

1. ✅ Different inputs produce different results
2. ✅ Same seed + inputs = identical results (determinism)
3. ✅ Balance trajectory makes intuitive sense
4. ✅ Negative balances trigger collapse detection
5. ✅ Credit score evolves based on balance state
6. ✅ Vibe/Pet state reflects financial health
7. ✅ No crashes or NaN values in output
8. ✅ Chart renders smoothly for 30-3650 day horizons

---

**Ready to test!** Open http://localhost:5173 and start with Scenario 1.
