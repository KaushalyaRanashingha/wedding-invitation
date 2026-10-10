import { useEffect, useRef, useState } from "react";
import "./page.css";
import { supabase } from "./lib/supabaseClient";

/* ---------- Edit these ---------- */
const WEDDING = new Date("2027-06-12T16:00:00+05:30");
const HOTEL = {
  name: "The Grand Lotus Hotel",
  address: "Galle Face Promenade, Colombo 03, Sri Lanka",
  lat: 6.9247,
  lng: 79.8451,
};
// Put your photos in /public/hotel/ and rename here
const PHOTOS = [
  { src: "/hotel/lobby.webp", title: "Grand lobby" },
  { src: "/hotel/ballroom.jpg", title: "Ballroom" },
  { src: "/hotel/garden.jpg", title: "Lotus garden" },
  { src: "/hotel/pool.jpg", title: "Poolside" },
  { src: "/hotel/sea.jpg", title: "Sea view" },
  { src: "/hotel/room.jpg", title: "Guest suite" },
];

/* ---------- Helpers ---------- */
const rad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function bearing(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const fmtDist = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

/* ---------- Hooks ---------- */
function useCountdown(target) {
  const calc = () => Math.max(0, target - Date.now());
  const [ms, setMs] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setMs(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return { Days: Math.floor(ms / 864e5), Hours: Math.floor((ms % 864e5) / 36e5), Mins: Math.floor((ms % 36e5) / 6e4), Secs: Math.floor((ms % 6e4) / 1e3) };
}

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.15 });
    ref.current && io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

function useTracker() {
  const [on, setOn] = useState(false);
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");
  const watch = useRef(null);
  const stop = () => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; setOn(false);
  };
  const start = () => {
    if (!navigator.geolocation) return setError("Location is not supported on this device.");
    setError(""); setOn(true);
    watch.current = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => { setError(e.code === 1 ? "Location permission was denied. Allow it in your browser settings and try again." : "Could not get your location."); stop(); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  };
  useEffect(() => stop, []);
  return { on, pos, error, start, stop };
}

/* ---------- Lotus ---------- */
function Lotus({ size = 220, className = "" }) {
  const back = [-72, -48, -24, 24, 48, 72];
  const front = [-40, -14, 14, 40, 0];
  return (
    <svg className={`lotus ${className}`} width={size} viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e7b0" /><stop offset="1" stopColor="#c9a227" /></linearGradient>
        <linearGradient id="pf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#bcd0ff" /></linearGradient>
      </defs>
      <ellipse cx="100" cy="138" rx="70" ry="8" fill="#1f4fd8" opacity=".25" className="ripple" />
      {back.map((a, i) => (
        <path key={a} className="petal" d="M100 128 C78 100 80 52 100 18 C120 52 122 100 100 128Z" fill="url(#pb)" stroke="#9a7b12" strokeWidth=".8"
          style={{ "--a": `${a}deg`, "--d": `${0.1 * i}s` }} />
      ))}
      {front.map((a, i) => (
        <path key={a} className="petal" d="M100 128 C80 104 82 60 100 30 C118 60 120 104 100 128Z" fill="url(#pf)" stroke="#6f8fe0" strokeWidth=".8"
          style={{ "--a": `${a}deg`, "--d": `${0.5 + 0.1 * i}s` }} />
      ))}
      <circle cx="100" cy="112" r="6" fill="#c9a227" className="core" />
    </svg>
  );
}

/* ---------- Photo with fallback ---------- */
function Photo({ src, alt }) {
  const [bad, setBad] = useState(false);
  if (bad) return <div className="photo-fallback" role="img" aria-label={alt}><Lotus size={70} /></div>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} />;
}

/* ---------- Sections ---------- */
function Section({ id, title, children }) {
  const [ref, shown] = useReveal();
  return (
    <section id={id} ref={ref} className={`sec ${shown ? "in" : ""}`}>
      <h2>{title}</h2>
      <div className="rule"><span /><i>❁</i><span /></div>
      {children}
    </section>
  );
}

function Hero() {
  const t = useCountdown(WEDDING);
  return (
    <header className="hero">
      <CouplePhoto small />
      <p className="small">Together with their families</p>
      <h1>Amelia <em>&amp;</em> James</h1>
      <p className="small">Saturday, 12 June 2027 · 4:00 PM</p>
      <div className="count">
        {Object.entries(t).map(([k, v]) => (<div key={k}><b>{String(v).padStart(2, "0")}</b><small>{k}</small></div>))}
      </div>
      <a className="btn gold" href="#rsvp">RSVP now</a>
    </header>
  );
}

function Hotel() {
  const { on, pos, error, start, stop } = useTracker();
  const d = 0.005;
  const map = `https://www.openstreetmap.org/export/embed.html?bbox=${HOTEL.lng - d}%2C${HOTEL.lat - d}%2C${HOTEL.lng + d}%2C${HOTEL.lat + d}&layer=mapnik&marker=${HOTEL.lat}%2C${HOTEL.lng}`;
  const dest = `${HOTEL.lat},${HOTEL.lng}`;
  const km = pos ? distanceKm(pos, HOTEL) : null;
  const arrow = pos ? bearing(pos, HOTEL) : 0;
  return (
    <Section id="venue" title="The Venue">
      <div className="hotel-card">
        <div className="hotel-photo"><Photo src={PHOTOS[0].src} alt={HOTEL.name} /><span className="tag">📍 Wedding venue</span></div>
        <div className="hotel-body">
          <h3>{HOTEL.name}</h3>
          <p>{HOTEL.address}</p>
          <div className="map"><iframe title="Hotel map" src={map} loading="lazy" /></div>
          <div className="row">
            <a className="btn gold" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`}>Get directions</a>
            <a className="btn ghost" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${dest}`}>Open in Maps</a>
          </div>
          <div className={`tracker ${on ? "live" : ""}`}>
            <div className="compass" style={{ "--r": `${arrow}deg` }} aria-hidden="true"><span>▲</span></div>
            <div className="tinfo">
              {!on && <><b>Live distance</b><small>See how far you are from the hotel as you travel.</small></>}
              {on && !pos && <><b>Finding you…</b><small>Allow location access if asked.</small></>}
              {on && pos && <><b>{fmtDist(km)} away</b><small>About {Math.max(1, Math.round((km / 30) * 60))} min by car · arrow points to the hotel</small></>}
            </div>
            <button className={`btn ${on ? "ghost" : "blue"}`} onClick={on ? stop : start}>{on ? "Stop" : "Track me"}</button>
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <p className="note">Your location stays on your device and is never saved.</p>
        </div>
      </div>
    </Section>
  );
}

function Gallery() {
  const [open, setOpen] = useState(null);
  const go = (n) => setOpen((i) => (i + n + PHOTOS.length) % PHOTOS.length);
  useEffect(() => {
    if (open === null) return;
    const k = (e) => (e.key === "Escape" ? setOpen(null) : e.key === "ArrowRight" ? go(1) : e.key === "ArrowLeft" ? go(-1) : null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  return (
    <Section id="gallery" title="Hotel Gallery">
      <div className="gallery">
        {PHOTOS.map((p, i) => (
          <button key={p.src} className={`g g${i}`} onClick={() => setOpen(i)} aria-label={`View ${p.title}`}>
            <Photo src={p.src} alt={p.title} /><span>{p.title}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button className="x" onClick={() => setOpen(null)} aria-label="Close">×</button>
          <button className="nav l" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous">‹</button>
          <figure onClick={(e) => e.stopPropagation()}>
            <Photo key={open} src={PHOTOS[open].src} alt={PHOTOS[open].title} />
            <figcaption>{PHOTOS[open].title} · {open + 1}/{PHOTOS.length}</figcaption>
          </figure>
          <button className="nav r" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next">›</button>
        </div>
      )}
    </Section>
  );
}

function Schedule() {
  const items = [
    ["3:30 PM", "Welcome drinks & Poruwa ceremony", "Drums, chants and the traditional blessing."],
    ["5:00 PM", "Vows & rings", "On the lawn, facing the sunset."],
    ["7:00 PM", "Dinner & dancing", "Ceylon banquet, toasts and live jazz."],
  ];
  return (
    <Section id="day" title="The Day">
      <ol className="timeline">
        {items.map(([t, h, p]) => (<li key={t}><time>{t}</time><h3>{h}</h3><p>{p}</p></li>))}
      </ol>
    </Section>
  );
}

/* ---------- Couple photo (put your photo at /public/couple.jpg) ---------- */
function CouplePhoto({ small = false }) {
  return (
    <div className={`arch ${small ? "sm" : ""}`}>
      <div className="arch-in"><Photo src="/couple.jpg" alt="Amelia and James" /></div>
      <Lotus size={small ? 70 : 90} className="badge" />
    </div>
  );
}

/* ---------- RSVP ---------- */
const ADULT_MEALS = ["Chicken", "Fish", "Vegetarian", "Vegan", "Halal"];
const KID_MEALS = ["Kids menu", "Chicken", "Vegetarian"];
const mk = (kid) => ({ name: "", contact: "", meal: kid ? "Kids menu" : "Chicken", age: "", kid });
const sync = (old, a, k) => {
  const ad = old.filter((p) => !p.kid), kd = old.filter((p) => p.kid);
  return [...Array.from({ length: a }, (_, i) => ad[i] || mk(false)), ...Array.from({ length: k }, (_, i) => kd[i] || mk(true))];
};
const okContact = (v) => /^\S+@\S+\.\S+$/.test(v) || v.replace(/\D/g, "").length >= 9;

/* Seat rule: adults and children aged 10+ take a seat. Under 10 = no seat. */
const needsSeat = (p) => !p.kid || (p.age !== "" && +p.age >= 10);
const seatsOf = (list) => list.filter(needsSeat).length;

/* ---------- Supabase: table public.wedding_rsvps ---------- */
const newCode = () => "LT-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

async function saveRec(rec) {
  const yes = rec.attending === "yes";
  const row = {
    response_code: rec.code,
    attending: yes,
    relation: rec.relation,
    adults: yes ? rec.adults : 1,       // table rule: adults 0-6
    kids: yes ? rec.kids : 0,           // table rule: kids 0-4
    note: rec.note?.trim() || null,
    guests: rec.people,                 // jsonb array, 1-10 people
  };
  if (rec.replaces) row.replaces_code = rec.replaces; // only used when a guest edits (see extra SQL)
  const { error } = await supabase.from("wedding_rsvps").insert(row); // no .select(): anon has insert-only access
  return { error };
}
async function loadStats() {
  const { data, error } = await supabase.rpc("rsvp_stats");
  return !error && data ? data : { accepted: 0, guests: 0, seats: 0 };
}
function StatsBar({ ver }) {
  const [st, setSt] = useState({ accepted: 0, guests: 0, seats: 0 });
  useEffect(() => {
    let live = true;
    const load = () => loadStats().then((d) => live && setSt(d));
    load();
    const id = setInterval(load, 30000);
    return () => { live = false; clearInterval(id); };
  }, [ver]);
  return (
    <div className="stats" aria-live="polite">
      {[["Accepted", st.accepted, "replies"], ["Guests", st.guests, "attending"], ["Seats booked", st.seats, "confirmed"]].map(([l, v, sub]) => (
        <div key={l}><b key={v}>{v}</b><span>{l}</span><small>{sub}</small></div>
      ))}
    </div>
  );
}

function Counter({ v, min, max, onChange, unit }) {
  return (
    <div className="counter">
      <button type="button" onClick={() => onChange(Math.max(min, v - 1))} aria-label="Fewer">−</button>
      <b>{v}</b><small>{unit}{v === 1 ? "" : "s"}</small>
      <button type="button" onClick={() => onChange(Math.min(max, v + 1))} aria-label="More">+</button>
    </div>
  );
}
function Choice({ on, emoji, label, sub, onPick, name }) {
  return (
    <label className={`choice ${on ? "on" : ""}`}>
      <input type="radio" name={name} checked={on} onChange={onPick} /><span>{emoji}</span>
      <div><div>{label}</div>{sub && <small>{sub}</small>}</div>
    </label>
  );
}

function RSVP() {
  const [f, setF] = useState({ attending: "yes", relation: "Friend", adults: 1, hasKids: false, kids: 0, note: "" });
  const [people, setPeople] = useState(() => sync([], 1, 0));
  const [i, setI] = useState(0);
  const [err, setErr] = useState("");
  const [ver, setVer] = useState(0);
  const [editCode, setEditCode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem("rsvp2")); } catch { return null; } });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const counts = (a, k) => { setF((s) => ({ ...s, adults: a, kids: k, hasKids: k > 0 })); setPeople((p) => sync(p, a, k)); };
  const kidsOpen = (yes) => counts(f.adults, yes ? Math.max(1, f.kids) : 0) || setF((s) => ({ ...s, hasKids: yes }));
  const setP = (n, k, v) => setPeople((p) => p.map((x, j) => (j === n ? { ...x, [k]: v } : x)));

  const yes = f.attending === "yes";
  const flow = yes ? ["coming", "count", ...people.map((_, n) => "p" + n), "review"] : ["coming", "p0", "review"];
  const key = flow[i];

  const validate = () => {
    if (key[0] === "p") {
      const n = +key.slice(1), p = people[n];
      if (p.name.trim().length < 2) return "Please enter this person's full name.";
      if (p.kid && (p.age === "" || +p.age > 17)) return "Please enter the child's age (0–17).";
      if (!p.kid) {
        if (n === 0 && !okContact(p.contact)) return "Enter a valid phone number or email so we can reach you.";
        if (n > 0 && p.contact && !okContact(p.contact)) return "That phone number or email doesn't look right.";
      }
    }
    return "";
  };
  const next = async () => {
    const e = validate(); setErr(e); if (e) return;
    if (i < flow.length - 1) return setI(i + 1);
    const list = yes ? people : people.slice(0, 1);
    let rec, error;
    setSaving(true);
    for (let t = 0; t < 3; t++) { // retry if the random code is already taken
      rec = { ...f, code: newCode(), replaces: editCode, people: list, seats: yes ? seatsOf(list) : 0, at: new Date().toISOString() };
      ({ error } = await saveRec(rec));
      if (!error || error.code !== "23505") break;
    }
    setSaving(false);
    if (error) { console.error("RSVP save failed:", error); return setErr("We couldn't save your reply. Please check your connection and try again."); }
    try { localStorage.setItem("rsvp2", JSON.stringify(rec)); } catch {}
    setVer((v) => v + 1); setEditCode(null); setDone(rec);
  };

  if (done) return (
    <Section id="rsvp" title="R.S.V.P.">
      <StatsBar ver={ver} />
      <div className="form done">
        <Lotus size={110} />
        <h3>{done.attending === "yes" ? "See you there!" : "We'll miss you"}</h3>
        <p>Thank you, {done.people[0].name.split(" ")[0]}.{done.attending === "yes" && ` We booked ${done.seats ?? seatsOf(done.people)} seat${(done.seats ?? seatsOf(done.people)) === 1 ? "" : "s"} for you.`}</p>
        {done.attending === "yes" && done.people.length > (done.seats ?? seatsOf(done.people)) && <p className="hint free">Children under 10 don't need a seat.</p>}
        <div className="sum left">
          {done.people.map((p, n) => <div key={n}><span>{p.name}{p.kid && " (child)"}</span><b>{done.attending === "yes" ? p.meal : "—"}</b></div>)}
        </div>
        <div className="code">{done.code}</div><br />
        <button className="btn ghost" onClick={() => { const { people: pp, code, at, seats, replaces, ...ff } = done; setEditCode(code); setF(ff); setPeople(pp); setI(0); setDone(null); }}>Change my reply</button>
      </div>
    </Section>
  );

  const n = key[0] === "p" ? +key.slice(1) : 0, p = people[n];
  const adultsN = people.filter((x) => !x.kid).length;
  return (
    <Section id="rsvp" title="R.S.V.P.">
      <p className="center muted">Reply by 1 May 2027 · no account needed</p>
      <StatsBar ver={ver} />
      <div className="form">
        <div className="bar">{flow.map((_, j) => <i key={j} className={j <= i ? "on" : ""} />)}</div>
        <div key={key} className="step">
          {key === "coming" && <>
            <h3>Will you join us?</h3>
            <Choice name="att" on={yes} emoji="🪷" label="Joyfully accepts" sub="I'll be there" onPick={() => set("attending", "yes")} />
            <Choice name="att" on={!yes} emoji="💌" label="Regretfully declines" sub="Sending love from afar" onPick={() => set("attending", "no")} />
            <p className="q">You are a…</p>
            <div className="two">
              <Choice name="rel" on={f.relation === "Friend"} emoji="🤝" label="Friend" onPick={() => set("relation", "Friend")} />
              <Choice name="rel" on={f.relation === "Family"} emoji="👨‍👩‍👧" label="Family" onPick={() => set("relation", "Family")} />
            </div>
          </>}
          {key === "count" && <>
            <h3>Who's coming?</h3>
            <p className="q">Adults, including you</p>
            <Counter v={f.adults} min={1} max={6} unit="adult" onChange={(a) => counts(a, f.kids)} />
            <p className="q">Are you bringing kids?</p>
            <div className="two">
              <Choice name="kid" on={!f.hasKids} emoji="🙅" label="No kids" onPick={() => kidsOpen(false)} />
              <Choice name="kid" on={f.hasKids} emoji="🧒" label="Yes, kids" onPick={() => kidsOpen(true)} />
            </div>
            {f.hasKids && <Counter v={f.kids} min={1} max={4} unit="child" onChange={(k) => counts(f.adults, k)} />}
            <p className="hint">🪑 Adults and children aged <b>10 and over</b> take a seat. Children under 10 don't need one. You'll enter each child's age next.</p>
          </>}
          {key[0] === "p" && <>
            <span className="pill2">{yes ? `Person ${n + 1} of ${people.length}` : "Your details"}{p.kid && " · Child"}</span>
            <h3>{n === 0 ? "You" : p.kid ? `Child ${n - adultsN + 1}` : `Guest ${n + 1}`}</h3>
            <label>Full name<input value={p.name} onChange={(e) => setP(n, "name", e.target.value)} placeholder={p.kid ? "Child's name" : "Anura Senanayake"} autoComplete={n === 0 ? "name" : "off"} /></label>
            {p.kid
              ? <><label>Age<input inputMode="numeric" value={p.age} onChange={(e) => setP(n, "age", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="e.g. 6" /></label>
                {p.age !== "" && <p className={`hint ${+p.age >= 10 ? "seat" : "free"}`}>{+p.age >= 10 ? "🪑 Needs a seat (age 10 and over)" : "No seat needed (under 10)"}</p>}</>
              : <label>Phone or email {n > 0 && <small className="muted">(optional)</small>}<input value={p.contact} onChange={(e) => setP(n, "contact", e.target.value)} placeholder="+94 77 123 4567" autoComplete={n === 0 ? "email" : "off"} /></label>}
            {yes && <><p className="q">Meal choice</p>
              <div className="chips">{(p.kid ? KID_MEALS : ADULT_MEALS).map((m) => (
                <button type="button" key={m} className={p.meal === m ? "on" : ""} onClick={() => setP(n, "meal", m)}>{m}</button>))}</div></>}
          </>}
          {key === "review" && <>
            <h3>Almost done</h3>
            <div className="sum">
              <div><span>Reply</span><b>{yes ? "Attending" : "Declines"}</b></div>
              <div><span>Group</span><b>{f.relation}</b></div>
              {yes && <div><span>Seats needed</span><b>{seatsOf(people)}</b></div>}
              {(yes ? people : people.slice(0, 1)).map((x, j) => <div key={j}><span>{x.name}{x.kid && ` (child${x.age ? ", " + x.age : ""})`}</span><b>{yes ? x.meal : "—"}</b></div>)}
            </div>
            <label style={{ marginTop: 14 }}>Message for the couple (optional)<textarea rows="3" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Can't wait to celebrate with you…" /></label>
          </>}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row">
          {i > 0 && <button className="btn ghost" onClick={() => { setErr(""); setI(i - 1); }}>Back</button>}
          <button className="btn gold" onClick={next} disabled={saving}>{key === "review" ? (saving ? "Sending…" : "Send RSVP") : key[0] === "p" && i < flow.length - 2 ? "Next person" : "Continue"}</button>
        </div>
      </div>
    </Section>
  );
}

export default function App() {
  const [opened, setOpened] = useState(false);
  return (
    <div className="app">
      {!opened && (
        <div className="gate">
          <CouplePhoto />
          <h2>Amelia &amp; James</h2>
          <p>12 · 06 · 2027</p>
          <button className="btn gold" onClick={() => setOpened(true)}>Open invitation</button>
        </div>
      )}
      {opened && (<>
        <nav className="top"><b>A ❁ J</b>
          <div><a href="#venue">Venue</a><a href="#gallery">Gallery</a><a href="#rsvp">RSVP</a></div>
        </nav>
        <Hero /><Schedule /><Hotel /><Gallery /><RSVP />
        <footer>Amelia Vance &amp; James Sterling · 12.06.2027</footer>
      </>)}
    </div>
  );
}