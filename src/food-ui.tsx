import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Star,
  ScanLine,
  Trash2,
  Copy,
  Pencil,
  ArrowUpRight,
} from "lucide-react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import {
  type Data,
  type Food,
  type Recipe,
  foodSchema,
  uid,
  gramsFor,
  total,
  recipeFood,
  shiftDay,
} from "./domain";
import { nutrients } from "./nutrients";
import type { Save } from "./App";
import { db } from "./storage";
import { Field, NumberField, Toggle, ErrorText, Empty, Modal } from "./ui";
async function api(path: string) {
  if (!navigator.onLine) {
    const cached = await db.foodCache.get(path);
    if (cached) return cached.payload as any;
    throw Error(
      "This lookup is not cached yet. Use a saved food while offline.",
    );
  }
  const token = localStorage.getItem("daywell-api-token");
  if (!token)
    throw Error(
      "Add your food lookup token in Settings to use online databases. Custom and saved foods work offline.",
    );
  const response = await fetch(path, {
    headers: { Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json();
  if (!response.ok)
    throw Error(
      json.error ?? "Food provider is unavailable. Try a saved or custom food.",
    );
  await db.foodCache.put({
    key: path,
    at: new Date().toISOString(),
    payload: json,
  });
  return json;
}
export function Scanner({
  found,
  onClose,
}: {
  found: (code: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let controls: IScannerControls | undefined,
      cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromVideoDevice(undefined, ref.current!, (result) => {
        if (result && !cancelled) {
          cancelled = true;
          controls?.stop();
          found(result.getText());
        }
      })
      .then((c) => {
        controls = c;
        if (cancelled) c.stop();
      })
      .catch((e) =>
        setError(
          "Camera unavailable. Enter the barcode manually. " + String(e),
        ),
      );
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);
  return (
    <div className="scanner">
      <video ref={ref} autoPlay muted playsInline />
      <p>Point the camera at a UPC or EAN barcode.</p>
      <ErrorText error={error} />
      <button type="button" className="secondary" onClick={onClose}>
        Stop camera
      </button>
    </div>
  );
}
export function FoodPanel({
  data,
  date,
  meal,
  save,
  onDone,
}: {
  data: Data;
  date: string;
  meal: string;
  save: Save;
  onDone: () => void;
}) {
  const [q, setQ] = useState(""),
    [provider, setProvider] = useState("usda"),
    [results, setResults] = useState<Food[]>([]),
    [selected, setSelected] = useState<Food | null>(null),
    [custom, setCustom] = useState(false),
    [quantity, setQuantity] = useState("1"),
    [unit, setUnit] = useState("g"),
    [group, setGroup] = useState(meal),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [scan, setScan] = useState(false),
    [barcode, setBarcode] = useState(""),
    [cursor, setCursor] = useState<string | null>(null);
  const choose = async (f: Food) => {
    setError("");
    const saved = data.foods.find((x) => x.id === f.id);
    let full = saved ?? f;
    if (!saved && f.provider === "usda" && f.providerId) {
      setBusy(true);
      try {
        const response = await api(
          "/api/foods/usda/" + encodeURIComponent(f.providerId),
        );
        full = foodSchema.parse(response.food);
      } catch (e) {
        setError((e as Error).message + " Showing available search values.");
      } finally {
        setBusy(false);
      }
    }
    setSelected(full);
    setQuantity("1");
    setUnit(full.servings[0]?.name ?? "g");
    if (!saved) await save({ ...data, foods: [...data.foods, full] });
  };
  const search = async (page?: string) => {
    setBusy(true);
    setError("");
    try {
      const json = await api(
        `/api/foods/search?q=${encodeURIComponent(q)}&provider=${provider}${page ? "&cursor=" + page : ""}`,
      );
      const foods = json.foods.map((f: unknown) => foodSchema.parse(f));
      setResults(page ? [...results, ...foods] : foods);
      setCursor(json.cursor ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const lookup = async (code: string) => {
    setScan(false);
    setBarcode(code);
    setBusy(true);
    setError("");
    try {
      const json = await api("/api/foods/barcode/" + encodeURIComponent(code));
      await choose(foodSchema.parse(json.food));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (custom)
    return (
      <FoodEditor
        initial={selected ?? undefined}
        onCancel={() => setCustom(false)}
        onSave={async (f) => {
          await save({
            ...data,
            foods: [...data.foods.filter((x) => x.id !== f.id), f],
          });
          setSelected(f);
          setUnit(f.servings[0]?.name ?? "g");
          setCustom(false);
        }}
      />
    );
  if (selected) {
    let grams = 0;
    try {
      grams = gramsFor(selected, Number(quantity), unit);
    } catch {}
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const grams = gramsFor(selected, Number(quantity), unit);
            await save({
              ...data,
              foods: data.foods.some((f) => f.id === selected.id)
                ? data.foods
                : [...data.foods, selected],
              entries: [
                ...data.entries,
                {
                  id: uid(),
                  date,
                  time: new Date().toISOString(),
                  meal: group,
                  grams,
                  quantity: Number(quantity),
                  unit,
                  food: structuredClone(selected),
                },
              ],
            });
            onDone();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <button
          type="button"
          className="text-button"
          onClick={() => setSelected(null)}
        >
          ← Back to foods
        </button>
        <h3>{selected.name}</h3>
        <p className="subtle">
          {selected.brand} · {selected.attribution}
        </p>
        <small>
          {selected.edited ? "Locally edited · " : ""}
          {Object.values(selected.nutrients).filter((v) => v != null).length}/
          {nutrients.length} nutrients reported{" "}
          {selected.retrievedAt
            ? "· Retrieved " + selected.retrievedAt.slice(0, 10)
            : ""}
        </small>
        <div className="form-grid">
          <NumberField
            label="Quantity"
            value={quantity}
            onChange={setQuantity}
            min={0.001}
            required
          />
          <Field label="Serving">
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {[
                "g",
                "oz",
                ...(selected.density ? ["ml", "fl oz"] : []),
                ...selected.servings.map((s) => s.name),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Meal">
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {data.profile!.mealGroups.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="nutrition-preview">
          {["calories", "protein", "carbs", "fat"].map((id) => (
            <div key={id}>
              <strong>
                {selected.nutrients[id] != null
                  ? Math.round((selected.nutrients[id]! * grams) / 100)
                  : "—"}
              </strong>
              <small>
                {nutrients.find((n) => n.id === id)?.name}{" "}
                {id === "calories" ? "kcal" : "g"}
              </small>
            </div>
          ))}
        </div>
        <details>
          <summary>
            All nutrients for this portion ({grams.toFixed(1)} g)
          </summary>
          <div className="compact-nutrients">
            {nutrients.map((n) => (
              <div key={n.id}>
                <span>{n.name}</span>
                <span>
                  {selected.nutrients[n.id] != null
                    ? ((selected.nutrients[n.id]! * grams) / 100).toFixed(2) +
                      " " +
                      n.unit
                    : "Unknown"}
                </span>
              </div>
            ))}
          </div>
        </details>
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            onClick={() => setCustom(true)}
          >
            <Pencil size={14} /> Edit food
          </button>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              const f = { ...selected, favorite: !selected.favorite };
              await save({
                ...data,
                foods: [...data.foods.filter((x) => x.id !== f.id), f],
              });
              setSelected(f);
            }}
          >
            <Star
              size={15}
              fill={selected.favorite ? "currentColor" : "none"}
            />{" "}
            Favorite
          </button>
        </div>
        <ErrorText error={error} />
        <button className="primary full" disabled={busy || grams <= 0}>
          {busy ? "Saving…" : "Add to " + group}
        </button>
      </form>
    );
  }
  const local = data.foods
    .filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        Number(data.entries.some((e) => e.food.id === b.id)) -
          Number(data.entries.some((e) => e.food.id === a.id)),
    )
    .slice(0, 50);
  return (
    <>
      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search food"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setResults([]);
          }}
          placeholder="Search your foods or a database…"
        />
        <button className="primary" disabled={busy || q.trim().length < 2}>
          Search
        </button>
      </form>
      <div className="button-row">
        <Field label="Online database">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="usda">USDA FoodData Central</option>
            <option value="off">Open Food Facts</option>
          </select>
        </Field>
        <button className="secondary" onClick={() => setCustom(true)}>
          <Plus size={15} /> Create food
        </button>
      </div>
      <div className="barcode-row">
        <input
          aria-label="Barcode"
          inputMode="numeric"
          placeholder="Enter barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
        <button
          className="secondary"
          disabled={busy || !barcode}
          onClick={() => lookup(barcode)}
        >
          Look up
        </button>
        <button
          className="icon-button"
          aria-label="Scan barcode"
          onClick={() => setScan(true)}
        >
          <ScanLine />
        </button>
      </div>
      {scan && <Scanner found={lookup} onClose={() => setScan(false)} />}
      <ErrorText error={error} />
      {busy && <p role="status">Looking for your food…</p>}
      <h3>Saved & recent</h3>
      {!local.length && (
        <Empty title="Your food library starts here">
          Create a food from its label, or search a connected database. Saved
          foods stay available offline.
        </Empty>
      )}
      {local.map((f) => (
        <button className="food-result" key={f.id} onClick={() => choose(f)}>
          <span>
            <strong>{f.name}</strong>
            <small>
              {f.provider === "custom" ? "Your food" : f.brand || f.provider} ·{" "}
              {f.nutrients.calories ?? "—"} kcal / 100 g
            </small>
          </span>
          {f.favorite ? (
            <Star size={16} fill="currentColor" />
          ) : (
            <Plus size={17} />
          )}
        </button>
      ))}
      {!!results.length && (
        <>
          <h3>Database results</h3>
          {results.map((f) => (
            <button
              className="food-result"
              key={f.id}
              onClick={() => choose(f)}
            >
              <span>
                <strong>{f.name}</strong>
                <small>
                  {f.brand || f.provider} · {f.nutrients.calories ?? "—"} kcal /
                  100 g
                </small>
              </span>
              <Plus size={17} />
            </button>
          ))}
          {cursor && (
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => search(cursor!)}
            >
              More results
            </button>
          )}
        </>
      )}
      <p className="fine-print">
        USDA: public domain. Open Food Facts: ODbL; community data may be
        incomplete. Only lookup text is sent online.
      </p>
    </>
  );
}
export function FoodEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Food;
  onSave: (f: Food) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [brand, setBrand] = useState(initial?.brand ?? ""),
    [barcode, setBarcode] = useState(initial?.barcode ?? ""),
    [density, setDensity] = useState(initial?.density?.toString() ?? ""),
    [serving, setServing] = useState(initial?.servings[0]?.name ?? "serving"),
    [servingGrams, setServingGrams] = useState(
      initial?.servings[0]?.grams.toString() ?? "100",
    ),
    [basis, setBasis] = useState("100"),
    [values, setValues] = useState<Record<string, string>>(
      Object.fromEntries(
        Object.entries(initial?.nutrients ?? {}).map(([k, v]) => [
          k,
          v?.toString() ?? "",
        ]),
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
          const map: Food["nutrients"] = {};
          for (const n of nutrients) {
            const v = values[n.id];
            map[n.id] =
              v === "" || v === undefined
                ? null
                : (Number(v) * 100) / Number(basis);
          }
          if (map.carbs != null && map.fiber != null)
            map.netCarbs = Math.max(0, map.carbs - map.fiber);
          if (map.calories != null && map.kilojoules == null)
            map.kilojoules = map.calories * 4.184;
          const f = foodSchema.parse({
            ...initial,
            id: initial?.id ?? uid(),
            name,
            brand,
            barcode: barcode || undefined,
            provider: initial?.provider ?? "custom",
            density: density ? Number(density) : undefined,
            servings: [
              { name: serving, grams: Number(servingGrams) },
              ...(initial?.servings.slice(1) ?? []),
            ],
            nutrients: map,
            attribution: initial?.attribution ?? "Your custom food",
            edited: !!initial,
            revision: (initial?.revision ?? 0) + 1,
          });
          await onSave(f);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <button type="button" className="text-button" onClick={onCancel}>
        ← Back
      </button>
      <p className="form-intro">
        Enter the label’s known values. Leave unreported nutrients blank; enter
        0 only when the label explicitly reports zero.
      </p>
      <Field label="Food name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>
      <div className="form-grid">
        <Field label="Brand">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Barcode (optional)">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </Field>
        <Field label="Serving name">
          <input
            value={serving}
            onChange={(e) => setServing(e.target.value)}
            required
          />
        </Field>
        <NumberField
          label="Grams per serving"
          value={servingGrams}
          onChange={setServingGrams}
          min={0.001}
          required
        />
        <NumberField
          label="Nutrient values below are per (grams)"
          value={basis}
          onChange={setBasis}
          min={0.001}
          required
        />
        <NumberField
          label="Known density (g/ml, optional)"
          value={density}
          onChange={setDensity}
          min={0.001}
        />
      </div>
      {[
        "Energy",
        "Macros",
        "Fats",
        "Minerals",
        "Vitamins",
        "Other",
        "Amino acids",
      ].map((group, i) => (
        <details key={group} open={i < 2}>
          <summary>{group}</summary>
          <div className="form-grid">
            {nutrients
              .filter((n) => n.group === group && n.id !== "netCarbs")
              .map((n) => (
                <NumberField
                  key={n.id}
                  label={`${n.name} (${n.unit})`}
                  value={values[n.id] ?? ""}
                  onChange={(v) => setValues({ ...values, [n.id]: v })}
                />
              ))}
          </div>
        </details>
      ))}
      <ErrorText error={error} />
      <button className="primary full" disabled={busy}>
        {busy ? "Saving…" : "Save food"}
      </button>
    </form>
  );
}
export function Diary({
  data,
  date,
  save,
  add,
  notify,
}: {
  data: Data;
  date: string;
  save: Save;
  add: (meal: string) => void;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [copyTo, setCopyTo] = useState(shiftDay(date, 1)),
    [edit, setEdit] = useState<string | null>(null),
    [grams, setGrams] = useState(""),
    [meal, setMeal] = useState(""),
    [error, setError] = useState("");
  const entries = data.entries.filter((e) => e.date === date);
  return (
    <section className="card">
      <div className="card-heading">
        <h2>Your food diary</h2>
        <button
          className="primary"
          onClick={() => add(data.profile!.mealGroups[0])}
        >
          <Plus size={16} /> Add food
        </button>
      </div>
      <div className="diary-tools">
        <Toggle
          label="Select all"
          checked={!!entries.length && selected.length === entries.length}
          onChange={(v) => setSelected(v ? entries.map((e) => e.id) : [])}
        />
        <button
          className="secondary"
          disabled={!selected.length}
          onClick={async () => {
            await save({
              ...data,
              entries: data.entries.filter((e) => !selected.includes(e.id)),
            });
            setSelected([]);
            notify("Selected entries removed.");
          }}
        >
          <Trash2 size={14} /> Delete
        </button>
        <Field label="Copy destination">
          <input
            type="date"
            value={copyTo}
            onChange={(e) => setCopyTo(e.target.value)}
          />
        </Field>
        <button
          className="secondary"
          disabled={!entries.length || !copyTo}
          onClick={async () => {
            const source = selected.length
              ? entries.filter((e) => selected.includes(e.id))
              : entries;
            await save({
              ...data,
              entries: [
                ...data.entries,
                ...source.map((e) => ({ ...e, id: uid(), date: copyTo })),
              ],
            });
            notify(`${source.length} entries copied to ${copyTo}.`);
          }}
        >
          <Copy size={14} /> Copy {selected.length ? "selected" : "day"}
        </button>
      </div>
      {data.profile!.mealGroups.map((group) => {
        const items = entries.filter((e) => e.meal === group);
        return (
          <div className="diary-group" key={group}>
            <div className="card-heading">
              <h3>{group}</h3>
              <span>
                {items.length && total(items, "calories").value === null
                  ? "Unknown"
                  : Math.round(total(items, "calories").value ?? 0)}{" "}
                kcal{" "}
                <button
                  className="icon-button"
                  aria-label={"Add to " + group}
                  onClick={() => add(group)}
                >
                  <Plus size={16} />
                </button>
              </span>
            </div>
            {!items.length && <p className="subtle">No food logged yet.</p>}
            {items.map((entry) => (
              <div className="diary-entry" key={entry.id}>
                <input
                  aria-label={"Select " + entry.food.name}
                  type="checkbox"
                  checked={selected.includes(entry.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, entry.id]
                        : selected.filter((id) => id !== entry.id),
                    )
                  }
                />
                <span>
                  <strong>{entry.food.name}</strong>
                  <small>
                    {entry.quantity} {entry.unit} · {entry.grams.toFixed(1)} g ·{" "}
                    {entry.food.nutrients.calories == null
                      ? "Unknown"
                      : Math.round(total([entry], "calories").value!)}{" "}
                    kcal
                  </small>
                </span>
                <button
                  className="icon-button"
                  aria-label={"Edit " + entry.food.name}
                  onClick={() => {
                    setEdit(entry.id);
                    setGrams(entry.grams.toString());
                    setMeal(entry.meal);
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Duplicate " + entry.food.name}
                  onClick={async () => {
                    await save({
                      ...data,
                      entries: [...data.entries, { ...entry, id: uid() }],
                    });
                    notify("Entry duplicated.");
                  }}
                >
                  <Copy size={15} />
                </button>
              </div>
            ))}
          </div>
        );
      })}
      {!entries.length && (
        <Empty title="A fresh page for your meals">
          Build a day that feels good, one entry at a time.
        </Empty>
      )}
      {edit && (
        <Modal title="Edit diary entry" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await save({
                  ...data,
                  entries: data.entries.map((x) =>
                    x.id === edit
                      ? {
                          ...x,
                          grams: Number(grams),
                          quantity: Number(grams),
                          unit: "g",
                          meal,
                        }
                      : x,
                  ),
                });
                setEdit(null);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <NumberField
              label="Portion in grams"
              value={grams}
              onChange={setGrams}
              min={0.001}
              required
            />
            <Field label="Meal">
              <select value={meal} onChange={(e) => setMeal(e.target.value)}>
                {data.profile!.mealGroups.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <ErrorText error={error} />
            <button className="primary full">Save changes</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
export function Recipes({
  data,
  save,
  date,
  notify,
}: {
  data: Data;
  save: Save;
  date: string;
  notify: (s: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Recipe | null>(null);
  return (
    <section className="card space-top">
      <div className="card-heading">
        <div>
          <p className="eyebrow">YOUR REPEAT FAVORITES</p>
          <h2>Recipes & saved meals</h2>
        </div>
        <button
          className="secondary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={15} /> Create
        </button>
      </div>
      {!data.recipes.length ? (
        <p className="subtle">
          Turn a recipe or a go-to combination into a one-tap meal.
        </p>
      ) : (
        data.recipes.map((r) => (
          <div className="food-result" key={r.id}>
            <span>
              <strong>{r.name}</strong>
              <small>
                {r.template ? "Saved meal" : "Recipe"} · {r.portions} portions ·{" "}
                {r.yieldGrams} g yield
              </small>
            </span>
            <button
              className="icon-button"
              aria-label={"Edit " + r.name}
              onClick={() => {
                setEditing(r);
                setOpen(true);
              }}
            >
              <Pencil size={15} />
            </button>
            <button
              className="secondary"
              onClick={async () => {
                const food = recipeFood(r);
                await save({
                  ...data,
                  entries: [
                    ...data.entries,
                    {
                      id: uid(),
                      date,
                      time: new Date().toISOString(),
                      meal: data.profile!.mealGroups[0],
                      food,
                      grams: r.yieldGrams / r.portions,
                      quantity: 1,
                      unit: "portion",
                    },
                  ],
                });
                notify(
                  "One portion added to " + data.profile!.mealGroups[0] + ".",
                );
              }}
            >
              Log portion
            </button>
          </div>
        ))
      )}
      {open && (
        <Modal
          title={
            editing ? "Edit recipe / meal" : "Build a recipe or saved meal"
          }
          onClose={() => setOpen(false)}
        >
          <RecipeEditor
            data={data}
            initial={editing ?? undefined}
            onSave={async (r) => {
              const food = recipeFood(r);
              await save({
                ...data,
                recipes: [...data.recipes.filter((x) => x.id !== r.id), r],
                foods: [...data.foods.filter((x) => x.id !== r.id), food],
              });
              setOpen(false);
              notify("Recipe saved. Past diary entries stay unchanged.");
            }}
          />
        </Modal>
      )}
    </section>
  );
}
function RecipeEditor({
  data,
  initial,
  onSave,
}: {
  data: Data;
  initial?: Recipe;
  onSave: (r: Recipe) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [items, setItems] = useState<Recipe["ingredients"]>(
      initial?.ingredients ?? [],
    ),
    [yieldGrams, setYield] = useState(initial?.yieldGrams.toString() ?? ""),
    [portions, setPortions] = useState(initial?.portions.toString() ?? "1"),
    [template, setTemplate] = useState(initial?.template ?? false),
    [foodId, setFoodId] = useState(""),
    [grams, setGrams] = useState("100"),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          if (!items.length) throw Error("Add at least one ingredient.");
          await onSave({
            id: initial?.id ?? uid(),
            name,
            ingredients: items,
            yieldGrams:
              Number(yieldGrams) || items.reduce((s, i) => s + i.grams, 0),
            portions: Number(portions),
            template,
            revision: (initial?.revision ?? 0) + 1,
          });
        } catch (e) {
          setError(String(e));
        }
      }}
    >
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>
      <Toggle
        label="This is a saved meal combination"
        checked={template}
        onChange={setTemplate}
      />
      <div className="form-grid">
        <Field label="Ingredient from your food library">
          <select value={foodId} onChange={(e) => setFoodId(e.target.value)}>
            <option value="">Choose a food</option>
            {data.foods
              .filter((f) => f.id !== initial?.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </select>
        </Field>
        <NumberField
          label="Ingredient grams"
          value={grams}
          onChange={setGrams}
          min={0.001}
        />
      </div>
      <button
        type="button"
        className="secondary"
        disabled={!foodId || Number(grams) <= 0}
        onClick={() => {
          setItems([
            ...items,
            {
              food: data.foods.find((f) => f.id === foodId)!,
              grams: Number(grams),
            },
          ]);
          setFoodId("");
        }}
      >
        Add ingredient
      </button>
      {items.map((item, i) => (
        <div className="food-result" key={i}>
          <span>
            {item.food.name} · {item.grams} g
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={"Remove " + item.food.name}
            onClick={() => setItems(items.filter((_, j) => i !== j))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <div className="form-grid">
        <NumberField
          label="Final cooked yield (grams)"
          value={yieldGrams}
          onChange={setYield}
          min={0.001}
        />
        <NumberField
          label="Number of portions"
          value={portions}
          onChange={setPortions}
          min={0.001}
          required
        />
      </div>
      <small>
        Leave yield blank to use ingredient weight. A final cooked weight
        accounts for water gain/loss; no nutrient retention factors are assumed.
      </small>
      <ErrorText error={error} />
      <button className="primary full">
        Save {template ? "meal" : "recipe"}
      </button>
    </form>
  );
}
