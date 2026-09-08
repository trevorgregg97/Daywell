# Weight and energy model — energy-1.0

This document describes the implementation, not a clinical validation claim. All outputs are estimates conditional on accurate intake logging and stable measurement practices. Model source and settings are included in encrypted backups along with a computed snapshot and version identifier.

## Weight normalization

Each day retains AM and PM raw readings. Excluded readings remain visible but do not contribute to normalization. For eligible paired readings in the trailing 42 calendar days, the PM–AM median becomes the offset once at least seven pairs exist. An eligible AM is fasted or explicitly included normally. Without an offset, PM-only days do not enter the normalized series.

AM has weight 1.0 when fasted/overridden and 0.4 otherwise. A normalized PM has weight 0.25. Combined daily weight is their weighted mean; daily reliability is capped at 1.0. Illness multiplies reliability by 0.35. The previous 14 days define a median and median absolute deviation; isolated deviations receive a Huber-like weight bounded between 0.08 and 1, using `max(0.5 kg, 3 × MAD)` as the threshold. Raw values are never discarded.

Rolling 7/14/28 calendar-day means use available observations weighted by reliability and outlier weight. Raw AM/PM 7-day means remain separately visible. The 28-day slope is the median of pairwise slopes separated by at least three days, excluding heavily down-weighted observations.

## Resting estimate

Mifflin–St Jeor: `10 × weightKg + 6.25 × heightCm − 5 × age + s`, where `s=5` for the male reference and `s=-161` for the female reference. The latest normalized 7-day trend weight updates the estimate. This equation predicts resting energy expenditure, not measured basal metabolism. The app labels it estimated resting expenditure and explains the BMR/RMR proxy.

Reference: Mifflin et al. 1990, https://pubmed.ncbi.nlm.nih.gov/2305711/.

## Dynamic expenditure estimator

The model replays up to the last 42 valid complete food-and-step days and intervening check-ins. It uses an extended-Kalman-style state `[trend weight, non-step total expenditure, kcal/step]`. Resting expenditure is formula-anchored inside the non-step total; the residual also includes food thermogenesis and unobserved activity, so it must not be relabeled learned BMR.

Initial non-step expenditure is `RMR × profileActivity − priorStep × medianSteps`. The step prior is `weightKg × 0.00045 kcal/step`, bounded to 0.015–0.075. During adaptation it stays within 0.4–2.0 times that prior. Non-step total stays between 1.05 and 2.0 times current RMR. Separately logged **non-step active calories** can be added; ordinary walking/running logs are not added to counted steps.

For complete days with all food-energy values known:

`predictedWeightTomorrow = filteredWeightToday + (loggedEnergy − modeledTDEE) / effectiveTissueEnergyDensity`

The effective density changes with estimated fat mass and a Forbes-style lean/fat partition: lean share `10.4 / (10.4 + fatMassKg)`; energy density `9440 × fatShare + 1800 × leanShare` kcal/kg. The fat-mass prior uses a bounded BMI/age/sex approximation and is internal only. It is not shown as measured body composition. This simplified model is inspired by dynamic energy-balance work but is **not an implementation of, or equivalent to, the NIH Body Weight Planner**.

Measurements correct predicted weight; expenditure updates begin only after 14 complete days. The step coefficient updates only after 28 complete days and step standard deviation of at least 1,500. Weight residuals are bounded to ±2 kg for updates. Missing food days are never interpreted as zero calories. Covariance increases across incomplete days and gaps.

Readiness additionally requires usable weights: at least seven for preliminary output, and at least 14 plus seven adaptation updates for personalized output. A prior-based step estimate remains explicitly provisional when activity variation is inadequate.

The displayed uncertainty band uses covariance plus penalties for low coverage, gaps, illness, and recent goal changes, with at least ±200 kcal/day. It is a conservative engineering uncertainty band, **not a statistically validated clinical confidence interval**. Daily estimates and 7/28-day averages are conditional modeled values, not measured daily burn.

Background on dynamic weight modeling: https://www.niddk.nih.gov/bwp and https://pmc.ncbi.nlm.nih.gov/articles/PMC2838532/.

## Interpretation and failure modes

- Fluid, glycogen, gut contents, menstrual changes, and measurement practices can move weight without equivalent tissue-energy change.
- Systematically underlogged food can make estimated expenditure too low; the system cannot identify that bias independently.
- Steps omit activity intensity and many forms of movement. Phone wear habits also matter.
- A flat step history cannot identify a personal step coefficient. More entries do not fix absent variation.
- AM/PM normalization is an approximation. Evening readings add lower-confidence information and do not count as independent full-quality samples of daily energy balance.
- Pregnancy, lactation, extreme body composition, and rapid unusual weight changes require individually set targets; the estimator is an informational tool.
- The engine is deterministic for a fixed dataset, as-of date, and version. Revisions to source observations trigger a full replay. Historical snapshots record the algorithm version so later changes remain interpretable.

Synthetic tests exercise stable weight, sustained gain/loss, varied and flat steps, missing energy, incomplete diaries, PM-only observations, exclusions, spikes, timezone boundaries, and double-counting prevention. Further validation against measured energy expenditure would be required to claim individual physiological accuracy.
