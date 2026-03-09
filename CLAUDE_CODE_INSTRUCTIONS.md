# Barin Sports PRO — Report Generator App
## Instructions for Claude Code

---

## Overview

Build a single-page web application hosted on Netlify. The app allows sports coaches and analysts to upload raw GPS data files from Barin Sports PRO wearable devices, attach athlete metadata via a form, and generate a comprehensive HTML performance report with a PDF export option.

**Everything runs in the browser. No backend, no database, no authentication.** The app is a pure static site: HTML + CSS + vanilla JavaScript (or React if preferred). Deploy to Netlify by dropping the `dist/` folder or connecting a GitHub repo.

---

## Tech Stack

- **Framework**: React 18 (Vite build) — OR — single-file vanilla HTML/JS if simpler
- **Styling**: Tailwind CSS OR plain CSS with the design tokens below
- **No backend required** — all CSV parsing and report generation is client-side
- **Deployment**: Netlify static hosting (no serverless functions needed)
- **Build command**: `npm run build` → outputs to `dist/`

---

## File & Folder Structure

```
/
├── index.html
├── src/
│   ├── main.jsx          # app entry
│   ├── App.jsx           # root component
│   ├── components/
│   │   ├── UploadZone.jsx       # drag-and-drop upload area
│   │   ├── PlayerCard.jsx       # per-file metadata form
│   │   ├── PlayerCardList.jsx   # list of all PlayerCards
│   │   ├── GenerateButton.jsx   # generates and downloads report
│   │   └── ReportBuilder.js    # pure JS: CSV parsing + HTML generation (no JSX)
│   └── styles/
│       └── globals.css
├── public/
│   └── logo.png          # Barin Sports PRO logo (see note below)
├── netlify.toml
└── package.json
```

**Logo**: Fetch from `https://i.imgur.com/hHgp1iR.png` at build time, or just reference it as an external URL in the report HTML. Use an `<img>` tag with this `src`. Add an `onerror` fallback to hide the image if it fails.

---

## Design Tokens (keep these exact)

```css
:root {
  /* Zone colors — DO NOT CHANGE */
  --z1: #4a4a4a;   /* walk */
  --z2: #1565C0;   /* low speed */
  --z3: #2E7D32;   /* medium speed */
  --z4: #F9A825;   /* high speed */
  --z5: #C62828;   /* sprint / accent */
  --perf: #00838F; /* performance teal */

  /* App UI */
  --hdr: #1e1e2e;
  --bg: #0f0f17;
  --surface: #16161f;
  --card: #1e1e2e;
  --border: #2a2a3e;
  --text: #e8e8f0;
  --muted: #6b6b8a;
  --radius: 14px;
  --radius-sm: 8px;

  /* Report UI (white background) */
  --report-bg: #f4f5f8;
  --report-card: #ffffff;
  --report-border: #e4e7ee;
  --report-text: #1a1a2e;
  --report-muted: #8a8fa8;
}
```

**Fonts**: Use `DM Sans` (weights 300, 400, 500, 600, 700, 800) + `DM Mono` (400, 500) from Google Fonts. Import via `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap')`.

---

## App UI — Page Layout

### Header
- Left: Barin Sports PRO logo image (`https://i.imgur.com/hHgp1iR.png`), max-height 36px
- Left: Label text "Report Generator" in `--muted`, uppercase, letter-spacing 2px
- Right: Red pill badge "PRO"
- Background: `--surface`, bottom border `--border`

### Hero section
- Centered
- H1: "Upload CSVs, get your report." — large, 700 weight, with the word "report" in `--z5` red
- Subtext: "Upload one CSV per athlete. Fill in the form for each. Generate a full performance report."

### Upload Zone (drag-and-drop)
- Dark card with dashed border in `--border`
- On hover/drag-over: border changes to `--z5`, background lightens slightly
- Icon: 📂 centered
- Text: "Drop CSV files here" + "One file per athlete"
- "Browse files" button — red pill button
- Hidden `<input type="file" multiple accept=".csv">`
- On file add: do NOT auto-populate the athlete name from the filename. Leave the name field blank.

### Player Card List
After files are added, show one **PlayerCard** per file. Cards appear with a slide-in animation.

Each PlayerCard contains:
- **File name** shown at the top in `DM Mono`, small, muted
- **Athlete Name** — text input, required, placeholder "Enter athlete name"
- **Activity Type** — dropdown select with these options:
  - Training Session
  - Match
  - Recovery Run
  - Friendly Match
  - Fitness Test
  - Other
- **Remove** button (× icon, red, top-right corner of card)
- A subtle green "✓ Ready" badge that appears once the name field is non-empty

Cards use the dark `--card` background with `--border` border and `--radius` corner radius.

### Generate Button
- Full-width (or centered large) red pill button: "Generate Report"
- Disabled and grey until all uploaded files have a non-empty athlete name
- Shows count: "5 athletes loaded — ready to generate"
- On click: calls `generateReport()`, then triggers download of the HTML file

### Status Bar
Below the button:
- Info (blue) — while parsing
- Success (green) — "Downloaded: barin_report_DDMMYYYY.html"
- Error (red) — parse errors with filename

---

## CSV Parsing Logic

Each CSV file has these columns (first row is header):

```
Timestamp, Latitude, Longitude, Latitude Start Sprint, Latitude End Sprint,
Longitude Start Sprint, Longitude End Sprint, Total Energy Expenditure,
Energy Expenditure Over 25.5 W, Speed, Walk Distance, LSDistance, MSDistance,
HSDistance, SprintDistance, ED, HMLDistance, Current Metabolic Power,
Hearth Rate Zone 1, Hearth Rate Zone 2, Hearth Rate Zone 3, Hearth Rate Zone 4,
Hearth Rate Zone 5, Heart Exertion, Heart Exertion Over 25.5 W, HMLTime,
Heart Rate, GPS Status, Sprints Count, Change Direction Left,
Change Direction Right, Acceleration 1, Acceleration 2, Acceleration 3,
Deceleration 1, Deceleration 2, Deceleration 3, HMLCount, Last Sprint Distance
```

**Important**: All distance and energy columns are **cumulative** — the last row contains the session totals. Read only `rows[rows.length - 1]` for totals.

**Timestamp**: Unix epoch seconds (integer). Use `new Date(timestamp * 1000)` to convert.

### Metrics to compute per player

```js
function computeMetrics(rows, athleteName, activityType) {
  const last   = rows[rows.length - 1];
  const tsMin  = Math.min(...rows.map(r => parseInt(r.Timestamp)));
  const tsMax  = Math.max(...rows.map(r => parseInt(r.Timestamp)));
  const durS   = tsMax - tsMin;

  // Distance zones (from last row)
  const zone1  = parseFloat(last['Walk Distance'])    || 0;  // walk
  const zone2  = parseFloat(last['LSDistance'])       || 0;  // low speed
  const zone3  = parseFloat(last['MSDistance'])       || 0;  // medium speed
  const zone4  = parseFloat(last['HSDistance'])       || 0;  // high speed
  const zone5  = parseFloat(last['SprintDistance'])   || 0;  // sprint
  const td     = zone1 + zone2 + zone3 + zone4 + zone5;     // total distance
  const ed     = parseFloat(last['ED'])               || 0;  // equivalent distance
  const hmld   = parseFloat(last['HMLDistance'])      || 0;  // high metabolic load distance
  const d345   = zone3 + zone4 + zone5;                     // high-intensity distance

  // Energy (column H = "Total Energy Expenditure" — value is in J/kg, divide by 1000 for kJ/kg)
  const tee    = (parseFloat(last['Total Energy Expenditure']) || 0) / 1000;

  // Movement counts (sum all 3 tiers)
  const acc    = (parseInt(last['Acceleration 1'])||0) +
                 (parseInt(last['Acceleration 2'])||0) +
                 (parseInt(last['Acceleration 3'])||0);
  const dec    = (parseInt(last['Deceleration 1'])||0) +
                 (parseInt(last['Deceleration 2'])||0) +
                 (parseInt(last['Deceleration 3'])||0);
  const left   = parseInt(last['Change Direction Left'])  || 0;
  const right  = parseInt(last['Change Direction Right']) || 0;
  const sprints= parseInt(last['Sprints Count'])          || 0;

  // Speed & power (from all rows)
  const allSpeeds = rows.map(r => parseFloat(r['Speed']) || 0);
  const allMP     = rows.map(r => parseFloat(r['Current Metabolic Power']) || 0);
  const top_spd   = Math.max(...allSpeeds) * 3.6;           // convert m/s to km/h
  const avg_spd   = durS > 0 ? (td / durS * 3.6) : 0;
  const max_mp    = Math.max(...allMP);
  const avg_mp    = allMP.reduce((a,b) => a+b, 0) / allMP.length;

  // Intensity indicator (Equivalent Distance / Total Distance)
  const di        = td > 0 ? Math.round((ed / td) * 100) / 100 : 0;

  // Date/time (UTC)
  const startDate = new Date(tsMin * 1000);
  const endDate   = new Date(tsMax * 1000);
  const pad       = v => String(v).padStart(2, '0');
  const date_str  = `${pad(startDate.getUTCDate())}.${pad(startDate.getUTCMonth()+1)}.${startDate.getUTCFullYear()}`;
  const start_t   = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}:${pad(startDate.getUTCSeconds())}`;
  const end_t     = `${pad(endDate.getUTCHours())}:${pad(endDate.getUTCMinutes())}:${pad(endDate.getUTCSeconds())}`;
  const dur_min   = Math.floor(durS / 60);
  const dur_sec   = durS % 60;

  // Heart Rate (only valid if non-zero values exist)
  const hrVals    = rows.map(r => parseInt(r['Heart Rate'])||0).filter(v => v > 0);
  const hasHR     = hrVals.length > 10;
  const avg_hr    = hasHR ? Math.round(hrVals.reduce((a,b)=>a+b,0)/hrVals.length) : null;
  const max_hr    = hasHR ? Math.max(...hrVals) : null;

  // HR zones (seconds spent — from last row)
  const hz1s      = parseInt(last['Hearth Rate Zone 1']) || 0;
  const hz2s      = parseInt(last['Hearth Rate Zone 2']) || 0;
  const hz3s      = parseInt(last['Hearth Rate Zone 3']) || 0;
  const hz4s      = parseInt(last['Hearth Rate Zone 4']) || 0;
  const hz5s      = parseInt(last['Hearth Rate Zone 5']) || 0;
  const hExert    = parseFloat(last['Heart Exertion'])   || 0;
  const totalHRtime = hz1s + hz2s + hz3s + hz4s + hz5s;

  function fmtHRZone(secs) {
    if (!hasHR || secs === 0) return null;
    const m = Math.floor(secs/60), s = secs % 60;
    const p = totalHRtime > 0 ? (secs/totalHRtime*100).toFixed(1) : '0.0';
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} (${p}% of HRZones)`;
  }

  return {
    name: athleteName,
    activityType,
    date: date_str, start: start_t, end: end_t,
    duration: `${dur_min}:${pad(dur_sec)}`,
    zone1, zone2, zone3, zone4, zone5, td, ed, hmld, d345, tee,
    acc, dec, left, right, sprints,
    max_mp, avg_mp, top_spd, avg_spd, di,
    hasHR, avg_hr, max_hr,
    hz1s, hz2s, hz3s, hz4s, hz5s, hExert, totalHRtime,
    hz1: fmtHRZone(hz1s), hz2: fmtHRZone(hz2s),
    hz3: fmtHRZone(hz3s), hz4: fmtHRZone(hz4s), hz5: fmtHRZone(hz5s),
  };
}
```

### CSV text parsing

```js
function parseCSVText(text) {
  const lines   = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row  = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] || '').trim().replace(/^"|"$/g, '');
    });
    return row;
  });
}
```

---

## Report Generation Logic

The `generateReport(players)` function receives an array of player metric objects (output of `computeMetrics`) and returns a complete HTML string. Trigger a file download using:

```js
function downloadHTML(htmlString, filename) {
  const blob = new Blob([htmlString], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
```

Call: `downloadHTML(generateReport(players), `barin_report_${players[0].date.replace(/\./g,'')}.html`)`

### Report structure (pages in order)

The report is a single HTML file. Each `.page` div maps to one printed PDF page. Every `.page` gets `page-break-before: always` in `@media print`. The first page is exempt.

**Page 1 — Cover**
- Barin Sports PRO logo (centered)
- Title: "Personal stats" in large light weight font
- Activity type label (centered, muted): e.g. "Training Session — 04.03.2026"
- Table showing all players: columns = Player Name | Date | Start | End

**Page 2 — Team Summary: Internal Load**
- Two-column grid: "Average Internal Load" + "Total Internal Load"
- HR zone 1–5 rows (color-coded labels using `--z1` through `--z5`)
- Max HR row
- Heart exertion row
- If `hasHR` is false for all players: show "N/A (no HR monitor)" in italic grey

**Page 3 — Team Summary: Work Done**
- Two-column grid: "Average Work Done" + "Total Work Done"
- Rows: Distance zone 1–5, Distance (3+4+5), Total Distance, Equivalent Distance, HMLD, Sprints distance, Sprints count
- Format: `1234m (12.3% of TDist)`
- Zone label colors: z1=dark, z2=blue, z3=green, z4=yellow, z5=red, rest=teal

**Page 4 — Team Summary: Performance**
- Two-column grid: "Average Performance" + "Total Performance"
- Rows (Average): Total NRG expenditure (kJ/kg), Accelerations, Decelerations, Left turns, Right turns, Intensity indicator (ED/TD), Work load index (N/A if no HR), Avg metabolic power (W/kg), Max metabolic power (W/kg), Top speed (km/h)
- Rows (Total): NRG expenditure, Accelerations, Decelerations, Left turns, Right turns

**Page 5 — Internal Load Table**
- Full-width table, one row per player
- Columns: Player | Duration | HR zone 1 | HR zone 2 | HR zone 3 | HR zone 4 | HR zone 5 | Average HR | Maximum HR | Heart exertion
- HR zone column headers use color classes z1h–z5h (matching zone colors)
- N/A italic if no HR

**Page 6 — Work Done Table**
- Full-width table, one row per player
- Columns: Player | Duration | Dist zone 1 | Dist zone 2 | Dist zone 3 | Dist zone 4 | Dist zone 5 | Dist(3+4+5) | Total Dist | Equiv Dist | HMLD | Sprint Dist | Sprints
- Values: `1234m (12%)` format

**Page 7 — Performance Table**
- Full-width table, one row per player
- Columns: Player | Duration | Total NRG (kJ/kg) | Accelerations | Decelerations | Left turns | Right turns | Intensity indicator | Work load index | Avg MP (W/kg) | Max MP (W/kg) | Avg speed (km/h) | Top speed (km/h)

**Page 8 — Targets (interactive, fillable)**
- Info banner: "Enter target/norm values. Percentages update live."
- Table: one row per player
- Columns: Player | Heart Exertion | Total NRG (kJ/kg) | Equiv. Distance (m) | HMLD (m) | Distance 3+4+5 (m) | Accelerations | Decelerations
- Header row below column labels: one number input per metric, yellow background (`#fffde7`)
- Each player cell shows: actual value (small, muted) + percentage (bold, colored)
- Color logic: `pct >= 85` → green (`#2E7D32`) | `pct >= 60` → yellow (`#d68000`) | `pct < 60` → red (`#C62828`)
- Heart Exertion: if no HR data, always show `–`
- JavaScript to recalculate: runs on every `oninput` on the norm fields

```js
// Embed this in the generated report's <script> tag:
const ACTUALS = ${JSON.stringify(players.map(p => ({
  he: p.hasHR ? p.hExert : null,
  tee: p.tee, ed: p.ed, hmld: p.hmld,
  d345: p.d345, acc: p.acc, dec: p.dec
})))};

function recalcTargets() {
  ['he','tee','ed','hmld','d345','acc','dec'].forEach(m => {
    const norm = parseFloat(document.getElementById('norm_' + m)?.value);
    ACTUALS.forEach((a, i) => {
      const el = document.getElementById(`pct_${i}_${m}`);
      if (!el) return;
      if (m === 'he' || a[m] === null || !norm || isNaN(norm)) {
        el.textContent = '–'; el.className = 'pct-display na'; return;
      }
      const pct = Math.round(a[m] / norm * 100);
      el.textContent = pct + '%';
      el.className = 'pct-display ' + (pct >= 85 ? 'pct-ok' : pct >= 60 ? 'pct-mid' : 'pct-low');
    });
  });
}
```

**Pages 9–23 — Bar Charts (one per metric)**

Each chart page has:
- Title (right-aligned, bold): metric name
- Horizontal bar chart, players sorted descending by value
- Red dashed average line with label
- Bar colors per metric (use the zone colors where appropriate):

| Chart | Color |
|---|---|
| Total Distance | `#3a3a3a` |
| Distance Zone 1 | `#4a4a4a` |
| Distance Zone 2 | `#1565C0` |
| Distance Zone 3 | `#2E7D32` |
| Distance Zone 4 | `#F9A825` |
| Distance Zone 5 (Sprints dist.) | `#C62828` |
| Equivalent Distance | `#00838F` |
| HMLD | `#7B1FA2` |
| Distance (3+4+5) | `#6A1B9A` |
| Total NRG Expenditure | `#1565C0` |
| Accelerations (paired) | `#00897B` |
| Decelerations (paired) | `#5C6BC0` |
| Left Turns | `#E65100` |
| Right Turns | `#0277BD` |
| Sprints Count | `#C62828` |
| Top Speed | `#37474F` |
| Avg Metabolic Power | `#00695C` |

For Accelerations + Decelerations: combine on one page, alternating rows (player name + "Accelerations" row, then player name + "Decelerations" row), both sorted by acceleration count descending.

**Bar chart HTML structure per chart:**

```html
<div class="page">
  <div class="chart-title">{METRIC NAME}</div>
  <div class="bar-chart">
    {for each player, sorted desc}
    <div class="bar-row">
      <div class="bar-label">{player.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:{pct}%; background:{color};">{value}{unit}</div>
        <div class="bar-avg-line" style="left:{avgPct}%"></div>
        <div class="bar-avg-label" style="left:{avgPct}%">{avgValue}{unit}</div>
      </div>
    </div>
    {end for}
  </div>
</div>
```

Width percentage: `(value / (maxValue * 1.1)) * 100` — cap chart max at 110% of max value.
Average line position: `(avg / (maxValue * 1.1)) * 100`.

---

## Report CSS (embed in generated HTML)

Use the same CSS from the existing tool. Key rules:

```css
/* Print */
@media print {
  body { background: #fff; }
  .no-print { display: none !important; }
  .page {
    page-break-before: always; break-before: page;
    page-break-inside: avoid; break-inside: avoid;
    box-shadow: none; border-radius: 0; margin: 0;
  }
  .page:first-child { page-break-before: avoid; }
  .summary-grid, .summary-box { page-break-inside: avoid; break-inside: avoid; }
  .data-table { page-break-inside: auto; }
  .data-table tr { page-break-inside: avoid; }
}

/* Toolbar (hidden in print) */
.toolbar { position: fixed; top: 16px; right: 20px; z-index: 999; display: flex; gap: 10px; }
.btn { padding: 9px 22px; border: none; border-radius: 50px; cursor: pointer;
       font-size: 12px; font-weight: 700; transition: all 0.2s; }
.btn-print  { background: #C62828; color: #fff; }
.btn-save   { background: #1565C0; color: #fff; }

/* Page wrapper */
.page { max-width: 1200px; margin: 0 auto 28px; padding: 36px 36px 28px;
        background: #fff; border-radius: 12px; border: 1px solid #e4e7ee;
        box-shadow: 0 2px 12px rgba(0,0,0,.06); }

/* Page title */
.page-title { font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
              text-transform: uppercase; color: #8a8fa8;
              margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e4e7ee; }

/* Summary grid */
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.summary-box { border: 1px solid #e4e7ee; border-radius: 8px; overflow: hidden; }
.summary-box h3 { background: #1e1e2e; color: #fff; font-size: 11px;
                  font-weight: 700; letter-spacing: .8px; text-transform: uppercase;
                  padding: 10px 14px; text-align: center; }
.summary-row { display: flex; align-items: stretch; border-bottom: 1px solid #e4e7ee; }
.summary-row:last-child { border-bottom: none; }
.summary-row:hover { background: #f8faff; }
.summary-label { min-width: 160px; padding: 8px 12px; color: #fff;
                 font-size: 10px; font-weight: 700; display: flex; align-items: center; }
.summary-value { padding: 8px 12px; font-size: 12px; color: #1a1a2e; display: flex; align-items: center; }

/* Data tables */
.data-table { width: 100%; border-collapse: separate; border-spacing: 0;
              border-radius: 8px; overflow: hidden; border: 1px solid #e4e7ee; }
.data-table th { background: #1e1e2e; color: #fff; padding: 10px; font-size: 10px;
                 font-weight: 700; text-align: left; white-space: nowrap;
                 border-right: 1px solid rgba(255,255,255,.08); }
.data-table td { padding: 9px 10px; font-size: 11px; border-bottom: 1px solid #e4e7ee;
                 border-right: 1px solid #e4e7ee; }
.data-table tr:nth-child(even) td { background: #fafbff; }
.data-table tr:hover td { background: #f0f4ff !important; }
.data-table .name-col { font-weight: 700; }
.na { color: #bbb; font-style: italic; }

/* Zone header colors */
.z1h { background: #4a4a4a !important; }
.z2h { background: #1565C0 !important; }
.z3h { background: #2E7D32 !important; }
.z4h { background: #F9A825 !important; color: #222 !important; }
.z5h { background: #C62828 !important; }

/* Zone label colors */
.z1 { background: #4a4a4a; } .z2 { background: #1565C0; }
.z3 { background: #2E7D32; } .z4 { background: #F9A825; color: #222 !important; }
.z5 { background: #C62828; } .perf { background: #00838F; }

/* Bar charts */
.chart-title { font-size: 15px; font-weight: 800; text-align: right;
               color: #1a1a2e; margin-bottom: 20px; padding-bottom: 10px;
               border-bottom: 1px solid #e4e7ee; }
.bar-chart { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.bar-row { display: flex; align-items: center; }
.bar-label { width: 170px; text-align: right; padding-right: 14px;
             font-size: 11px; font-weight: 600; flex-shrink: 0; }
.bar-track { flex: 1; height: 28px; background: #edf0f7; border-radius: 6px; position: relative; }
.bar-fill  { height: 100%; border-radius: 6px; display: flex; align-items: center;
             padding-left: 10px; font-size: 10px; font-weight: 700; color: #fff;
             white-space: nowrap; min-width: 6px; }
.bar-avg-line  { position: absolute; top: -4px; bottom: -4px; width: 2px;
                 background: #C62828; border-radius: 2px; z-index: 2; }
.bar-avg-label { position: absolute; bottom: -18px; font-size: 9px; color: #C62828;
                 font-weight: 700; transform: translateX(-50%); white-space: nowrap; }

/* Targets */
.targets-table { width: 100%; border-collapse: separate; border-spacing: 0;
                 border-radius: 8px; overflow: hidden; border: 1px solid #e4e7ee; }
.targets-table th { padding: 10px 12px; font-size: 10px; font-weight: 700; color: #fff; text-align: center; }
.targets-table td { padding: 8px 10px; font-size: 11px; text-align: center;
                    border-bottom: 1px solid #e4e7ee; border-right: 1px solid #e4e7ee; }
.targets-table tr:nth-child(even) td { background: #fafbff; }
.targets-table tr:hover td { background: #f0f4ff !important; }
.targets-table .player-td { text-align: left; font-weight: 700; }
.targets-table .actual { color: #8a8fa8; font-size: 10px; display: block; margin-top: 2px; }
.targets-table .pct-display { font-weight: 800; font-size: 14px; }
.norm-input { width: 80px; border: 1.5px solid #e4e7ee; border-radius: 6px;
              padding: 5px 8px; font-size: 11px; text-align: center; background: #fffde7; }
.norm-input:focus { outline: none; border-color: #1565C0; background: #e8f0fe;
                    box-shadow: 0 0 0 3px rgba(21,101,192,.12); }
.pct-ok  { color: #2E7D32; } .pct-mid { color: #d68000; } .pct-low { color: #C62828; }

/* Report body bg */
body { background: #f4f5f8; font-family: 'DM Sans', sans-serif; }
```

---

## Report Toolbar (inside generated report)

Two buttons, fixed top-right, hidden in print:

```html
<div class="toolbar no-print">
  <button class="btn btn-save" onclick="saveHTML()">Save HTML</button>
  <button class="btn btn-print" onclick="window.print()">Export PDF</button>
</div>
```

`saveHTML()` function to embed in report:

```js
function saveHTML() {
  const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = document.title.replace(/\s+/g, '_') + '.html';
  a.click();
}
```

---

## Performance — Handling 25 Files

25 files × ~7000 rows = ~175,000 rows to parse. This must not block the UI.

Use `async/await` with `File.text()` and process files sequentially with a progress indicator:

```js
async function generateReport(fileEntries) {
  const players = [];
  for (let i = 0; i < fileEntries.length; i++) {
    updateProgress(i, fileEntries.length); // show "Parsing 3 of 25..."
    const { file, name, activityType } = fileEntries[i];
    const text = await file.text();
    const rows = parseCSVText(text);
    players.push(computeMetrics(rows, name, activityType));
  }
  const html = buildReport(players);
  downloadHTML(html, `barin_report_${players[0].date.replace(/\./g,'')}.html`);
}
```

Show a progress bar or counter while parsing. The UI must remain responsive.

---

## Netlify Deployment

### netlify.toml
```toml
[build]
  command   = "npm run build"
  publish   = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options        = "DENY"
    X-XSS-Protection       = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### package.json scripts
```json
{
  "scripts": {
    "dev":   "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

No environment variables or serverless functions are needed. The app is 100% static.

To deploy manually: `npm run build` then drag the `dist/` folder to Netlify's drag-and-drop deploy at app.netlify.com.

To deploy via Git: connect the GitHub repo to Netlify, set build command to `npm run build`, publish directory to `dist`.

---

## Edge Cases to Handle

| Situation | Handling |
|---|---|
| File has no HR data (all zeros) | `hasHR = false`, show N/A throughout |
| Only 1 player uploaded | Skip team average pages, show only individual report |
| File has fewer than 2 rows | Show parse error for that file, skip it |
| Comma in a CSV field (quoted) | Handle quoted fields in CSV parser |
| Duplicate file names | Allow — names come from form, not filename |
| Different session dates across files | Show each player's own date in tables |
| Zero total distance | Show 0, avoid division-by-zero (guard with `td > 0`) |
| Max metabolic power outlier (e.g. 327 W/kg) | Display as-is — no capping |

---

## What NOT to build

- No user accounts or login
- No data storage or database
- No backend API calls
- No file size limits (the browser handles it)
- No server-side rendering
- No CSV export (output is HTML only)
- No map/GPS heatmap view (out of scope)

---

## Summary Checklist for Claude Code

- [ ] Vite + React project scaffold
- [ ] DM Sans + DM Mono fonts loaded
- [ ] Dark-themed upload UI matching design tokens
- [ ] Drag-and-drop + browse file input, multi-file
- [ ] PlayerCard with name input (blank by default) + activity type dropdown + remove button
- [ ] Generate button disabled until all cards have a name
- [ ] Progress indicator for parsing 25 files
- [ ] `parseCSVText()` function
- [ ] `computeMetrics()` function with all fields listed above
- [ ] `buildReport()` function producing correct HTML string
- [ ] Report: 8 content pages + 17 chart pages
- [ ] Targets page with live JS recalculation
- [ ] Report toolbar with Export PDF + Save HTML
- [ ] Print CSS with correct page breaks
- [ ] `downloadHTML()` triggering file download (no `window.open`)
- [ ] `netlify.toml` configured
- [ ] Tested with 1, 5, and 25 files
