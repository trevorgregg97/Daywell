import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  Sprout,
  Sun,
  Moon,
  Plus,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  BarChart3,
  Settings,
  Leaf,
  Check,
  Flame,
  Footprints,
  Droplets,
  ShieldCheck,
  CalendarDays,
  WifiOff,
} from "lucide-react";
import {
  type Data,
  type CheckIn,
  type Profile,
  dayKey,
  shiftDay,
  activeGoal,
  total,
  formatWeight,
  weightUnit,
} from "./domain";
import { readData, writeData, unlock, db } from "./storage";
import { energyModel } from "./model";
import { targetValue, nutrients } from "./nutrients";
import { Modal, Empty } from "./ui";
import { CheckInForm, ObservationForm, ProfileForm } from "./forms";
import { FoodPanel, Diary, Recipes } from "./food-ui";
import { Trends, NutrientsView, SettingsView } from "./views";
import { NutrientHighlights } from "./insights";
export type Save = (next: Data) => Promise<void>;
const tabs = [
  ["today", "Today", Sun],
  ["diary", "Food diary", BookOpen],
  ["nutrients", "Nutrients", Leaf],
  ["trends", "Trends", BarChart3],
  ["settings", "Settings", Settings],
] as const;
export default function App() {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("today"),
    [date, setDate] = useState(dayKey()),
    [modal, setModal] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [locked, setLocked] = useState(!!localStorage.getItem("daywell-lock")),
    [password, setPassword] = useState("");
  const {
    needRefresh: [updateReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    readData()
      .then((d) => {
        setData(d);
        if (d.profile) setDate(dayKey(new Date(), d.profile.timezone));
      })
      .catch((e) => setError("Could not open local storage: " + e.message));
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (modal) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [modal]);
  const save: Save = async (next) => {
    try {
      await writeData(next, data ?? undefined);
      setData(await readData());
    } catch (e) {
      setError("Could not save. Your last saved data is intact. " + String(e));
      throw e;
    }
  };
  const notify = (s: string) => setMessage(s);
  if (!data)
    return (
      <main className="loading">
        <Sprout />
        <h1>Daywell</h1>
        <p>{error || "Opening your daily balance…"}</p>
      </main>
    );
  if (locked)
    return (
      <main className="lock">
        <Sprout size={42} />
        <h1>Welcome back.</h1>
        <p>Unlock your Daywell journal.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await unlock(password)) {
              setLocked(false);
              setPassword("");
              setError("");
            } else setError("Incorrect password.");
          }}
        >
          <input
            aria-label="App password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="primary">Unlock</button>
        </form>
        <p role="alert">{error}</p>
        <small>
          This local screen lock does not encrypt the live database.
        </small>
      </main>
    );
  const p = data.profile,
    g = activeGoal(data, date),
    today = dayKey(new Date(), p?.timezone),
    entries = data.entries.filter((e) => e.date === date),
    check = data.checks.find((c) => c.date === date),
    model = p ? energyModel(data, date) : null;
  const calories = total(entries, "calories");
  const completed = check?.complete;
  const amDue =
    p &&
    date === today &&
    !check?.am &&
    new Date().toLocaleTimeString("en-GB", {
      timeZone: p.timezone,
      hour: "2-digit",
      minute: "2-digit",
    }) >= p.amTime;
  const pmDue =
    p &&
    date === today &&
    (!check?.pm || check.steps === null) &&
    new Date().toLocaleTimeString("en-GB", {
      timeZone: p.timezone,
      hour: "2-digit",
      minute: "2-digit",
    }) >= p.pmTime;
  const close = () => setModal("");
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("today");
          }}
        >
          <span className="brand-mark">
            <Sprout size={25} />
          </span>
          daywell<span className="brand-dot">.</span>
        </a>
        <p className="eyebrow side-caption">YOUR DAILY BALANCE</p>
        <nav aria-label="Main navigation">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Just for you.</strong>
              <small>Your data stays on this device.</small>
            </div>
          </div>
          <button
            className="profile-button"
            onClick={() => setModal("profile")}
          >
            <span className="avatar">
              {p?.name?.slice(0, 1).toUpperCase() || "Y"}
            </span>
            <span>
              <strong>{p?.name || "Your profile"}</strong>
              <small>Personal space</small>
            </span>
            <Settings size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Your personal space <span>/</span>{" "}
            {tabs.find((t) => t[0] === tab)?.[1]}
          </span>
          <div className="top-actions">
            <span className={"local-status " + (!online ? "offline" : "")}>
              {online ? <ShieldCheck size={14} /> : <WifiOff size={14} />}
              <span>
                {online ? "Saved on this device" : "Offline · ready to log"}
              </span>
            </span>
            <span className="avatar small">
              {p?.name?.slice(0, 1).toUpperCase() || "Y"}
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h1>
                {tab === "today"
                  ? `A little better, every day${p?.name ? ", " + p.name.split(" ")[0] : ""}.`
                  : tab === "diary"
                    ? "Make every meal count."
                    : tab === "nutrients"
                      ? "The bigger nutrition picture."
                      : tab === "trends"
                        ? "Find your rhythm."
                        : "Make it your own."}
              </h1>
              <p>
                {tab === "today"
                  ? "Nourish well. Check in. See what works for you."
                  : tab === "diary"
                    ? "Your meals, portions, and the details that matter."
                    : tab === "nutrients"
                      ? "See what is known, what is missing, and how it adds up."
                      : tab === "trends"
                        ? "Small daily observations. A clearer view over time."
                        : "Your goals, your privacy, your preferences."}
              </p>
            </div>
            {tab !== "settings" && (
              <div className="date-switch">
                <button
                  aria-label="Previous day"
                  onClick={() => setDate(shiftDay(date, -1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <label>
                  <CalendarDays size={15} />
                  <input
                    aria-label="Selected date"
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                  />
                </label>
                <button
                  aria-label="Next day"
                  disabled={date >= today}
                  onClick={() => setDate(shiftDay(date, 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </div>
          {error && (
            <div className="banner error" role="alert">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {updateReady && (
            <div className="banner">
              A fresh version of Daywell is ready.
              <button
                disabled={!!modal}
                onClick={() => updateServiceWorker(true)}
              >
                Update now
              </button>
              {modal && <small>Finish your entry first.</small>}
            </div>
          )}
          {p &&
            (!p.lastBackup ||
              Date.now() - Date.parse(p.lastBackup) >
                p.backupDays * 86400000) && (
              <div className="backup-strip">
                <ShieldCheck size={15} />
                <span>
                  {p.lastBackup
                    ? "Time for a fresh backup."
                    : "Protect your first entries with an encrypted backup."}
                </span>
                <button onClick={() => setTab("settings")}>
                  Back up <ArrowUpRight size={13} />
                </button>
              </div>
            )}
          {tab === "today" && (
            <>
              <section className="overview-grid">
                <div className="card energy-card">
                  <div className="section-label">
                    <span>
                      <Flame size={17} />
                      DAILY ENERGY
                    </span>
                    <span className="pill">
                      {completed ? "Day complete" : "In progress"}
                    </span>
                  </div>
                  <div className="energy-content">
                    <div
                      className="calorie-ring"
                      style={
                        {
                          "--progress": `${Math.min(100, ((calories.value ?? 0) / (g?.calories || 2200)) * 100)}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div>
                        <strong>
                          {calories.value === null && calories.count
                            ? "—"
                            : Math.round(calories.value ?? 0).toLocaleString()}
                        </strong>
                        <span>kcal logged</span>
                      </div>
                    </div>
                    <div className="energy-numbers">
                      <strong>
                        {Math.round(
                          Math.max(
                            0,
                            (g?.calories || 2200) - (calories.value ?? 0),
                          ),
                        ).toLocaleString()}
                      </strong>
                      <span>kcal remaining</span>
                      <small>
                        of {(g?.calories || 2200).toLocaleString()} daily target
                      </small>
                      {calories.known < calories.count && (
                        <small className="warning">
                          Some energy values are unknown
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="macro-grid">
                    {["protein", "carbs", "fat"].map((id, i) => {
                      const v = total(entries, id),
                        target =
                          g && p
                            ? targetValue(id, g.targets[id], g, p)
                            : [120, 240, 70][i];
                      return (
                        <div key={id}>
                          <div>
                            <span>
                              {nutrients.find((n) => n.id === id)?.name}
                            </span>
                            <strong>
                              {v.value === null && v.count
                                ? "—"
                                : Math.round(v.value ?? 0)}
                              <small> / {Math.round(target ?? 0)} g</small>
                            </strong>
                          </div>
                          <div className={"track macro-" + i}>
                            <span
                              style={{
                                width:
                                  Math.min(
                                    100,
                                    ((v.value ?? 0) / (target || 1)) * 100,
                                  ) + "%",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="card checkin-card">
                  <div className="section-label">
                    <span>YOUR DAILY RITUAL</span>
                    <span className="subtle">
                      {Number(!!check?.am) +
                        Number(!!check?.pm && check?.steps !== null)}
                      /2 check-ins
                    </span>
                  </div>
                  <button
                    className="checkin-row"
                    onClick={() => setModal("am")}
                  >
                    <span className="ritual-icon morning">
                      <Sun size={24} />
                    </span>
                    <span>
                      <strong>Morning check-in</strong>
                      <small>
                        {check?.am && p
                          ? `${formatWeight(check.am.kg, p)} ${weightUnit(p)} · ${check.am.fasted ? "Fasted" : "Non-fasted"}`
                          : "A fresh start. Your fasted weight."}
                      </small>
                      {amDue && <em>Ready when you are</em>}
                    </span>
                    <span
                      className={"circle-action " + (check?.am ? "done" : "")}
                    >
                      {check?.am ? <Check size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                  <button
                    className="checkin-row"
                    onClick={() => setModal("pm")}
                  >
                    <span className="ritual-icon evening">
                      <Moon size={23} />
                    </span>
                    <span>
                      <strong>Evening check-in</strong>
                      <small>
                        {check?.pm && p
                          ? `${formatWeight(check.pm.kg, p)} ${weightUnit(p)} · ${check.steps?.toLocaleString() ?? "—"} steps`
                          : "Close the day. Weight, steps & reflection."}
                      </small>
                      {pmDue && <em>Time to reflect on your day</em>}
                    </span>
                    <span
                      className={"circle-action " + (check?.pm ? "done" : "")}
                    >
                      {check?.pm ? <Check size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                  <p className="card-footnote">
                    Consistency brings the picture into focus.
                  </p>
                </div>
              </section>
              <section className="dashboard-lower">
                <div className="card meals-card">
                  <div className="card-heading">
                    <div>
                      <p className="eyebrow">ON YOUR PLATE</p>
                      <h2>Today’s food</h2>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setModal("food")}
                    >
                      <Plus size={16} /> Add food
                    </button>
                  </div>
                  {(
                    p?.mealGroups || ["Breakfast", "Lunch", "Dinner", "Snacks"]
                  ).map((meal, i) => {
                    const e = entries.filter((e) => e.meal === meal),
                      t = total(e, "calories");
                    return (
                      <button
                        className="meal-row"
                        key={meal}
                        onClick={() => {
                          setTab("diary");
                          setModal("food:" + meal);
                        }}
                      >
                        <span className={"meal-symbol m" + i}>
                          {["☀", "◒", "☾", "✧", "✚"][i % 5]}
                        </span>
                        <span>
                          <strong>{meal}</strong>
                          <small>
                            {e.length
                              ? e.map((x) => x.food.name).join(", ")
                              : "Something nourishing starts here"}
                          </small>
                        </span>
                        <span className="meal-calories">
                          {t.value !== null ? Math.round(t.value) : "—"}
                          <small> kcal</small>
                        </span>
                        <Plus size={17} />
                      </button>
                    );
                  })}
                  <button
                    className="text-button full"
                    onClick={() => setTab("diary")}
                  >
                    Open food diary <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="right-stack"></div>
              </section>
              <section className="quick-stats">
                <div>
                  <Footprints size={18} />
                  <span>
                    <strong>{check?.steps?.toLocaleString() ?? "—"}</strong>
                    <small>steps today</small>
                  </span>
                </div>
                <div>
                  <Flame size={18} />
                  <span>
                    <strong>
                      {model
                        ? Math.round(model.baseline).toLocaleString()
                        : "—"}{" "}
                      <small>kcal</small>
                    </strong>
                    <small>estimated daily expenditure</small>
                  </span>
                </div>
                <button onClick={() => setModal("wellness")}>
                  <Plus size={18} />
                  <span>
                    <strong>A moment for you</strong>
                    <small>Log wellness or measurements</small>
                  </span>
                </button>
              </section>
              {p && g && <NutrientHighlights data={data} date={date} />}
            </>
          )}
          {tab === "diary" && p && (
            <>
              <Diary
                data={data}
                date={date}
                save={save}
                add={(meal) => setModal("food:" + meal)}
                notify={notify}
              />
              <Recipes data={data} save={save} date={date} notify={notify} />
            </>
          )}
          {tab === "nutrients" && p && (
            <NutrientsView data={data} date={date} />
          )}
          {tab === "trends" && p && (
            <Trends
              data={data}
              date={date}
              edit={(d, kind) => {
                setDate(d);
                setModal(kind);
              }}
            />
          )}
          {tab === "settings" && p && (
            <SettingsView
              data={data}
              save={save}
              notify={notify}
              editProfile={() => setModal("profile")}
              observation={() => setModal("wellness")}
            />
          )}
          <footer className="page-footer">
            <Sprout size={15} />
            <span>A little more awareness. A little more you.</span>
            <span>Private by design · Daywell</span>
          </footer>
        </main>
      </div>
      {(!p || modal === "profile") && (
        <Modal
          title={p ? "Your personal profile" : "Welcome to Daywell"}
          onClose={() => p && close()}
        >
          <ProfileForm data={data} save={save} onDone={close} />
        </Modal>
      )}
      {p && (modal === "am" || modal === "pm") && (
        <Modal
          title={
            modal === "am" ? "Your morning check-in" : "Your evening check-in"
          }
          onClose={close}
        >
          <CheckInForm
            kind={modal}
            date={date}
            data={data}
            save={save}
            onDone={() => {
              close();
              notify("Check-in saved on this device.");
            }}
          />
        </Modal>
      )}
      {p && modal.startsWith("food") && (
        <Modal title="Add something nourishing" onClose={close}>
          <FoodPanel
            data={data}
            date={date}
            meal={modal.split(":")[1] || p.mealGroups[0]}
            save={save}
            onDone={() => {
              close();
              notify("Food added to your diary.");
            }}
          />
        </Modal>
      )}
      {p && modal === "wellness" && (
        <Modal title="Wellness" onClose={close}>
          <ObservationForm
            data={data}
            date={date}
            initial="wellness"
            save={save}
            onDone={() => {
              close();
              notify("Observation saved.");
            }}
          />
        </Modal>
      )}
      {message && (
        <div className="toast" role="status">
          <Check size={17} />
          {message}
        </div>
      )}
    </div>
  );
}
