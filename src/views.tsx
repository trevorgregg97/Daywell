import { useState } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Trash2,
  Sun,
  Moon,
  Footprints,
  Flame,
  TrendingUp,
} from "lucide-react";
import {
  type Data,
  type Goal,
  type Target,
  activeGoal,
  total,
  shiftDay,
  formatWeight,
  kgToDisplay,
  weightUnit,
  uid,
} from "./domain";
import { nutrients, targetValue, seedGoal, referenceUrl } from "./nutrients";
import { energyModel, mean } from "./model";
import { NutritionTrends } from "./insights";
import {
  encryptBackup,
  decryptBackup,
  restoreData,
  readData,
  download,
  csv,
  setLock,
  db,
} from "./storage";
import type { Save } from "./App";
import { Field, NumberField, Toggle, ErrorText, Empty, Modal } from "./ui";
export function Plot({
  series,
  labels,
  unit,
}: {
  series: { label: string; color: string; values: (number | null)[] }[];
  labels: string[];
  unit: string;
}) {
  const values = series.flatMap(
    (s) => s.values.filter((v) => v !== null) as number[],
  );
  if (!values.length)
    return (
      <Empty title="Your trend starts with a check-in">
        As you log, your individual readings and rolling averages will appear
        here.
      </Empty>
    );
  const min = Math.min(...values) - 0.5,
    max = Math.max(...values) + 0.5;
  const x = (i: number) => 45 + (i / Math.max(1, labels.length - 1)) * 685,
    y = (n: number) => 190 - ((n - min) / (max - min)) * 155;
  return (
    <>
      <svg
        className="chart"
        viewBox="0 0 760 230"
        role="img"
        aria-label={
          "Trend chart in " + unit + ". Exact readings are in the table below."
        }
      >
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="45"
              x2="730"
              y1={35 + (i * 155) / 3}
              y2={35 + (i * 155) / 3}
              stroke="#e6e8e1"
            />
            <text x="0" y={39 + (i * 155) / 3} fontSize="11" fill="#6d756f">
              {(max - (i * (max - min)) / 3).toFixed(1)}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.label}>
            {s.values.map(
              (v, i) =>
                v !== null && (
                  <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color} />
                ),
            )}
            <path
              d={s.values
                .map((v, i) =>
                  v === null
                    ? ""
                    : `${i === 0 || s.values[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
                )
                .join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2.3"
            />
          </g>
        ))}
        {[0, Math.floor((labels.length - 1) / 2), labels.length - 1].map(
          (i, j) => (
            <text
              key={j}
              x={x(i)}
              y="220"
              textAnchor="middle"
              fontSize="11"
              fill="#6d756f"
            >
              {labels[i]?.slice(5)}
            </text>
          ),
        )}
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </>
  );
}
export function Trends({
  data,
  date,
  edit,
}: {
  data: Data;
  date: string;
  edit: (date: string, kind: string) => void;
}) {
  const [windowDays, setWindow] = useState(28),
    [kind, setKind] = useState("weight");
  const p = data.profile!,
    model = energyModel(data, date)!;
  const points = model.points.filter(
      (x) => x.date >= shiftDay(date, 1 - windowDays),
    ),
    last = points.at(-1);
  const checks = data.checks.filter(
    (c) => c.date <= date && c.date >= shiftDay(date, 1 - windowDays),
  );
  const am = checks.filter((c) => c.am).length,
    pm = checks.filter((c) => c.pm).length;
  const days = model.days.filter(
    (d) => d.date >= shiftDay(date, 1 - windowDays),
  );
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : formatWeight(n, p);
  return (
    <>
      <div className="metric-grid">
        <div className="card metric">
          <Sun size={20} />
          <strong>
            {fmt(last?.avg7)} <small>{weightUnit(p)}</small>
          </strong>
          <span>7-day normalized weight</span>
        </div>
        <div className="card metric">
          <Flame size={20} />
          <strong>
            {Math.round(model.bmr).toLocaleString()} <small>kcal</small>
          </strong>
          <span>Estimated resting expenditure</span>
        </div>
        <div className="card metric">
          <TrendingUp size={20} />
          <strong>
            {Math.round(model.baseline).toLocaleString()} <small>kcal</small>
          </strong>
          <span>Baseline TDEE · {model.ready}</span>
        </div>
        <div className="card metric">
          <Footprints size={20} />
          <strong>{Math.round(model.medianSteps).toLocaleString()}</strong>
          <span>Recent median steps</span>
        </div>
      </div>
      <section className="card space-top">
        <div className="card-heading">
          <div>
            <p className="eyebrow">YOUR LONG VIEW</p>
            <h2>
              {kind === "weight"
                ? "Weight, with perspective"
                : kind === "difference"
                  ? "Your evening-to-morning pattern"
                  : "Daily steps & expenditure"}
            </h2>
          </div>
          <div className="button-row">
            <select
              aria-label="Trend type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="weight">Weight</option>
              <option value="difference">AM/PM difference</option>
              <option value="energy">Expenditure</option>
              <option value="steps">Steps</option>
            </select>
            <select
              aria-label="Trend period"
              value={windowDays}
              onChange={(e) => setWindow(Number(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={28}>28 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
        {kind === "weight" ? (
          <Plot
            labels={points.map((x) => x.date)}
            unit={weightUnit(p)}
            series={[
              {
                label: "Morning",
                color: "#d2a556",
                values: points.map((x) =>
                  x.am === null ? null : kgToDisplay(x.am, p),
                ),
              },
              {
                label: "Evening",
                color: "#9b92b3",
                values: points.map((x) =>
                  x.pm === null ? null : kgToDisplay(x.pm, p),
                ),
              },
              {
                label: "Normalized",
                color: "#8aada0",
                values: points.map((x) =>
                  x.normalized === null ? null : kgToDisplay(x.normalized, p),
                ),
              },
              {
                label: "7-day trend",
                color: "#234d3c",
                values: points.map((x) =>
                  x.avg7 === null ? null : kgToDisplay(x.avg7, p),
                ),
              },
            ]}
          />
        ) : kind === "difference" ? (
          <Plot
            labels={points.map((x) => x.date)}
            unit={weightUnit(p)}
            series={[
              {
                label: "PM minus AM",
                color: "#9b92b3",
                values: points.map((x) =>
                  x.pairedDifference === null
                    ? null
                    : kgToDisplay(x.pairedDifference, p),
                ),
              },
              {
                label: "Learned offset",
                color: "#234d3c",
                values: points.map((x) =>
                  x.offset === null ? null : kgToDisplay(x.offset, p),
                ),
              },
            ]}
          />
        ) : (
          <Plot
            labels={days.map((d) => d.date)}
            unit={kind === "steps" ? "steps" : "kcal"}
            series={[
              {
                label: kind === "steps" ? "Steps" : "Estimated TDEE",
                color: "#234d3c",
                values: days.map((d) => (kind === "steps" ? d.steps : d.tdee)),
              },
            ]}
          />
        )}
        <div className="trend-summary">
          <span>
            <strong>
              {am}/{windowDays}
            </strong>{" "}
            morning check-ins
          </span>
          <span>
            <strong>
              {pm}/{windowDays}
            </strong>{" "}
            evening check-ins
          </span>
          <span>
            <strong>
              {fmt(last?.offset)} {weightUnit(p)}
            </strong>{" "}
            learned PM offset
          </span>
          <span>
            <strong>
              {model.slope === null
                ? "—"
                : (kgToDisplay(model.slope, p) * 7).toFixed(2)}{" "}
              {weightUnit(p)}
            </strong>{" "}
            weekly trend change
          </span>
        </div>
        <details>
          <summary>Exact readings and rolling averages</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Date",
                    "AM",
                    "PM",
                    "Normalized",
                    "7-day",
                    "14-day",
                    "28-day",
                    "AM 7-day",
                    "PM 7-day",
                    "Quality",
                  ].map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((x) => (
                  <tr key={x.date}>
                    <th>{x.date}</th>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => edit(x.date, "am")}
                      >
                        {fmt(x.am)}
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => edit(x.date, "pm")}
                      >
                        {fmt(x.pm)}
                      </button>
                    </td>
                    <td>{fmt(x.normalized)}</td>
                    <td>{fmt(x.avg7)}</td>
                    <td>{fmt(x.avg14)}</td>
                    <td>{fmt(x.avg28)}</td>
                    <td>{fmt(x.am7)}</td>
                    <td>{fmt(x.pm7)}</td>
                    <td>
                      {Math.round(x.reliability * x.outlierWeight * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="card space-top">
        <div className="card-heading">
          <div>
            <p className="eyebrow">LEARNING FROM YOUR DAYS</p>
            <h2>Your energy picture</h2>
          </div>
          <span className="pill">{model.ready}</span>
        </div>
        <div className="energy-explainer">
          <div>
            <strong>
              {Math.round(model.range[0]).toLocaleString()}–
              {Math.round(model.range[1]).toLocaleString()}
            </strong>
            <span>estimated TDEE range · kcal/day</span>
            <div className="track">
              <span
                style={{
                  width: Math.min(100, (model.validDays / 28) * 100) + "%",
                }}
              />
            </div>
            <small>
              {model.validDays} complete days · {model.weightDays} usable
              weights · {Math.round(model.coverage * 100)}% coverage
            </small>
          </div>
          <div>
            <p>
              At your typical {Math.round(model.medianSteps).toLocaleString()}{" "}
              steps, your estimated maintenance expenditure is{" "}
              <strong>
                {Math.round(model.baseline).toLocaleString()} kcal/day
              </strong>
              .
            </p>
            <p>
              {model.stepKcalPer1000 === null
                ? "Your step response is still using a conservative starting estimate."
                : `Your current personal estimate is ${Math.round(model.stepKcalPer1000)} kcal per 1,000 additional steps.`}
            </p>
            <p>
              Formula starting TDEE: {Math.round(model.formulaTdee)} kcal.
              Recent modeled averages: {Math.round(model.avg7)} kcal (7 days) /{" "}
              {Math.round(model.avg28)} kcal (28 days).
            </p>
          </div>
        </div>
        <details>
          <summary>How this estimate works</summary>
          {model.explanations.map((s) => (
            <p key={s}>{s}</p>
          ))}
          <p>
            Version {model.version} · observation window {model.start} to{" "}
            {model.end}. The effective tissue-energy model uses a lean/fat
            partition estimate; it has not been clinically validated.
          </p>
          <p>
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/2305711/"
              target="_blank"
              rel="noreferrer"
            >
              Resting equation reference
            </a>{" "}
            ·{" "}
            <a
              href="https://www.niddk.nih.gov/bwp"
              target="_blank"
              rel="noreferrer"
            >
              Dynamic weight modeling background
            </a>
          </p>
        </details>
        <details>
          <summary>Daily activity and model inclusion</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Steps</th>
                  <th>Logged kcal</th>
                  <th>Estimated TDEE</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...model.days].reverse().map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.steps ?? "Unknown"}</td>
                    <td>
                      {d.calories === null ? "Unknown" : Math.round(d.calories)}
                    </td>
                    <td>{Math.round(d.tdee)}</td>
                    <td>{d.valid ? "Included" : d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <NutritionTrends data={data} date={date} />
      <section className="card space-top">
        <h2>Your check-in calendar</h2>
        <div className="history-grid">
          {Array.from({ length: 28 }, (_, i) => shiftDay(date, i - 27)).map(
            (d) => {
              const c = data.checks.find((c) => c.date === d);
              return (
                <button
                  key={d}
                  className={c?.complete ? "complete" : ""}
                  onClick={() => edit(d, c?.am ? "pm" : "am")}
                  aria-label={`${d}: morning ${c?.am ? "done" : "missing"}, evening ${c?.pm ? "done" : "missing"}, diary ${c?.complete ? "complete" : "open"}`}
                >
                  <span>{Number(d.slice(-2))}</span>
                  <small>
                    {c?.am ? "☀" : "·"} {c?.pm ? "☾" : "·"}{" "}
                    {c?.steps != null ? "✓" : ""}
                  </small>
                </button>
              );
            },
          )}
        </div>
      </section>
      <section className="card space-top">
        <h2>Wellness & body observations</h2>
        {!data.observations.filter((o) => o.kind !== "water").length ? (
          <p className="subtle">
            Your sleep, exercise, mood, and measurements will appear here.
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Observation</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.observations
                  .filter(
                    (o) =>
                      o.kind !== "water" &&
                      o.date <= date &&
                      o.date >= shiftDay(date, 1 - windowDays),
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((o) => (
                    <tr key={o.id}>
                      <td>{o.date}</td>
                      <td>{o.kind}</td>
                      <td>
                        {Object.entries(o.values)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </td>
                      <td>{o.notes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
export function NutrientsView({ data, date }: { data: Data; date: string }) {
  const [period, setPeriod] = useState(1),
    [group, setGroup] = useState("All"),
    [selected, setSelected] = useState<string | null>(null);
  const p = data.profile!,
    g = activeGoal(data, date),
    entries = data.entries.filter(
      (e) => e.date <= date && e.date >= shiftDay(date, 1 - period),
    );
  const days = new Set(entries.map((e) => e.date)).size;
  return (
    <section className="card">
      <div className="card-heading">
        <h2>Nutrient explorer</h2>
        <div className="button-row">
          <select
            aria-label="Nutrient period"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            {[1, 7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "This day" : `${n}-day average`}
              </option>
            ))}
          </select>
          <select
            aria-label="Nutrient category"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            {["All", ...new Set(nutrients.map((n) => n.group))].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="subtle">
        {period > 1
          ? `Average across ${days} logged days in this ${period}-day window. Unlogged days are excluded.`
          : "Known values from today’s entries."}{" "}
        Coverage is the share of logged food weight with a reported value.
        Partial totals are lower bounds.
      </p>
      <div className="table-scroll">
        <table className="nutrient-table">
          <thead>
            <tr>
              <th>Nutrient</th>
              <th>{period > 1 ? "Daily average" : "Known total"}</th>
              <th>Target</th>
              <th>Coverage</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {nutrients
              .filter((n) => group === "All" || n.group === group)
              .map((n) => {
                const t = total(entries, n.id),
                  v =
                    t.value === null
                      ? null
                      : t.value / (period > 1 ? Math.max(1, days) : 1),
                  target = g
                    ? targetValue(n.id, g.targets[n.id], g, p)
                    : undefined,
                  max = g?.targets[n.id]?.max;
                return (
                  <tr key={n.id}>
                    <th>
                      <button
                        className="text-button"
                        onClick={() => setSelected(n.id)}
                      >
                        {n.name}
                      </button>
                      <small>{n.group}</small>
                    </th>
                    <td>
                      {v === null
                        ? "Unknown"
                        : v.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          }) +
                          " " +
                          n.unit}
                      {t.coverage < 1 && v !== null && <small>partial</small>}
                    </td>
                    <td>
                      {target !== undefined
                        ? `${Math.round(target * 100) / 100} ${n.unit}`
                        : "—"}
                      {g?.targets[n.id]?.min !== undefined && (
                        <small>
                          minimum: {g.targets[n.id].min} {n.unit}
                        </small>
                      )}
                      {max !== undefined && (
                        <small>
                          upper: {Math.round(max * 100) / 100} {n.unit}
                        </small>
                      )}
                    </td>
                    <td>
                      {Math.round(t.coverage * 100)}%
                      <small>
                        {t.known}/{t.count} foods
                      </small>
                    </td>
                    <td>
                      <div
                        className={
                          "track " +
                          (max && v !== null && v > max ? "over" : "")
                        }
                      >
                        <span
                          style={{
                            width:
                              target && v !== null
                                ? Math.min(100, (v / target) * 100) + "%"
                                : "0%",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        Targets are configurable reference intakes, not a diagnosis.
        Form-specific upper limits for supplemental magnesium, folic acid,
        niacin, and preformed vitamin A are omitted unless entered manually;
        total intake alone cannot determine those exposures.{" "}
        <a href={referenceUrl} target="_blank" rel="noreferrer">
          Reference tables
        </a>
      </p>
      {selected && (
        <Modal
          title={
            nutrients.find((n) => n.id === selected)!.name + " contributions"
          }
          onClose={() => setSelected(null)}
        >
          {entries.map((e) => (
            <div className="food-result" key={e.id}>
              <span>
                {e.food.name}
                <small>
                  {e.date} · {e.grams.toFixed(1)} g
                </small>
              </span>
              <strong>
                {e.food.nutrients[selected] == null
                  ? "Unknown"
                  : ((e.food.nutrients[selected]! * e.grams) / 100).toFixed(2) +
                    " " +
                    nutrients.find((n) => n.id === selected)!.unit}
              </strong>
            </div>
          ))}
        </Modal>
      )}
    </section>
  );
}
export function SettingsView({
  data,
  save,
  notify,
  editProfile,
  observation,
}: {
  data: Data;
  save: Save;
  notify: (s: string) => void;
  editProfile: () => void;
  observation: () => void;
}) {
  const p = data.profile!,
    [password, setPassword] = useState(""),
    [token, setToken] = useState(
      localStorage.getItem("daywell-api-token") ?? "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [goalOpen, setGoalOpen] = useState(false),
    [lockPassword, setLockPassword] = useState(""),
    [hasLock, setHasLock] = useState(!!localStorage.getItem("daywell-lock"));
  const asOf = new Intl.DateTimeFormat("en-CA", {
    timeZone: p.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const backup = async () => {
    setBusy(true);
    setError("");
    try {
      download(
        await encryptBackup(data, password),
        `daywell-${asOf}.encrypted.json`,
      );
      await save({
        ...data,
        profile: { ...p, lastBackup: new Date().toISOString() },
      });
      notify("Backup prepared. Save the downloaded file somewhere safe.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    download(
      csv([
        [
          "date",
          "meal",
          "food",
          "grams",
          "provider",
          "attribution",
          "foodRevision",
          ...nutrients.map((n) => `${n.id} (${n.unit})`),
        ],
        ...data.entries.map((e) => [
          e.date,
          e.meal,
          e.food.name,
          e.grams,
          e.food.provider,
          e.food.attribution,
          e.food.revision,
          ...nutrients.map((n) =>
            e.food.nutrients[n.id] == null
              ? "unknown"
              : (e.food.nutrients[n.id]! * e.grams) / 100,
          ),
        ]),
      ]),
      "daywell-diary.csv",
      "text/csv",
    );
    download(
      csv([
        [
          "date",
          "amKg",
          "pmKg",
          "steps",
          "complete",
          "amFasted",
          "amExcluded",
          "pmExcluded",
        ],
        ...data.checks.map((c) => [
          c.date,
          c.am?.kg,
          c.pm?.kg,
          c.steps,
          c.complete,
          c.am?.fasted,
          c.am?.excluded,
          c.pm?.excluded,
        ]),
      ]),
      "daywell-checkins.csv",
      "text/csv",
    );
    download(
      csv([
        ["date", "kind", "values", "notes"],
        ...data.observations.map((o) => [
          o.date,
          o.kind,
          JSON.stringify(o.values),
          o.notes,
        ]),
      ]),
      "daywell-observations.csv",
      "text/csv",
    );
    const m = energyModel(data, asOf)!;
    download(
      csv([
        [
          "modelVersion",
          "date",
          "restingKcal",
          "tdeeKcal",
          "steps",
          "intake",
          "included",
        ],
        ...m.days.map((d) => [
          m.version,
          d.date,
          d.resting,
          d.tdee,
          d.steps,
          d.calories,
          d.valid,
        ]),
      ]),
      "daywell-energy.csv",
      "text/csv",
    );
  };
  return (
    <>
      <div className="settings-grid">
        <section className="card">
          <p className="eyebrow">PERSONALIZE</p>
          <h2>Your profile & targets</h2>
          <p>
            {p.name || "Your profile"} · {p.age} years ·{" "}
            {formatWeight(p.weightKg, p)} {weightUnit(p)} ·{" "}
            {p.diet || "No dietary pattern set"}
          </p>
          <div className="button-row">
            <button className="secondary" onClick={editProfile}>
              Edit profile
            </button>
            <button className="primary" onClick={() => setGoalOpen(true)}>
              Edit goals
            </button>
          </div>
          <button className="text-button" onClick={observation}>
            Log wellness, exercise, or body measurements{" "}
            <ArrowUpRight size={15} />
          </button>
          <details>
            <summary>Goal history</summary>
            {data.goals.map((g) => (
              <p key={g.id}>
                {g.effective} · {g.calories} kcal · {g.waterMl} ml water
              </p>
            ))}
          </details>
        </section>
        <section className="card">
          <p className="eyebrow">FOOD DATABASES</p>
          <h2>Connect your lookup service</h2>
          <p>Your token authorizes food searches. Your diary stays here.</p>
          <Field label="Personal food API token">
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </Field>
          <button
            className="secondary"
            onClick={() => {
              localStorage.setItem("daywell-api-token", token.trim());
              notify("Lookup token saved on this device.");
            }}
          >
            Save connection
          </button>
          <small>
            The USDA key belongs in the Cloudflare Worker’s secrets, never here.
          </small>
        </section>
        <section className="card">
          <p className="eyebrow">YOUR DATA, IN YOUR HANDS</p>
          <h2>
            <ShieldCheck size={19} /> Encrypted backups
          </h2>
          <p>
            Save backups in Files or another safe location. A lost password
            cannot be recovered.
          </p>
          <Field label="Backup password (at least 10 characters)">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="button-row">
            <button
              className="primary"
              disabled={busy || password.length < 10}
              onClick={backup}
            >
              <Download size={15} />
              {busy ? "Working…" : "Create backup"}
            </button>
            <label className="secondary file-button">
              <Upload size={15} /> Restore backup
              <input
                type="file"
                accept=".json"
                disabled={busy || !password}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    const next = await decryptBackup(
                      await file.text(),
                      password,
                    );
                    if (
                      !window.confirm(
                        `Restore ${next.entries.length} diary entries and ${next.checks.length} check-in days? Current data will be saved as a local recovery snapshot.`,
                      )
                    )
                      return;
                    await restoreData(next);
                    await save(next);
                    notify("Backup restored.");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          </div>
          <NumberField
            label="Remind me to back up every (days)"
            value={p.backupDays}
            onChange={async (v) => {
              if (Number(v) >= 1 && Number(v) <= 90)
                await save({
                  ...data,
                  profile: { ...p, backupDays: Number(v) },
                });
            }}
            min={1}
            max={90}
            step="1"
          />
          <small>
            Last backup prepared:{" "}
            {p.lastBackup ? new Date(p.lastBackup).toLocaleString() : "Not yet"}
            . The app cannot confirm that a download was retained.
          </small>
          <button
            className="text-button"
            onClick={async () => {
              const snapshot = await db.snapshots.orderBy("id").last();
              if (!snapshot) {
                notify("No recovery snapshot is available.");
                return;
              }
              if (
                window.confirm(
                  "Recover the data saved immediately before your latest restore?",
                )
              ) {
                await restoreData(snapshot.data);
                await save(snapshot.data);
                notify("Recovery snapshot restored.");
              }
            }}
          >
            Recover previous local snapshot
          </button>
        </section>
        <section className="card">
          <p className="eyebrow">DEVICE PRIVACY</p>
          <h2>Local screen lock</h2>
          <p>
            Add a password to the opening screen. This is a convenience lock; it
            does not encrypt IndexedDB or protect against someone with browser
            developer access.
          </p>
          <Field label="Screen-lock password">
            <input
              type="password"
              autoComplete="new-password"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
            />
          </Field>
          <div className="button-row">
            <button
              className="secondary"
              disabled={lockPassword.length < 10}
              onClick={async () => {
                await setLock(lockPassword);
                setHasLock(true);
                setLockPassword("");
                notify("Screen lock enabled for your next app opening.");
              }}
            >
              Enable lock
            </button>
            {hasLock && (
              <button
                className="text-button"
                onClick={() => {
                  localStorage.removeItem("daywell-lock");
                  setHasLock(false);
                  notify("Local screen lock removed.");
                }}
              >
                Remove lock
              </button>
            )}
          </div>
          <p>
            No analytics. No diary upload. Your database remains tied to this
            browser and site address.
          </p>
        </section>
      </div>
      <section className="card space-top">
        <h2>Export & installation</h2>
        <p>
          On iPhone, open the deployed address in Safari, tap Share, then Add to
          Home Screen and Open as Web App. Complete setup in the installed app,
          since browser and installed app storage can be separate.
        </p>
        <p>
          CSV exports are readable by anyone who obtains the files. Your browser
          may request permission for multiple downloads.
        </p>
        <button className="secondary" onClick={exportCsv}>
          <Download size={16} /> Export CSV files
        </button>
        <details>
          <summary>Manage recorded observations</summary>
          {data.observations.map((o) => (
            <div className="food-result" key={o.id}>
              <span>
                {o.date} · {o.kind}
                <small>
                  {Object.entries(o.values)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </small>
              </span>
              <button
                className="icon-button"
                aria-label={"Delete " + o.kind + " " + o.date}
                onClick={async () => {
                  await save({
                    ...data,
                    observations: data.observations.filter(
                      (x) => x.id !== o.id,
                    ),
                  });
                  notify("Observation removed.");
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </details>
        <p className="fine-print">
          Food data:{" "}
          <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">
            USDA FoodData Central (CC0)
          </a>{" "}
          ·{" "}
          <a
            href="https://world.openfoodfacts.org/terms-of-use"
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts (ODbL)
          </a>
          . Local edits are your own; provider attribution is preserved in
          exports and backups.
        </p>
      </section>
      <ErrorText error={error} />
      {goalOpen && (
        <Modal
          title="Your goals, starting today"
          onClose={() => setGoalOpen(false)}
        >
          <GoalEditor
            data={data}
            onSave={async (g) => {
              await save({
                ...data,
                goals: [
                  ...data.goals.filter((x) => x.effective !== g.effective),
                  g,
                ],
              });
              setGoalOpen(false);
              notify("Targets saved as a new goal period.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function GoalEditor({
  data,
  onSave,
}: {
  data: Data;
  onSave: (g: Goal) => Promise<void>;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: data.profile!.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [g, setG] = useState<Goal>({
      ...activeGoal(data, today),
      id: uid(),
      effective: today,
    }),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave(g);
        } catch (e) {
          setError(String(e));
        }
      }}
    >
      <div className="form-grid">
        <Field label="Effective date">
          <input
            type="date"
            value={g.effective}
            onChange={(e) => setG({ ...g, effective: e.target.value })}
            required
          />
        </Field>
        <NumberField
          label="Calories per day"
          value={g.calories}
          onChange={(v) => setG({ ...g, calories: Number(v) })}
          min={1}
          required
        />
        <NumberField
          label="Drinking water (ml/day)"
          value={g.waterMl}
          onChange={(v) => setG({ ...g, waterMl: Number(v) })}
          min={1}
          required
        />
      </div>
      {g.calories < 1200 && (
        <p className="warning">
          This calorie target is unusually low. Consider reviewing it with a
          qualified professional.
        </p>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => {
          const fresh = seedGoal(data.profile!);
          setG({ ...fresh, effective: g.effective });
        }}
      >
        Regenerate reference targets from profile
      </button>
      <p className="fine-print">
        Targets are daily planning references. Form-specific upper limits are
        not applied to total nutrient intake.
      </p>
      {["Macros", "Fats", "Minerals", "Vitamins", "Other", "Amino acids"].map(
        (group) => (
          <details key={group} open={group === "Macros"}>
            <summary>{group}</summary>
            {nutrients
              .filter((n) => n.group === group)
              .map((n) => {
                const t = g.targets[n.id] ?? {};
                const change = (key: keyof Target, value: string) =>
                  setG({
                    ...g,
                    targets: {
                      ...g.targets,
                      [n.id]: {
                        ...t,
                        [key]:
                          value === ""
                            ? undefined
                            : key === "mode"
                              ? value
                              : Number(value),
                      },
                    },
                  });
                return (
                  <div className="target-row" key={n.id}>
                    <strong>
                      {n.name} <small>{n.unit}</small>
                    </strong>
                    <div className="form-grid">
                      <NumberField
                        label="Target"
                        value={t.value ?? ""}
                        onChange={(v) => change("value", v)}
                      />
                      <NumberField
                        label="Minimum"
                        value={t.min ?? ""}
                        onChange={(v) => change("min", v)}
                      />
                      <NumberField
                        label="Maximum"
                        value={t.max ?? ""}
                        onChange={(v) => change("max", v)}
                      />
                      {["protein", "carbs", "fat"].includes(n.id) && (
                        <Field label="Target units">
                          <select
                            value={t.mode ?? "grams"}
                            onChange={(e) => change("mode", e.target.value)}
                          >
                            <option value="grams">g/day</option>
                            <option value="percent">% of calories</option>
                            <option value="gkg">g/kg</option>
                          </select>
                        </Field>
                      )}
                    </div>
                  </div>
                );
              })}
          </details>
        ),
      )}
      <ErrorText error={error} />
      <button className="primary full">Save goals</button>
    </form>
  );
}
