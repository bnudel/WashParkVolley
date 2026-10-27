// ---------------------------------------------------
// Season summary — stats + awards + weather report.
// Depends on globals from script.js: parseHeaderDate, parseLocalDate,
// weatherIcon, escapeHTML, SEASON_YEAR, WEEKDAYS, MONTHS_LONG,
// START_HOUR, END_HOUR, WEATHER_LAT, WEATHER_LON.
//
// To remove an award: delete its line from AWARD_BUILDERS or WEATHER_BUILDERS.
// To add one: write a builder (see ironLibero) and add it to the list.
// Each builder returns a card object or null (null = card is skipped).
// ---------------------------------------------------

let summaryToken = 0; // guards against stale async weather after a Refresh

/* ---------- helpers ---------- */

function fmtNight(iso) {
  const d = parseLocalDate(iso);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS_LONG[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

function nameList(names, max = 3) {
  const shown = names.slice(0, max).map(escapeHTML).join(", ");
  return names.length > max ? `${shown} +${names.length - max} more` : shown;
}

// dir: 1 = highest score wins, -1 = lowest. Returns { value, winners } or null.
function best(items, score, dir = 1) {
  let value = null;
  let winners = [];
  items.forEach((it) => {
    const v = score(it);
    if (v == null) return;
    if (value === null || v * dir > value * dir) { value = v; winners = [it]; }
    else if (v === value) winners.push(it);
  });
  return value === null ? null : { value, winners };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const tieNote = (w) => (w.length > 1 ? " each" : "");

/* ---------- data prep ---------- */

function buildNights(dateLabels, players) {
  const nights = [];
  dateLabels.forEach((label, i) => {
    const iso = parseHeaderDate(label, SEASON_YEAR);
    if (!iso) return;
    const attendees = players.filter((p) => (p.dates[i]?.count || 0) > 0);
    nights.push({
      idx: i,
      label,
      iso,
      headcount: attendees.length,
      games: players.reduce((s, p) => s + (p.dates[i]?.count || 0), 0),
      names: attendees.map((p) => p.name),
    });
  });
  return nights.sort((a, b) => a.iso.localeCompare(b.iso));
}

function buildContext(dateLabels, players) {
  const allNights = buildNights(dateLabels, players);
  // A night with zero attendance is treated as not played (e.g. canceled).
  const played = allNights.filter((n) => n.headcount > 0);
  const half = Math.floor(played.length / 2);

  const people = players.map((p) => {
    const present = played.map((n) => (p.dates[n.idx]?.count || 0) > 0);
    const attended = present.filter(Boolean).length;
    const first = present.slice(0, half).filter(Boolean).length;
    const second = present.slice(half).filter(Boolean).length;

    let streak = 0, run = 0, maxGap = 0, lastSeen = -1;
    present.forEach((here, k) => {
      if (here) {
        run++;
        streak = Math.max(streak, run);
        if (lastSeen >= 0) maxGap = Math.max(maxGap, k - lastSeen - 1);
        lastSeen = k;
      } else {
        run = 0;
      }
    });

    return { name: p.name, total: p.total, present, attended, first, second, streak, maxGap };
  });

  return { played, people, half };
}

/* ---------- attendance awards ---------- */

function ironLibero({ people }) {
  const b = best(people, (p) => p.total);
  if (!b || b.value <= 0) return null;
  return {
    label: "Most games played",
    award: "The Iron Libero",
    winner: nameList(b.winners.map((p) => p.name)),
    detail: `${plural(b.value, "game")}${tieNote(b.winners)}. Never subbed out.`,
  };
}

function neverMissAServe({ people, played }) {
  if (played.length < 3) return null;
  const perfect = people.filter((p) => p.attended === played.length);
  if (!perfect.length) return null;
  return {
    label: "Perfect attendance",
    award: "Never Missed a Serve",
    winner: nameList(perfect.map((p) => p.name)),
    detail: `All ${played.length} nights. Show-offs.`,
  };
}

function rallyKing({ people }) {
  const b = best(people, (p) => p.streak);
  if (!b || b.value < 2) return null;
  return {
    label: "Longest streak",
    award: "Rally King",
    winner: nameList(b.winners.map((p) => p.name)),
    detail: `${plural(b.value, "night")} in a row${tieNote(b.winners)}. The rally just kept going.`,
  };
}

function fullCourtPress({ played }) {
  const b = best(played, (n) => n.headcount);
  if (!b || played.length < 2) return null;
  const n = b.winners[0];
  return {
    label: "Biggest night",
    award: "Full Court Press",
    winner: fmtNight(n.iso),
    detail: `${n.headcount} players showed up. Court was packed.`,
  };
}

function skeletonCrew({ played }) {
  const hi = Math.max(...played.map((n) => n.headcount));
  const b = best(played, (n) => n.headcount, -1);
  if (!b || played.length < 2 || b.value === hi) return null;
  const n = b.winners[0];
  return {
    label: "Smallest night",
    award: "Skeleton Crew",
    winner: fmtNight(n.iso),
    detail: `Only ${n.headcount} players. Every touch was a hero ball.`,
  };
}

function primeTime({ played }) {
  const byDay = {};
  played.forEach((n) => {
    const d = parseLocalDate(n.iso).getDay();
    (byDay[d] = byDay[d] || []).push(n.headcount);
  });
  const days = Object.keys(byDay);
  if (days.length < 2) return null; // all games on one weekday — nothing to compare
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const b = best(days, (d) => avg(byDay[d]));
  return {
    label: "Best weekday",
    award: "Prime Time",
    winner: WEEKDAYS[b.winners[0]],
    detail: `${avg(byDay[b.winners[0]]).toFixed(1)} players on average.`,
  };
}

function theCloser({ people, played, half }) {
  if (played.length < 4) return null;
  const eligible = people.filter((p) => p.attended >= 3);
  const b = best(eligible, (p) => p.second - p.first);
  if (!b || b.value < 2) return null;
  const p = b.winners[0];
  return {
    label: "Late-season surge",
    award: "The Closer",
    winner: nameList(b.winners.map((x) => x.name)),
    detail: `${p.second} of ${p.attended} nights came in the back half. Saved the best for the final set.`,
  };
}

function earlyServer({ people, played }) {
  if (played.length < 4) return null;
  const eligible = people.filter((p) => p.attended >= 3);
  const b = best(eligible, (p) => p.second - p.first, -1);
  if (!b || b.value > -2) return null;
  const p = b.winners[0];
  return {
    label: "Early-season hero",
    award: "Early Server",
    winner: nameList(b.winners.map((x) => x.name)),
    detail: `${p.first} of ${p.attended} nights came in the front half. Where'd you go?`,
  };
}

function prodigalPasser({ people }) {
  const b = best(people, (p) => p.maxGap);
  if (!b || b.value < 2) return null;
  return {
    label: "Longest absence, then came back",
    award: "Prodigal Passer",
    winner: nameList(b.winners.map((p) => p.name)),
    detail: `Missed ${plural(b.value, "night")} straight, then returned. Welcome back to the sand.`,
  };
}

function aceCameo({ people }) {
  const once = people.filter((p) => p.attended === 1);
  if (!once.length) return null;
  return {
    label: "One-night appearances",
    award: "Ace Cameos",
    winner: plural(once.length, "player"),
    detail: `${nameList(once.map((p) => p.name), 4)}. Came, served once, vanished.`,
  };
}

const AWARD_BUILDERS = [
  ironLibero,
  neverMissAServe,
  rallyKing,
  fullCourtPress,
  skeletonCrew,
  primeTime,
  theCloser,
  earlyServer,
  prodigalPasser,
  aceCameo,
];

/* ---------- headline numbers + attendance chart ---------- */

function headlineStats({ played, people }) {
  const totalGames = people.reduce((s, p) => s + p.total, 0);
  const totalHeads = played.reduce((s, n) => s + n.headcount, 0);
  const regulars = people.filter((p) => played.length && p.attended / played.length >= 0.5).length;
  return [
    { value: played.length, label: "Nights played" },
    { value: people.filter((p) => p.attended > 0).length, label: "Different players" },
    { value: played.length ? (totalHeads / played.length).toFixed(1) : "0", label: "Avg per night" },
    { value: totalGames, label: "Games logged" },
    { value: regulars, label: "Regulars (50%+ of nights)" },
  ];
}

function renderChart(played) {
  const max = Math.max(1, ...played.map((n) => n.headcount));
  return `
    <p class="summary__sub">Turnout by night</p>
    <div class="turnout" role="img" aria-label="Bar chart of players per night">
      ${played
        .map((n) => {
          const d = parseLocalDate(n.iso);
          return `<div class="turnout__col" title="${escapeHTML(fmtNight(n.iso))}: ${n.headcount} players">
            <span class="turnout__val">${n.headcount}</span>
            <span class="turnout__bar" style="height:${Math.round((n.headcount / max) * 100)}%"></span>
            <span class="turnout__lbl">${d.getMonth() + 1}/${d.getDate()}</span>
          </div>`;
        })
        .join("")}
    </div>`;
}

/* ---------- weather (Open-Meteo historical archive) ---------- */

async function fetchGameWeather(played) {
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dates = played.map((n) => n.iso).filter((d) => d <= todayISO);
  if (!dates.length) return {};

  const params = new URLSearchParams({
    latitude: WEATHER_LAT,
    longitude: WEATHER_LON,
    start_date: dates[0],
    end_date: dates[dates.length - 1],
    hourly: "temperature_2m,precipitation,wind_speed_10m,weather_code",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "America/Denver",
  });
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`);
  if (!res.ok) throw new Error("weather archive failed");
  const h = (await res.json()).hourly;
  if (!h?.time) throw new Error("no hourly data");

  const out = {};
  dates.forEach((iso) => {
    const temps = [], precips = [], winds = [], codes = [];
    h.time.forEach((t, i) => {
      if (!t.startsWith(iso)) return;
      const hour = parseInt(t.slice(11, 13), 10);
      if (hour < START_HOUR || hour >= END_HOUR) return; // only the game window
      if (h.temperature_2m[i] != null) temps.push(h.temperature_2m[i]);
      if (h.precipitation[i] != null) precips.push(h.precipitation[i]);
      if (h.wind_speed_10m[i] != null) winds.push(h.wind_speed_10m[i]);
      if (h.weather_code[i] != null) codes.push(h.weather_code[i]);
    });
    if (!temps.length) return;
    out[iso] = {
      temp: temps.reduce((s, x) => s + x, 0) / temps.length,
      precip: precips.reduce((s, x) => s + x, 0),
      wind: Math.max(...winds, 0),
      code: Math.max(...codes, 0), // highest WMO code ≈ most severe conditions
    };
  });
  return out;
}

const withWeather = (played, wx) =>
  played.filter((n) => wx[n.iso]).map((n) => ({ ...n, wx: wx[n.iso] }));

function heatCheck({ nights }) {
  const b = best(nights, (n) => Math.round(n.wx.temp));
  if (!b || nights.length < 2) return null;
  const n = b.winners[0];
  return {
    label: "Hottest night",
    award: "Heat Check",
    winner: fmtNight(n.iso),
    detail: `${Math.round(n.wx.temp)}° during play. Sunscreen was a teammate.`,
    code: n.wx.code,
  };
}

function coldSet({ nights }) {
  const b = best(nights, (n) => Math.round(n.wx.temp), -1);
  if (!b || nights.length < 2) return null;
  const n = b.winners[0];
  return {
    label: "Coldest night",
    award: "Cold Set",
    winner: fmtNight(n.iso),
    detail: `${Math.round(n.wx.temp)}° during play. Hands stung on every dig.`,
    code: n.wx.code,
  };
}

function wetCourt({ nights }) {
  const b = best(nights, (n) => n.wx.precip);
  if (!b || b.value < 0.01) return null;
  const n = b.winners[0];
  return {
    label: "Rainiest night",
    award: "Wet Court Advantage",
    winner: fmtNight(n.iso),
    detail: `${n.wx.precip.toFixed(2)}" of rain during play. ${n.headcount} players showed anyway.`,
    code: n.wx.code,
  };
}

function sideOutGale({ nights }) {
  const b = best(nights, (n) => Math.round(n.wx.wind));
  if (!b || nights.length < 2) return null;
  const n = b.winners[0];
  return {
    label: "Windiest night",
    award: "Side-Out Gale",
    winner: fmtNight(n.iso),
    detail: `Winds up to ${Math.round(n.wx.wind)} mph. Every serve was a knuckleball.`,
    code: n.wx.code,
  };
}

function rainDelayIndex({ nights }) {
  const wet = nights.filter((n) => n.wx.precip >= 0.01);
  const dry = nights.filter((n) => n.wx.precip < 0.01);
  if (!wet.length || !dry.length) return null;
  const avg = (a) => a.reduce((s, n) => s + n.headcount, 0) / a.length;
  const w = avg(wet), d = avg(dry);
  const pct = Math.round(Math.abs(1 - w / d) * 100);
  return {
    label: "Does rain stop play?",
    award: "Rain Delay Index",
    winner: `${d.toFixed(1)} dry vs ${w.toFixed(1)} wet`,
    detail:
      pct < 3
        ? "Turnout was about the same. This group is waterproof."
        : w < d
        ? `Rain cut turnout by ${pct}%. Fair-weather spikers.`
        : `Turnout was ${pct}% higher in the rain. Mud-hardened.`,
  };
}

function sunshine({ nights }) {
  const clear = nights.filter((n) => n.wx.code <= 2).length;
  if (nights.length < 3) return null;
  return {
    label: "Sky report",
    award: "Vitamin D Rally",
    winner: `${clear} of ${nights.length} nights`,
    detail: "were clear or mostly clear during play.",
  };
}

const WEATHER_BUILDERS = [heatCheck, coldSet, wetCourt, sideOutGale, rainDelayIndex, sunshine];

/* ---------- rendering ---------- */

function cardHTML(c) {
  const icon = c.code != null ? `<span class="stat-card__icon" aria-hidden="true">${weatherIcon(c.code).icon}</span>` : "";
  return `
    <article class="stat-card">
      <p class="stat-card__label">${escapeHTML(c.label)}${icon}</p>
      <h4 class="stat-card__award">${escapeHTML(c.award)}</h4>
      <p class="stat-card__winner">${c.winner}</p>
      <p class="stat-card__detail">${c.detail}</p>
    </article>`;
}

function runBuilders(builders, ctx) {
  return builders
    .map((fn) => {
      try { return fn(ctx); } catch (e) { return null; } // one bad stat never breaks the section
    })
    .filter(Boolean);
}

function ensureSummarySection() {
  let section = document.getElementById("summary");
  if (section) return section;
  const schedule = document.getElementById("schedule");
  if (!schedule) return null;

  section = document.createElement("section");
  section.className = "summary";
  section.id = "summary";
  section.innerHTML = `
    <div class="section-head">
      <h2>Season summary</h2>
      <p id="summary-status">That's a wrap on the season. Here's how it went.</p>
    </div>
    <div id="summary-headline" class="summary__headline"></div>
    <div id="summary-chart"></div>
    <p class="summary__sub">The awards</p>
    <div id="summary-awards" class="stat-grid"></div>
    <div id="summary-weather-wrap" hidden>
      <p class="summary__sub">Weather report</p>
      <div id="summary-weather" class="stat-grid"></div>
    </div>`;
  schedule.parentNode.insertBefore(section, schedule);
  return section;
}

function renderSummary({ dateLabels, players }) {
  const section = ensureSummarySection();
  if (!section) return;

  const token = ++summaryToken;
  const ctx = buildContext(dateLabels, players);
  const { played } = ctx;

  const headline = document.getElementById("summary-headline");
  const chart = document.getElementById("summary-chart");
  const awards = document.getElementById("summary-awards");
  const wxWrap = document.getElementById("summary-weather-wrap");
  const wxGrid = document.getElementById("summary-weather");
  wxWrap.hidden = true;
  wxGrid.innerHTML = "";

  if (!played.length) {
    headline.innerHTML = "";
    chart.innerHTML = "";
    awards.innerHTML = `<p class="summary__empty">No games logged yet. Stats show up after the first night.</p>`;
    return;
  }

  headline.innerHTML = headlineStats(ctx)
    .map((s) => `<div class="stat-tile"><span class="stat-tile__value">${s.value}</span><span class="stat-tile__label">${escapeHTML(s.label)}</span></div>`)
    .join("");
  chart.innerHTML = renderChart(played);
  awards.innerHTML = runBuilders(AWARD_BUILDERS, ctx).map(cardHTML).join("");

  // Weather arrives async; if it fails the section just stays hidden.
  fetchGameWeather(played)
    .then((wx) => {
      if (token !== summaryToken) return; // a newer render replaced this one
      const cards = runBuilders(WEATHER_BUILDERS, { nights: withWeather(played, wx) });
      if (!cards.length) return;
      wxGrid.innerHTML = cards.map(cardHTML).join("");
      wxWrap.hidden = false;
    })
    .catch(() => {});
}
