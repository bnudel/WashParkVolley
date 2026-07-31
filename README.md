# Wash Park Volleyball

A one-page site for the 2026 pickup volleyball season at Washington Park, Denver. Plain HTML/CSS/JS — no build step, no dependencies.

## Deploy to Vercel

**Option A — Vercel dashboard**
1. Go to https://vercel.com/new
2. Drag this whole folder onto the page (or connect it as a Git repo — push these files to a new GitHub repo first, then import it).
3. Framework preset: "Other" (it's static). Leave build command blank.
4. Deploy.

**Option B — Vercel CLI**
```bash
npm i -g vercel
cd wash-park-volleyball
vercel
```
Follow the prompts; accept the defaults (no build command needed).

## Editing the schedule

Open `script.js` and edit the `GAMES` array at the top:

```js
const GAMES = [
  { date: "2026-07-30" },
  { date: "2026-08-05" },
  // add or remove dates here — format is "YYYY-MM-DD"
];
```

The site automatically figures out the weekday, marks the next upcoming game as "Next up," and greys out past ones — no other changes needed.

Start/end times (`START_HOUR`, `START_MIN`, `END_HOUR`) are also set at the top of `script.js` if game times ever change.

## What's included

- Full schedule list with auto-updating status (Next up / Upcoming / Played)
- Live weather forecast for the next upcoming game, shown next to the "Next up" chip in the hero (via [Open-Meteo](https://open-meteo.com), a free API — no key required). Forecasts are only available ~16 days out; before that it shows a "check back closer to game day" message.
- Attendance leaderboard at the bottom of the page, pulled live from a Google Sheet — see setup below.
- Calendar icon on each date opens a prefilled Google Calendar event in a new tab
- "Add full season" button next to the schedule heading downloads one `.ics` file with all games — Google Calendar doesn't support prefilling multiple events through a link, so bulk-add works by importing this file (Google Calendar → Settings → Import & export → Import). It also opens directly in Apple Calendar and Outlook.
- Embedded Google Map pinned to the courts' exact coordinates, plus a "Get directions" link
- Clickable GroupMe join links (hero + footer CTA)
- Fully responsive, keyboard-focus visible, respects reduced-motion preference

## Attendance leaderboard setup

The leaderboard reads your Google Sheet directly in the browser — no backend, no API key. For that to work, the sheet needs to be **link-viewable**:

1. Open the sheet → **Share** (top right) → under "General access," change to **"Anyone with the link"** and make sure the role is **Viewer**.
2. That's it — the site fetches the current data on every page load, and there's a "Refresh" button next to the leaderboard heading for quick re-syncs at the park.

**Expected sheet format** (first tab, `gid=0`):

| Player | 7/30 | 8/5 | 8/12 | ... | Total |
|--------|------|-----|------|-----|-------|
| Alex   | 2    | 1   |      |     | 3     |
| Jordan | 1    | 1   | 2    |     | 4     |

- First column: player name
- Middle columns: one per date, header text can be anything (e.g. `7/30`) — it's just used as the label in each player's expanded breakdown
- Last column header must say **Total** (case-insensitive). If a Total cell is left blank, the site adds up that row's date columns automatically.
- Leave a cell blank for a date someone didn't play — it's treated as 0.

If you ever track attendance on a different tab, open that tab in Google Sheets and copy the number after `gid=` in the URL, then update `LEADERBOARD_GID` at the top of `script.js`. The sheet ID itself (`LEADERBOARD_SHEET_ID`) is already set from the link you shared.

## Files

- `index.html` — page structure and content
- `style.css` — all styling
- `script.js` — schedule rendering + calendar download logic
- `vercel.json` — minimal Vercel config (clean URLs)
