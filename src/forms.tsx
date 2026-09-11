import { useState } from "react";
import {
  type Data,
  type CheckIn,
  type Observation,
  defaultProfile,
  displayToKg,
  formatWeight,
  weightUnit,
  uid,
  checkSchema,
  profileSchema,
} from "./domain";
import { seedGoal, nutrients } from "./nutrients";
import type { Save } from "./App";
import { Field, NumberField, Toggle, ErrorText } from "./ui";
export function ProfileForm({
  data,
  save,
  onDone,
}: {
  data: Data;
  save: Save;
  onDone: () => void;
}) {
  const [p, setP] = useState(data.profile ?? defaultProfile()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (key: string, value: unknown) => setP({ ...p, [key]: value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const profile = profileSchema.parse(p);
          await save({
            ...data,
            profile,
            goals: data.goals.length ? data.goals : [seedGoal(profile)],
          });
          navigator.storage?.persist?.().catch(() => {});
          onDone();
        } catch (e) {
          setError(String(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        A few details help set your starting targets. Everything stays on this
        device, and every target is editable.
      </p>
      <Field label="Your name">
        <input
          value={p.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="What should we call you?"
        />
      </Field>
      <div className="form-grid">
        <NumberField
          label="Age"
          value={p.age}
          onChange={(v) => update("age", Number(v))}
          min={18}
          max={120}
          step="1"
          required
        />
        <Field label="Resting equation / DRI category">
          <select value={p.sex} onChange={(e) => update("sex", e.target.value)}>
            <option value="male">Male reference</option>
            <option value="female">Female reference</option>
          </select>
        </Field>
        <Field label="Display units">
          <select
            value={p.units}
            onChange={(e) => update("units", e.target.value)}
          >
            <option value="imperial">Pounds / inches</option>
            <option value="metric">Kilograms / centimeters</option>
          </select>
        </Field>
        <Field label="Weight precision">
          <select
            value={p.precision}
            onChange={(e) => update("precision", e.target.value)}
          >
            <option>0.1</option>
            <option>0.01</option>
          </select>
        </Field>
        <Field label={p.units === "imperial" ? "Height (in)" : "Height (cm)"}>
          <input
            key={"height:" + p.units}
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            required
            defaultValue={
              +(p.heightCm / (p.units === "imperial" ? 2.54 : 1)).toFixed(2)
            }
            onChange={(e) =>
              update(
                "heightCm",
                Number(e.target.value) * (p.units === "imperial" ? 2.54 : 1),
              )
            }
          />
        </Field>
        <Field label={"Starting weight (" + weightUnit(p) + ")"}>
          <input
            key={"weight:" + p.units}
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            required
            defaultValue={formatWeight(p.weightKg, p)}
            onChange={(e) =>
              update("weightKg", displayToKg(Number(e.target.value), p))
            }
          />
        </Field>
        <Field label="Starting activity estimate">
          <select
            value={p.activity}
            onChange={(e) => update("activity", Number(e.target.value))}
          >
            <option value={1.2}>Mostly sedentary</option>
            <option value={1.4}>Lightly active</option>
            <option value={1.6}>Moderately active</option>
            <option value={1.8}>Very active</option>
          </select>
        </Field>
        <Field label="Goal direction">
          <select
            value={p.goal}
            onChange={(e) => update("goal", e.target.value)}
          >
            <option value="maintain">Maintain</option>
            <option value="lose">Lose weight</option>
            <option value="gain">Gain weight</option>
          </select>
        </Field>
        {p.goal !== "maintain" && (
          <NumberField
            label="Desired change (kg/week)"
            value={p.rate}
            onChange={(v) => update("rate", Number(v))}
            max={2}
          />
        )}
        <Field label="Life stage">
          <select
            value={p.lifeStage}
            onChange={(e) => update("lifeStage", e.target.value)}
          >
            <option value="standard">Standard adult</option>
            <option value="pregnant">Pregnant</option>
            <option value="lactating">Lactating</option>
          </select>
        </Field>
        <Field label="Timezone">
          <input
            value={p.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            required
          />
        </Field>
        <Field label="Morning prompt">
          <input
            type="time"
            value={p.amTime}
            onChange={(e) => update("amTime", e.target.value)}
          />
        </Field>
        <Field label="Evening prompt">
          <input
            type="time"
            value={p.pmTime}
            onChange={(e) => update("pmTime", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Dietary pattern">
        <input
          value={p.diet}
          onChange={(e) => update("diet", e.target.value)}
          placeholder="e.g. vegetarian, Mediterranean"
        />
      </Field>
      <Field
        label="Allergens / food preferences"
        hint="A personal reference; database results cannot guarantee allergen safety."
      >
        <input
          value={p.allergens}
          onChange={(e) => update("allergens", e.target.value)}
        />
      </Field>
      <Field label="Meal groups (comma-separated)">
        <input
          value={p.mealGroups.join(", ")}
          onChange={(e) =>
            update(
              "mealGroups",
              e.target.value.split(",").map((x) => x.trim()),
            )
          }
        />
      </Field>
      <details>
        <summary>Nutrients to highlight on Today</summary>
        <div className="form-grid">
          {nutrients
            .filter(
              (n) => !["Energy", "Macros", "Amino acids"].includes(n.group),
            )
            .map((n) => (
              <Toggle
                key={n.id}
                label={n.name}
                checked={p.interest.includes(n.id)}
                onChange={(v) =>
                  update(
                    "interest",
                    v
                      ? [...p.interest, n.id]
                      : p.interest.filter((id) => id !== n.id),
                  )
                }
              />
            ))}
        </div>
      </details>
      {p.rate > 0.75 && p.goal === "lose" && (
        <p className="warning">
          This is an aggressive loss rate. You can use a gentler target in
          Settings.
        </p>
      )}
      {p.lifeStage !== "standard" && (
        <p className="warning">
          Reference nutrient targets reflect life stage. Set your calorie target
          individually; the resting formula does not account for pregnancy or
          lactation.
        </p>
      )}
      <ErrorText error={error} />
      <button className="primary full" disabled={busy}>
        {busy
          ? "Saving…"
          : data.profile
            ? "Save profile"
            : "Make yourself at home"}
      </button>
    </form>
  );
}
export function CheckInForm({
  kind,
  date,
  data,
  save,
  onDone,
}: {
  kind: "am" | "pm";
  date: string;
  data: Data;
  save: Save;
  onDone: () => void;
}) {
  const p = data.profile!;
  const existing = data.checks.find((c) => c.date === date);
  const m = existing?.[kind];
  const [weight, setWeight] = useState(m ? formatWeight(m.kg, p) : ""),
    [time, setTime] = useState(
      m?.time ??
        `${date}T${new Date().toLocaleTimeString("en-GB", { timeZone: p.timezone, hour: "2-digit", minute: "2-digit" })}`,
    ),
    [fasted, setFasted] = useState(m?.fasted ?? kind === "am"),
    [bathroom, setBathroom] = useState(m?.bathroom ?? false),
    [sameScale, setSameScale] = useState(m?.sameScale ?? true),
    [sameClothes, setSameClothes] = useState(m?.sameClothes ?? true),
    [excluded, setExcluded] = useState(m?.excluded ?? false),
    [normally, setNormally] = useState(m?.includeNormally ?? false),
    [notes, setNotes] = useState(m?.notes ?? ""),
    [steps, setSteps] = useState(existing?.steps?.toString() ?? ""),
    [complete, setComplete] = useState(existing?.complete ?? false),
    [illness, setIllness] = useState(existing?.illness ?? false),
    [reflection, setReflection] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        Object.entries(
          data.observations.find((o) => o.id === "evening:" + date)?.values ??
            {},
        ).map(([k, v]) => [k, String(v)]),
      ),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (time.slice(0, 10) !== date)
            throw Error(
              "Measurement date must match this check-in day. Change the selected day to record another date.",
            );
          const next: CheckIn = checkSchema.parse({
            ...existing,
            date,
            timezone: p.timezone,
            [kind]: weight
              ? {
                  kg: displayToKg(Number(weight), p),
                  time,
                  fasted,
                  bathroom,
                  sameScale,
                  sameClothes,
                  excluded,
                  includeNormally: normally,
                  notes,
                }
              : undefined,
            steps:
              kind === "pm"
                ? steps === ""
                  ? null
                  : Number(steps)
                : (existing?.steps ?? null),
            complete: kind === "pm" ? complete : (existing?.complete ?? false),
            illness,
            notes: existing?.notes ?? "",
          });
          await save({
            ...data,
            checks: [...data.checks.filter((c) => c.date !== date), next],
            observations:
              kind === "pm"
                ? [
                    ...data.observations.filter(
                      (o) => o.id !== "evening:" + date,
                    ),
                    ...(Object.values(reflection).some((v) => v !== "")
                      ? [
                          {
                            id: "evening:" + date,
                            date,
                            time,
                            kind: "wellness" as const,
                            values: Object.fromEntries(
                              Object.entries(reflection)
                                .filter(([, v]) => v !== "")
                                .map(([k, v]) => [k, Number(v)]),
                            ),
                            notes,
                          },
                        ]
                      : []),
                  ]
                : data.observations,
          });
          onDone();
        } catch (e) {
          setError(String(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        {kind === "am"
          ? "Before food or drink, ideally after the bathroom, on the same scale."
          : "Before bed, record your weight and the steps from your phone or tracker."}{" "}
        · {date}
      </p>
      <div className="form-grid">
        <NumberField
          label={"Weight (" + weightUnit(p) + ")"}
          value={weight}
          onChange={setWeight}
          min={1}
          step={p.precision}
        />
        <Field label="Measurement time">
          <input
            type="datetime-local"
            value={time.slice(0, 16)}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </Field>
      </div>
      {kind === "am" ? (
        <>
          <Toggle
            label="Fasted, before food or drink"
            checked={fasted}
            onChange={setFasted}
          />
          <Toggle
            label="After using the bathroom"
            checked={bathroom}
            onChange={setBathroom}
          />
        </>
      ) : (
        <>
          <NumberField
            label="Total steps for this day"
            value={steps}
            onChange={setSteps}
            step="1"
            max={200000}
          />
          <Toggle
            label="My food diary is complete for this day"
            checked={complete}
            onChange={setComplete}
          />
          <small>
            Missing steps are kept as unknown, never zero. You may save steps
            without a weight.
          </small>
        </>
      )}
      <Toggle
        label="Same scale and location"
        checked={sameScale}
        onChange={setSameScale}
      />
      <Toggle
        label="Similar clothing"
        checked={sameClothes}
        onChange={setSameClothes}
      />
      <Toggle
        label="Illness or unusual conditions today"
        checked={illness}
        onChange={setIllness}
      />
      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Travel, salty meal, poor sleep, or anything worth remembering…"
        />
      </Field>
      {kind === "pm" && (
        <details>
          <summary>Evening reflection (optional)</summary>
          <div className="form-grid">
            {[
              ["sleepPlan", "Planned sleep (hours)"],
              ["hunger", "Hunger (1–5)"],
              ["energy", "Energy (1–5)"],
              ["mood", "Mood (1–5)"],
              ["digestion", "Digestion (1–5)"],
            ].map(([key, label]) => (
              <NumberField
                key={key}
                label={label}
                value={reflection[key] ?? ""}
                min={key === "sleepPlan" ? 0 : 1}
                max={key === "sleepPlan" ? 24 : 5}
                onChange={(v) => setReflection({ ...reflection, [key]: v })}
              />
            ))}
          </div>
        </details>
      )}
      <details>
        <summary>Model preferences for this measurement</summary>
        <Toggle
          label="Exclude this weight from modeling"
          checked={excluded}
          onChange={setExcluded}
        />
        {kind === "am" && !fasted && (
          <Toggle
            label="Use non-fasted weight at normal confidence"
            checked={normally}
            onChange={setNormally}
          />
        )}
      </details>
      <ErrorText error={error} />
      <button className="primary full" disabled={busy}>
        {busy ? "Saving…" : "Save check-in"}
      </button>
    </form>
  );
}
export function ObservationForm({
  data,
  date,
  initial,
  save,
  onDone,
}: {
  data: Data;
  date: string;
  initial: Observation["kind"];
  save: Save;
  onDone: () => void;
}) {
  const [kind, setKind] = useState(initial),
    [values, setValues] = useState<Record<string, string | boolean>>({}),
    [notes, setNotes] = useState(""),
    [error, setError] = useState("");
  const fields =
    kind === "exercise"
      ? [
          ["type", "Activity"],
          ["minutes", "Duration (minutes)"],
          ["calories", "Estimated active calories"],
        ]
      : kind === "body"
        ? [
            ["bodyFat", "Body fat (%)"],
            ["waist", "Waist (cm)"],
            ["hip", "Hip (cm)"],
            ["chest", "Chest (cm)"],
            ["neck", "Neck (cm)"],
          ]
        : [
            ["sleep", "Sleep (hours)"],
            ["hunger", "Hunger (1–5)"],
            ["energy", "Energy (1–5)"],
            ["mood", "Mood (1–5)"],
            ["digestion", "Digestion (1–5)"],
          ];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const parsed: Observation["values"] = {};
          for (const [k, v] of Object.entries(values)) {
            if (v === "") continue;
            parsed[k] = k === "type" || typeof v === "boolean" ? v : Number(v);
          }
          await save({
            ...data,
            observations: [
              ...data.observations,
              {
                id: uid(),
                date,
                time: new Date().toISOString(),
                kind,
                values: parsed,
                notes,
              },
            ],
          });
          onDone();
        } catch (e) {
          setError(String(e));
        }
      }}
    >
      <Field label="What would you like to record?">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as Observation["kind"]);
            setValues({});
          }}
        >
          <option value="exercise">Exercise</option>
          <option value="wellness">Wellness</option>
          <option value="body">Body measurements</option>
        </select>
      </Field>
      <div className="form-grid">
        {fields.map(([key, label]) =>
          key === "type" ? (
            <Field key={key} label={label}>
              <input
                value={String(values[key] ?? "")}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
              />
            </Field>
          ) : (
            <NumberField
              key={key}
              label={label}
              value={String(values[key] ?? "")}
              onChange={(v) => setValues({ ...values, [key]: v })}
              max={
                ["hunger", "energy", "mood", "digestion"].includes(key)
                  ? 5
                  : key === "sleep"
                    ? 24
                    : undefined
              }
            />
          ),
        )}
      </div>
      {kind === "exercise" && (
        <Toggle
          label="Non-step activity (e.g. cycling or swimming) — include active calories separately"
          checked={!!values.nonStep}
          onChange={(v) => setValues({ ...values, nonStep: v })}
        />
      )}
      <Field label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ErrorText error={error} />
      <button className="primary full">Save observation</button>
    </form>
  );
}
