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
- Calendar icon on each date opens a prefilled Google Calendar event in a new tab
- "Add full season" button next to the schedule heading downloads one `.ics` file with all games — Google Calendar doesn't support prefilling multiple events through a link, so bulk-add works by importing this file (Google Calendar → Settings → Import & export → Import). It also opens directly in Apple Calendar and Outlook.
- Embedded Google Map pinned to the courts' exact coordinates, plus a "Get directions" link
- Clickable GroupMe join links (hero + footer CTA)
- Fully responsive, keyboard-focus visible, respects reduced-motion preference

## Files

- `index.html` — page structure and content
- `style.css` — all styling
- `script.js` — schedule rendering + calendar download logic
- `vercel.json` — minimal Vercel config (clean URLs)
