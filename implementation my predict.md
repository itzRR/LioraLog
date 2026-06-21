# Improve Deadline Prediction Algorithm

The current prediction in [aiAnalytics.ts](file:///c:/Users/Rehan/Documents/MY%20WORKS/webs/LioraLog/src/lib/aiAnalytics.ts) uses hardcoded magic numbers for velocity blending, risk multipliers, and confidence — producing inaccurate estimates. This plan replaces it with statistically grounded techniques while keeping the same heuristic approach (no ML).

## Why Not ML?

| Factor | Heuristic (current approach) | Trained ML Model |
|---|---|---|
| Data needed | Works with 1+ logs | Needs 200+ rows minimum |
| Cold start | Gives estimates immediately | Useless for new users |
| Transparency | Formula is inspectable | Black box |
| Maintenance | Zero — runs client-side | Needs training pipeline, backend |
| Accuracy with <50 data points | **Better** | Overfits badly |

**Bottom line**: With per-user data sizes of 10–50 entries, a well-tuned heuristic will outperform any trainable model. ML only wins at scale (thousands of users, shared training data).

## Proposed Changes

### Algorithm Improvements (Core)

#### [MODIFY] [aiAnalytics.ts](file:///c:/Users/Rehan/Documents/MY%20WORKS/webs/LioraLog/src/lib/aiAnalytics.ts)

**1. Exponential Weighted Moving Average (EWMA) for velocity**
- Current: Simple average of last 3 weeks (`recentVelocities.slice(-3)`)
- New: EWMA with decay factor α=0.4, giving recent weeks exponentially more weight
- Why: A week where you did nothing last month shouldn't drag down predictions forever

**2. Estimation bias detection**
- If tasks have `estimatedHours`, compare actual completion times to estimates
- Calculate a personal bias multiplier (e.g., "you typically underestimate by 1.3x")
- Apply this multiplier to remaining work estimates
- Fallback: if no estimated hours data, bias = 1.0

**3. Completion velocity (Δ% per week)**
- Track how fast `completionPercentage` changes across tasks over time
- Blend this with log-based velocity as a second signal
- More direct measure than the current proxy (hours/status/detail length)

**4. Monte Carlo simulation (lightweight)**
- Run 200 iterations with randomized velocity drawn from observed distribution
- Produce **optimistic** (P25), **expected** (P50), and **pessimistic** (P75) estimates
- Shows a date range instead of a single point — much more honest

**5. Improved confidence calculation**
- Bayesian-inspired: starts at a low prior (15%) and grows with evidence
- Factors: data volume, velocity consistency (coefficient of variation), how much progress has been observed
- Penalizes high variance more aggressively
- No longer tops out artificially at 55% with low data

**6. Smarter risk multiplier**
- Current: `1 + blocked*0.45 + overdue*0.35` (arbitrary)
- New: Scale based on severity — blocked critical tasks penalize 2x more than blocked low-priority tasks
- Add stagnation detection: if no progress in 2+ weeks on in-progress tasks, treat as pseudo-blocked

---

### Type Updates

#### [MODIFY] [index.ts](file:///c:/Users/Rehan/Documents/MY%20WORKS/webs/LioraLog/src/types/index.ts)

Add new fields to `ProgressPrediction`:
```typescript
// Monte Carlo range estimates
optimisticDate?: string;       // P25 — best case
pessimisticDate?: string;      // P75 — worst case
optimisticWeeks?: number;
pessimisticWeeks?: number;

// New analysis signals
estimationBias?: number;       // e.g., 1.3 = "you underestimate by 30%"
completionVelocity?: number;   // Δ% per week across tasks
velocityTrend?: 'accelerating' | 'stable' | 'decelerating';
```

---

### UI Updates (show the improved data)

#### [MODIFY] [ProgressReport.tsx](file:///c:/Users/Rehan/Documents/MY%20WORKS/webs/LioraLog/src/components/dashboard/ProgressReport.tsx)

- Show **date range** (optimistic–pessimistic) instead of single date
- Display velocity trend indicator (↑ accelerating / → stable / ↓ decelerating)
- Show estimation bias if detected ("You tend to underestimate by X%")
- Update the confidence display to reflect the new Bayesian score

#### [MODIFY] [AIInsights.tsx](file:///c:/Users/Rehan/Documents/MY%20WORKS/webs/LioraLog/src/components/dashboard/AIInsights.tsx)

- Update the prediction insight text to include the date range
- Show velocity trend in the stats grid

---

### Consumers (minimal changes)

#### [MODIFY] [reportGenerator.ts](file:///c:/Users/Rehan/Documents/MY%20WORKS/webs/LioraLog/src/lib/reportGenerator.ts)

- Use new `velocityTrend` in report insights
- Include date range in supervisor summary

> [!IMPORTANT]
> All changes are **backward compatible** — new fields are optional (`?`), existing consumers won't break.

## Verification Plan

### Manual Verification
- Build the project (`npm run build`) to verify no type errors
- Test edge cases mentally: 0 logs, 1 log, all tasks completed, all tasks blocked, no deadlines
