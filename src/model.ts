import { type Data, type Profile, dayNumber, shiftDay, total } from "./domain";
import { resting } from "./nutrients";
export const MODEL_VERSION = "energy-1.0";
export const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length
    ? (v[Math.floor((v.length - 1) / 2)] + v[Math.ceil((v.length - 1) / 2)]) / 2
    : 0;
};
export const mean = (v: number[]) =>
  v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export type WeightPoint = {
  date: string;
  am: number | null;
  pm: number | null;
  offset: number | null;
  pairedDifference: number | null;
  normalized: number | null;
  reliability: number;
  outlierWeight: number;
  avg7: number | null;
  avg14: number | null;
  avg28: number | null;
  am7: number | null;
  pm7: number | null;
};
function rolling(
  points: WeightPoint[],
  date: string,
  days: number,
  key: "normalized" | "am" | "pm",
) {
  const subset = points.filter(
    (p) =>
      p.date >= shiftDay(date, 1 - days) && p.date <= date && p[key] != null,
  );
  if (!subset.length) return null;
  const weights = subset.map((p) =>
    key === "normalized" ? p.reliability * p.outlierWeight : 1,
  );
  return (
    subset.reduce((s, p, i) => s + p[key]! * weights[i], 0) /
    weights.reduce((a, b) => a + b, 0)
  );
}
export function weightTrend(data: Data) {
  const points: WeightPoint[] = [];
  const pairs: { date: string; difference: number }[] = [];
  for (const c of [...data.checks].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    const am = c.am && !c.am.excluded ? c.am : null,
      pm = c.pm && !c.pm.excluded ? c.pm : null;
    if (am && pm && (am.fasted || am.includeNormally))
      pairs.push({ date: c.date, difference: pm.kg - am.kg });
    const recentPairs = pairs.filter((p) => p.date >= shiftDay(c.date, -41));
    const offset =
      recentPairs.length >= 7
        ? median(recentPairs.map((p) => p.difference))
        : null;
    const aw = am ? (am.fasted || am.includeNormally ? 1 : 0.4) : 0,
      pw = pm && offset !== null ? 0.25 : 0;
    const normalized =
      aw + pw
        ? ((am?.kg ?? 0) * aw + (pm ? pm.kg - (offset ?? 0) : 0) * pw) /
          (aw + pw)
        : null;
    const previous = points
      .filter((p) => p.normalized !== null && p.date >= shiftDay(c.date, -14))
      .map((p) => p.normalized!);
    const center = median(previous),
      mad = median(previous.map((x) => Math.abs(x - center)));
    const deviation = normalized !== null ? Math.abs(normalized - center) : 0;
    const outlierWeight =
      previous.length >= 5
        ? clamp(Math.max(0.5, 3 * mad) / Math.max(deviation, 0.01), 0.08, 1)
        : 1;
    const point: WeightPoint = {
      date: c.date,
      am: c.am?.kg ?? null,
      pm: c.pm?.kg ?? null,
      offset,
      pairedDifference: am && pm ? pm.kg - am.kg : null,
      normalized,
      reliability: Math.min(1, aw + pw) * (c.illness ? 0.35 : 1),
      outlierWeight,
      avg7: null,
      avg14: null,
      avg28: null,
      am7: null,
      pm7: null,
    };
    points.push(point);
    point.avg7 = rolling(points, c.date, 7, "normalized");
    point.avg14 = rolling(points, c.date, 14, "normalized");
    point.avg28 = rolling(points, c.date, 28, "normalized");
    point.am7 = rolling(points, c.date, 7, "am");
    point.pm7 = rolling(points, c.date, 7, "pm");
  }
  return points;
}
export function robustSlope(points: WeightPoint[], date: string) {
  const p = points.filter(
    (p) =>
      p.date >= shiftDay(date, -27) &&
      p.date <= date &&
      p.normalized !== null &&
      p.outlierWeight >= 0.5,
  );
  const slopes: number[] = [];
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) {
      const days = dayNumber(p[j].date) - dayNumber(p[i].date);
      if (days >= 3) slopes.push((p[j].normalized! - p[i].normalized!) / days);
    }
  return slopes.length ? median(slopes) : null;
}
// Effective tissue energy density: Forbes-style lean/fat partition, not a fixed kcal/lb rule.
// Fat mass is a rough BMI/age/sex prior; no inferred body-fat value is shown to users.
export function energyDensity(p: Profile, kg: number) {
  const bmi = kg / (p.heightCm / 100) ** 2;
  const fatFraction = clamp(
    (1.2 * bmi + 0.23 * p.age - 10.8 * (p.sex === "male" ? 1 : 0) - 5.4) / 100,
    0.08,
    0.55,
  );
  const leanShare = 10.4 / (10.4 + kg * fatFraction);
  return 9440 * (1 - leanShare) + 1800 * leanShare;
}
export type EnergyDay = {
  date: string;
  resting: number;
  tdee: number;
  steps: number | null;
  calories: number | null;
  adaptive: boolean;
  valid: boolean;
  reason: string;
};
export function energyModel(data: Data, asOf: string) {
  const p = data.profile;
  if (!p) return null;
  const points = weightTrend({
    ...data,
    checks: data.checks.filter((c) => c.date <= asOf),
  });
  const latest = points.filter((x) => x.normalized != null).at(-1);
  const trendKg = latest?.avg7 ?? p.weightKg;
  const bmr = resting(p, trendKg);
  const checks = [...data.checks]
    .filter((c) => c.date <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));
  const validChecks = checks.filter(
    (c) =>
      c.complete &&
      c.steps !== null &&
      (() => {
        const e = data.entries.filter((e) => e.date === c.date);
        return e.length > 0 && total(e, "calories").known === e.length;
      })(),
  );
  const selected = validChecks.slice(-42);
  const start = selected[0]?.date ?? shiftDay(asOf, -41);
  const history = checks.filter((c) => c.date >= start);
  const stepsList = selected.map((c) => c.steps!);
  const medianSteps = median(stepsList) || 5000;
  const stepSpread = Math.sqrt(
    mean(stepsList.map((x) => (x - mean(stepsList)) ** 2)),
  );
  const priorStep = clamp(trendKg * 0.00045, 0.015, 0.075);
  let w =
    points.find((x) => x.date >= start && x.normalized != null)?.normalized ??
    trendKg;
  let base = resting(p, w) * p.activity - priorStep * medianSteps;
  let beta = priorStep;
  // EKF covariance for [trend weight, non-step total, kcal/step]. Resting component is anchored.
  let P = [
    [0.3, 0, 0],
    [0, 120000, 0],
    [0, 0, 0.0001],
  ];
  const days: EnergyDay[] = [];
  let valid = 0,
    updates = 0,
    gaps = 0;
  let previousDate: string | null = null;
  for (const c of history) {
    const entries = data.entries.filter((e) => e.date === c.date);
    const intake = total(entries, "calories");
    const full =
      c.complete &&
      c.steps !== null &&
      entries.length > 0 &&
      intake.known === entries.length;
    const obs = points.find((o) => o.date === c.date);
    if (previousDate && dayNumber(c.date) - dayNumber(previousDate) > 1) {
      P[0][0] += 0.5;
      P[1][1] += 10000;
      gaps++;
    }
    previousDate = c.date;
    if (obs?.normalized != null) {
      const reliability = Math.max(0.02, obs.reliability * obs.outlierWeight);
      const R = 0.35 / reliability;
      const residual = obs.normalized - w;
      const S = P[0][0] + R;
      const K = [P[0][0] / S, P[1][0] / S, P[2][0] / S];
      w += K[0] * clamp(residual, -2, 2);
      if (valid >= 14) {
        base += K[1] * clamp(residual, -2, 2);
        if (valid >= 28 && stepSpread >= 1500)
          beta += K[2] * clamp(residual, -2, 2);
        updates++;
      }
      const old = P.map((r) => [...r]);
      P = P.map((r, i) => r.map((v, j) => v - K[i] * old[0][j]));
    }
    const rmr = resting(p, w);
    base = clamp(base, rmr * 1.05, rmr * 2);
    beta = clamp(beta, priorStep * 0.4, priorStep * 2);
    const exercise = data.observations
      .filter(
        (o) =>
          o.date === c.date &&
          o.kind === "exercise" &&
          o.values.nonStep === true,
      )
      .reduce((s, o) => s + Number(o.values.calories || 0), 0);
    const usedSteps = c.steps ?? medianSteps;
    const tdee = base + beta * usedSteps + exercise;
    days.push({
      date: c.date,
      resting: rmr,
      tdee,
      steps: c.steps,
      calories: intake.value,
      adaptive: valid >= 14,
      valid: full,
      reason: !c.complete
        ? "Diary not confirmed complete"
        : c.steps === null
          ? "Steps missing"
          : !entries.length
            ? "No foods logged"
            : intake.known !== entries.length
              ? "Energy missing for a food"
              : "",
    });
    if (full) {
      valid++;
      const rho = energyDensity(p, w);
      w += (intake.value! - tdee) / rho;
      const F = [
        [1, -1 / rho, -usedSteps / rho],
        [0, 1, 0],
        [0, 0, 1],
      ];
      const FP = F.map((r) =>
        [0, 1, 2].map((j) => r.reduce((s, v, k) => s + v * P[k][j], 0)),
      );
      P = FP.map((r) =>
        [0, 1, 2].map((j) => r.reduce((s, v, k) => s + v * F[j][k], 0)),
      );
      P[0][0] += 0.015;
      P[1][1] += 400;
      P[2][2] += 0.00000005;
    } else {
      P[0][0] += 0.3;
      P[1][1] += 2500;
    }
  }
  const usableWeights = points.filter(
    (x) => x.date >= start && x.normalized != null && x.reliability >= 0.4,
  ).length;
  const ready =
    valid >= 28 && usableWeights >= 14 && updates >= 7
      ? "personalized"
      : valid >= 14 && usableWeights >= 7
        ? "preliminary"
        : "provisional";
  const learned = ready === "personalized" && stepSpread >= 1500 && valid >= 28;
  const recentGoals = data.goals.filter(
    (g) => g.effective >= shiftDay(asOf, -14) && g.effective <= asOf,
  ).length;
  const illness = history.filter((c) => c.illness).length;
  const coverage = history.length
    ? valid / Math.max(1, dayNumber(asOf) - dayNumber(start) + 1)
    : 0;
  const uncertainty = Math.round(
    Math.max(
      200,
      Math.sqrt(P[1][1]) +
        150 +
        (1 - coverage) * 350 +
        gaps * 30 +
        illness * 20 +
        (recentGoals > 1 ? 100 : 0),
    ),
  );
  const baseline =
    ready === "provisional" ? bmr * p.activity : base + beta * medianSteps;
  return {
    version: MODEL_VERSION,
    points,
    days,
    bmr,
    formulaTdee: bmr * p.activity,
    baseline,
    medianSteps,
    stepKcalPer1000: learned ? beta * 1000 : null,
    priorStepKcalPer1000: priorStep * 1000,
    ready,
    validDays: valid,
    weightDays: usableWeights,
    coverage,
    uncertainty,
    range: [Math.max(bmr, baseline - uncertainty), baseline + uncertainty],
    stepSpread,
    start,
    end: asOf,
    avg7:
      mean(
        days.filter((d) => d.date >= shiftDay(asOf, -6)).map((d) => d.tdee),
      ) || baseline,
    avg28:
      mean(
        days.filter((d) => d.date >= shiftDay(asOf, -27)).map((d) => d.tdee),
      ) || baseline,
    slope: robustSlope(points, asOf),
    explanations: [
      ready === "provisional"
        ? "Collect 14 complete food-and-step days plus 7 usable weight days to begin adaptation."
        : "Adaptive estimates use calorie intake and weight change across days; daily scale swings are down-weighted.",
      learned
        ? "Step response has enough varied activity observations to personalize."
        : "Steps use a body-weight-based prior until at least 28 complete days and 1,500-step standard deviation are available.",
      "Ranges are model uncertainty bands, not validated medical confidence intervals. Unlogged food can bias expenditure downward.",
      "Resting expenditure remains formula-anchored; the learned non-step component also includes digestion and unmeasured activity.",
    ],
  };
}
