import { useState } from "react";
import {
  type Data,
  activeGoal,
  total,
  shiftDay,
  kgToDisplay,
  weightUnit,
} from "./domain";
import { nutrients, targetValue } from "./nutrients";
import { energyModel, mean } from "./model";
import { Plot } from "./views";
import { Field, Toggle } from "./ui";
export function NutrientHighlights({
  data,
  date,
}: {
  data: Data;
  date: string;
}) {
  const g = activeGoal(data, date),
    p = data.profile!;
  const entries = data.entries.filter((e) => e.date === date);
  return (
    <section className="card space-top">
      <div className="card-heading">
        <div>
          <p className="eyebrow">BEYOND THE MACROS</p>
          <h2>Your nutrients of interest</h2>
        </div>
      </div>
      <div className="highlight-grid">
        {p.interest.map((id) => {
          const n = nutrients.find((n) => n.id === id);
          if (!n) return null;
          const t = total(entries, id),
            target = targetValue(id, g?.targets[id], g, p);
          return (
            <div key={id}>
              <span>{n.name}</span>
              <strong>
                {t.value === null ? "—" : Math.round(t.value * 10) / 10}
                <small> {n.unit}</small>
              </strong>
              <div className="track">
                <span
                  style={{
                    width:
                      target && t.value !== null
                        ? Math.min(100, (t.value / target) * 100) + "%"
                        : "0%",
                  }}
                />
              </div>
              <small>
                {t.value === null
                  ? "Not reported"
                  : `${Math.round(t.coverage * 100)}% data coverage`}
                {target ? ` · target ${Math.round(target)}` : ""}
              </small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function correlation(pairs: number[][]) {
  if (pairs.length < 7) return null;
  const x = mean(pairs.map((x) => x[0])),
    y = mean(pairs.map((x) => x[1]));
  const numerator = pairs.reduce((s, p) => s + (p[0] - x) * (p[1] - y), 0);
  const den = Math.sqrt(
    pairs.reduce((s, p) => s + (p[0] - x) ** 2, 0) *
      pairs.reduce((s, p) => s + (p[1] - y) ** 2, 0),
  );
  return den ? numerator / den : null;
}
export function NutritionTrends({ data, date }: { data: Data; date: string }) {
  const [metric, setMetric] = useState("calories"),
    [window, setWindow] = useState(28),
    [insights, setInsights] = useState(
      localStorage.getItem("daywell-insights") !== "hidden",
    );
  const days = Array.from({ length: window }, (_, i) =>
    shiftDay(date, 1 - window + i),
  );
  const series = days.map((day) => {
    const entries = data.entries.filter((e) => e.date === day);
    const c = data.checks.find((c) => c.date === day);
    const g = activeGoal(data, day);
    const obs = data.observations.filter((o) => o.date === day);
    const get = (kind: string, key: string) => {
      const values = obs
        .filter((o) => o.kind === kind && typeof o.values[key] === "number")
        .map((o) => Number(o.values[key]));
      return values.length ? mean(values) : null;
    };
    if (metric === "water") {
      const water = obs.filter((o) => o.kind === "water");
      return water.length
        ? water.reduce((s, o) => s + Number(o.values.ml), 0)
        : null;
    }
    if (metric === "adherence") {
      const energy = total(entries, "calories");
      return c?.complete &&
        energy.value !== null &&
        energy.known === entries.length &&
        g
        ? (100 * energy.value) / g.calories
        : null;
    }
    if (["sleep", "hunger", "energy", "mood", "digestion"].includes(metric))
      return get("wellness", metric);
    if (["waist", "hip", "chest", "neck", "bodyFat"].includes(metric))
      return get("body", metric);
    return total(entries, metric).value;
  });
  const n = nutrients.find((n) => n.id === metric),
    unit =
      n?.unit ??
      (metric === "adherence"
        ? "% of target"
        : metric === "water"
          ? "ml"
          : metric === "sleep"
            ? "hours"
            : ["waist", "hip", "chest", "neck"].includes(metric)
              ? "cm"
              : metric === "bodyFat"
                ? "%"
                : "rating");
  const rolling = series.map((_, i) => {
    const v = series
      .slice(Math.max(0, i - 6), i + 1)
      .filter((x) => x !== null) as number[];
    return v.length ? mean(v) : null;
  });
  const complete = data.checks.filter(
    (c) => c.complete && days.includes(c.date),
  );
  const pairs = complete.flatMap((c) => {
    const mood = data.observations.filter(
      (o) =>
        o.date === c.date &&
        o.kind === "wellness" &&
        typeof o.values.energy === "number",
    );
    return c.steps !== null && mood.length
      ? [[c.steps, mean(mood.map((o) => Number(o.values.energy)))]]
      : [];
  });
  const r = correlation(pairs);
  return (
    <section className="card space-top">
      <div className="card-heading">
        <div>
          <p className="eyebrow">WHAT WORKS FOR YOU</p>
          <h2>Nutrition & wellness over time</h2>
        </div>
        <div className="button-row">
          <select
            aria-label="Nutrition trend metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {nutrients
              .filter((n) =>
                [
                  "calories",
                  "protein",
                  "carbs",
                  "fat",
                  "fiber",
                  "sodium",
                  "potassium",
                  "calcium",
                  "iron",
                  "vitaminD",
                ].includes(n.id),
              )
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            {[
              ["water", "Drinking water"],
              ["adherence", "Calorie target adherence"],
              ["sleep", "Sleep"],
              ["hunger", "Hunger"],
              ["energy", "Energy rating"],
              ["mood", "Mood"],
              ["digestion", "Digestion"],
              ["waist", "Waist"],
              ["hip", "Hip"],
              ["chest", "Chest"],
              ["neck", "Neck"],
              ["bodyFat", "Body fat estimate"],
            ].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Nutrition trend window"
            value={window}
            onChange={(e) => setWindow(Number(e.target.value))}
          >
            {[7, 28, 90].map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
        </div>
      </div>
      <Plot
        labels={days}
        unit={unit}
        series={[
          { label: "Daily observation", color: "#9b92b3", values: series },
          { label: "7-day average", color: "#234d3c", values: rolling },
        ]}
      />
      <p className="fine-print">
        Averages use observed days only. Unknown values and unlogged days remain
        gaps; partial food totals may underestimate intake.
      </p>
      <details>
        <summary>Exact daily observations</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Daily ({unit})</th>
                <th>7-day average ({unit})</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td>{d}</td>
                  <td>{series[i]?.toFixed(1) ?? "Unknown"}</td>
                  <td>{rolling[i]?.toFixed(1) ?? "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <Toggle
        label="Show descriptive insights"
        checked={insights}
        onChange={(v) => {
          setInsights(v);
          localStorage.setItem("daywell-insights", v ? "shown" : "hidden");
        }}
      />
      {insights && (
        <div className="insight-note">
          <p>
            {complete.length} of {window} days have a confirmed complete diary.
          </p>
          <p>
            {r === null
              ? `Steps and energy ratings need at least seven paired days with variation to show a relationship (${pairs.length} available).`
              : `Steps and energy rating correlation: ${r.toFixed(2)} across ${pairs.length} paired days. This describes an association, not a causal effect.`}
          </p>
          <p>
            {data.profile!.goal === "maintain"
              ? "A steady weight trend over several weeks is more informative than any single reading."
              : "Use your rolling weight trend to assess your goal rate; short-term water changes can hide progress."}
          </p>
        </div>
      )}
    </section>
  );
}
