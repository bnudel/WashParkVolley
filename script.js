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

  const addAllBtn = document.getElementById("add-all-btn");
  if (addAllBtn) {
    addAllBtn.addEventListener("click", () => {
      downloadICS(GAMES, "wash-park-volleyball-2026-season.ics");
    });
  }
}

document.addEventListener("DOMContentLoaded", render);
