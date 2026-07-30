// ---------------------------------------------------
// Schedule data — edit this list to change the season
// ---------------------------------------------------
const GAMES = [
  { date: "2026-07-30" },
  { date: "2026-08-05" },
  { date: "2026-08-12" },
  { date: "2026-08-21" },
  { date: "2026-08-27" },
];

const VENUE = "Washington Park Volleyball Courts";
const VENUE_COORDS = "39.699361,-104.971167";
const START_HOUR = 17; // 5:30pm local (Denver)
const START_MIN = 30;
const END_HOUR = 21; // ~dark

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function gameUTCRange(date) {
  const [y, m, d] = date.split("-").map(Number);
  // Denver is UTC-6 (MDT) in Jul/Aug — convert local wall time to UTC by adding 6 hours.
  const startUTC = new Date(Date.UTC(y, m - 1, d, START_HOUR + 6, START_MIN));
  const endUTC = new Date(Date.UTC(y, m - 1, d, END_HOUR + 6, 0));
  return { startUTC, endUTC };
}

const fmtICS = (dt) => dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
const fmtGCal = fmtICS; // same UTC basic format Google Calendar expects

function buildGoogleCalendarUrl({ date }) {
  const { startUTC, endUTC } = gameUTCRange(date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Wash Park Volleyball",
    dates: `${fmtGCal(startUTC)}/${fmtGCal(endUTC)}`,
    details: "Pickup volleyball at Washington Park. 5:30 to dark.",
    location: VENUE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function veventBlock({ date }) {
  const { startUTC, endUTC } = gameUTCRange(date);
  return [
    "BEGIN:VEVENT",
    `UID:${date}-washparkvolley@wash-park-volleyball`,
    `DTSTAMP:${fmtICS(new Date())}`,
    `DTSTART:${fmtICS(startUTC)}`,
    `DTEND:${fmtICS(endUTC)}`,
    `SUMMARY:Wash Park Volleyball`,
    `LOCATION:${VENUE}`,
    `DESCRIPTION:Pickup volleyball at Washington Park. 5:30 to dark.`,
    "END:VEVENT",
  ].join("\r\n");
}

function buildICS(games) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wash Park Volleyball//EN",
    ...games.map(veventBlock),
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(games, filename) {
  const ics = buildICS(games);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------
// Weather (Open-Meteo — no API key required)
// ---------------------------------------------------
const WEATHER_LAT = 39.697419;
const WEATHER_LON = -104.969710;

// Minimal icon set + label per WMO weather code group.
// https://open-meteo.com/en/docs#weathervariables
function weatherIcon(code) {
  const sun = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5V5M12 19V21.5M21.5 12H19M5 12H2.5M18.4 5.6L16.6 7.4M7.4 16.6L5.6 18.4M18.4 18.4L16.6 16.6M7.4 7.4L5.6 5.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  const cloudSun = `<svg viewBox="0 0 24 24" fill="none"><path d="M8.5 4.5V6.3M4.6 8.4L5.9 9.7M13.4 8.4L12.1 9.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8.6" cy="10.5" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M7 20h10.5a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8.3 14.2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
  const cloud = `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 19h11a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.62-1.9A4 4 0 0 0 6.5 19Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
  const fog = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 9h13M4 12.5h16M4 16h13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  const rain = `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 13.5h11a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.62-1.9A4 4 0 0 0 6.5 13.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 17v2.3M12 17v2.3M15.5 17v2.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  const snow = `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 13.5h11a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.62-1.9A4 4 0 0 0 6.5 13.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 17.3v2.4M12 17v2.7M15 17.3v2.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="0.2 2.6"/></svg>`;
  const storm = `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 13h11a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.62-1.9A4 4 0 0 0 6.5 13Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.5 15.5 10 19.5h3l-1.7 3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const map = {
    0: { icon: sun, label: "Clear" },
    1: { icon: cloudSun, label: "Mostly clear" },
    2: { icon: cloudSun, label: "Partly cloudy" },
    3: { icon: cloud, label: "Overcast" },
    45: { icon: fog, label: "Foggy" },
    48: { icon: fog, label: "Foggy" },
    51: { icon: rain, label: "Light drizzle" },
    53: { icon: rain, label: "Drizzle" },
    55: { icon: rain, label: "Heavy drizzle" },
    56: { icon: rain, label: "Freezing drizzle" },
    57: { icon: rain, label: "Freezing drizzle" },
    61: { icon: rain, label: "Light rain" },
    63: { icon: rain, label: "Rain" },
    65: { icon: rain, label: "Heavy rain" },
    66: { icon: rain, label: "Freezing rain" },
    67: { icon: rain, label: "Freezing rain" },
    71: { icon: snow, label: "Light snow" },
    73: { icon: snow, label: "Snow" },
    75: { icon: snow, label: "Heavy snow" },
    77: { icon: snow, label: "Snow grains" },
    80: { icon: rain, label: "Rain showers" },
    81: { icon: rain, label: "Rain showers" },
    82: { icon: rain, label: "Heavy showers" },
    85: { icon: snow, label: "Snow showers" },
    86: { icon: snow, label: "Snow showers" },
    95: { icon: storm, label: "Thunderstorms" },
    96: { icon: storm, label: "Thunderstorms" },
    99: { icon: storm, label: "Thunderstorms" },
  };

  return map[code] || { icon: cloud, label: "—" };
}

async function loadWeatherFor(game) {
  const iconEl = document.getElementById("weather-icon");
  const textEl = document.getElementById("weather-text");
  if (!iconEl || !textEl) return;

  if (!game) {
    textEl.textContent = "See you next season";
    textEl.classList.add("weather-chip__text--muted");
    return;
  }

  try {
    const params = new URLSearchParams({
      latitude: WEATHER_LAT,
      longitude: WEATHER_LON,
      daily: "weathercode,temperature_2m_max,temperature_2m_min",
      temperature_unit: "fahrenheit",
      timezone: "America/Denver",
      forecast_days: "16",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) throw new Error("weather request failed");
    const data = await res.json();

    const idx = data?.daily?.time?.indexOf(game.date);
    if (idx == null || idx < 0) {
      textEl.textContent = "Forecast opens up 16 days out";
      textEl.classList.add("weather-chip__text--muted");
      return;
    }

    const code = data.daily.weathercode[idx];
    const hi = Math.round(data.daily.temperature_2m_max[idx]);
    const lo = Math.round(data.daily.temperature_2m_min[idx]);
    const { icon, label } = weatherIcon(code);

    iconEl.innerHTML = icon;
    textEl.textContent = `${hi}°/${lo}° · ${label}`;
    textEl.classList.remove("weather-chip__text--muted");
  } catch (err) {
    textEl.textContent = "Forecast unavailable";
    textEl.classList.add("weather-chip__text--muted");
  }
}

function render() {
  const today = startOfToday();
  const list = document.getElementById("game-list");
  const chipValue = document.querySelector("#next-game-chip .chip__value");

  const decorated = GAMES.map((g) => {
    const d = parseLocalDate(g.date);
    return { ...g, dateObj: d, isPast: d < today };
  });

  const nextIndex = decorated.findIndex((g) => !g.isPast);

  list.innerHTML = "";

  decorated.forEach((game, i) => {
    const { dateObj } = game;
    const isNext = i === nextIndex;

    const li = document.createElement("li");
    li.className = "game-row" + (isNext ? " game-row--next" : "");

    const weekday = WEEKDAYS[dateObj.getDay()];
    const month = MONTHS[dateObj.getMonth()];
    const day = dateObj.getDate();

    let pillClass = "status-pill--upcoming";
    let pillText = "Upcoming";
    if (game.isPast) {
      pillClass = "status-pill--past";
      pillText = "Played";
    } else if (isNext) {
      pillClass = "status-pill--next";
      pillText = "Next up";
    }

    li.innerHTML = `
      <div class="game-row__badge">
        <span class="month">${month}</span>
        <span class="day">${day}</span>
      </div>
      <div class="game-row__info">
        <p class="game-row__weekday">${weekday}</p>
        <p class="game-row__sub">5:30 to dark</p>
      </div>
      <span class="status-pill ${pillClass}">${pillText}</span>
      <a class="cal-btn" href="${buildGoogleCalendarUrl(game)}" target="_blank" rel="noopener" title="Add to Google Calendar" aria-label="Add ${weekday}, ${month} ${day} to Google Calendar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M3.5 9.5H20.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M8 3V6.5M16 3V6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </a>
    `;

    list.appendChild(li);
  });

  if (chipValue) {
    if (nextIndex === -1) {
      chipValue.textContent = "See you next season";
    } else {
      const g = decorated[nextIndex];
      chipValue.textContent = `${WEEKDAYS[g.dateObj.getDay()].slice(0,3)}, ${MONTHS_LONG[g.dateObj.getMonth()].slice(0,3)} ${g.dateObj.getDate()}`;
    }
  }

  loadWeatherFor(nextIndex === -1 ? null : decorated[nextIndex]);

  const addAllBtn = document.getElementById("add-all-btn");
  if (addAllBtn) {
    addAllBtn.addEventListener("click", () => {
      downloadICS(GAMES, "wash-park-volleyball-2026-season.ics");
    });
  }
}

document.addEventListener("DOMContentLoaded", render);
