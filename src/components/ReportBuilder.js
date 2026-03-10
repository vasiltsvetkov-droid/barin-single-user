// ReportBuilder.js — Pure JS: CSV parsing, metrics computation, HTML report generation

export function parseCSVText(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] || '').trim();
    });
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function computeMetrics(rows, athleteName, activityType) {
  const last = rows[rows.length - 1];
  const tsMin = Math.min(...rows.map(r => parseInt(r.Timestamp)));
  const tsMax = Math.max(...rows.map(r => parseInt(r.Timestamp)));
  const durS = tsMax - tsMin;

  const zone1 = parseFloat(last['Walk Distance']) || 0;
  const zone2 = parseFloat(last['LSDistance']) || 0;
  const zone3 = parseFloat(last['MSDistance']) || 0;
  const zone4 = parseFloat(last['HSDistance']) || 0;
  const zone5 = parseFloat(last['SprintDistance']) || 0;
  const td = zone1 + zone2 + zone3 + zone4 + zone5;
  const ed = parseFloat(last['ED']) || 0;
  const hmld = parseFloat(last['HMLDistance']) || 0;
  const d345 = zone3 + zone4 + zone5;

  const tee = (parseFloat(last['Total Energy Expenditure']) || 0) / 1000;

  const acc = (parseInt(last['Acceleration 1']) || 0) +
              (parseInt(last['Acceleration 2']) || 0) +
              (parseInt(last['Acceleration 3']) || 0);
  const dec = (parseInt(last['Deceleration 1']) || 0) +
              (parseInt(last['Deceleration 2']) || 0) +
              (parseInt(last['Deceleration 3']) || 0);
  const left = parseInt(last['Change Direction Left']) || 0;
  const right = parseInt(last['Change Direction Right']) || 0;
  const sprints = parseInt(last['Sprints Count']) || 0;

  const allSpeeds = rows.map(r => parseFloat(r['Speed']) || 0);
  const allMP = rows.map(r => parseFloat(r['Current Metabolic Power']) || 0);
  const top_spd = Math.max(...allSpeeds) * 3.6;
  const avg_spd = durS > 0 ? (td / durS * 3.6) : 0;
  const max_mp = Math.max(...allMP);
  const avg_mp = allMP.reduce((a, b) => a + b, 0) / allMP.length;

  const di = td > 0 ? Math.round((ed / td) * 100) / 100 : 0;

  const startDate = new Date(tsMin * 1000);
  const endDate = new Date(tsMax * 1000);
  const pad = v => String(v).padStart(2, '0');
  const date_str = `${pad(startDate.getUTCDate())}.${pad(startDate.getUTCMonth() + 1)}.${startDate.getUTCFullYear()}`;
  const start_t = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}:${pad(startDate.getUTCSeconds())}`;
  const end_t = `${pad(endDate.getUTCHours())}:${pad(endDate.getUTCMinutes())}:${pad(endDate.getUTCSeconds())}`;
  const dur_min = Math.floor(durS / 60);
  const dur_sec = durS % 60;

  const hrVals = rows.map(r => parseInt(r['Heart Rate']) || 0).filter(v => v > 0);
  const hasHR = hrVals.length > 10;
  const avg_hr = hasHR ? Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length) : null;
  const max_hr = hasHR ? Math.max(...hrVals) : null;

  const hz1s = parseInt(last['Hearth Rate Zone 1']) || 0;
  const hz2s = parseInt(last['Hearth Rate Zone 2']) || 0;
  const hz3s = parseInt(last['Hearth Rate Zone 3']) || 0;
  const hz4s = parseInt(last['Hearth Rate Zone 4']) || 0;
  const hz5s = parseInt(last['Hearth Rate Zone 5']) || 0;
  const hExert = parseFloat(last['Heart Exertion']) || 0;
  const totalHRtime = hz1s + hz2s + hz3s + hz4s + hz5s;

  function fmtHRZone(secs) {
    if (!hasHR || secs === 0) return null;
    const m = Math.floor(secs / 60), s = secs % 60;
    const p = totalHRtime > 0 ? (secs / totalHRtime * 100).toFixed(1) : '0.0';
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (${p}% of HRZones)`;
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

export function downloadHTML(htmlString, filename) {
  const blob = new Blob([htmlString], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

// ── Helpers ──

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(v, decimals = 0) {
  if (v == null || isNaN(v)) return '0';
  return Number(v).toFixed(decimals);
}

function fmtDist(v, td) {
  const m = Math.round(v);
  const pct = td > 0 ? ((v / td) * 100).toFixed(1) : '0.0';
  return `${m}m (${pct}%)`;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function na() {
  return '<span class="na">N/A</span>';
}

function fmtHRZoneSummary(secs, totalTime) {
  if (secs === 0) return '00:00 (0.0%)';
  const m = Math.floor(secs / 60), s = secs % 60;
  const p = totalTime > 0 ? (secs / totalTime * 100).toFixed(1) : '0.0';
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (${p}%)`;
}

// ── Report builder ──

export function buildReport(players) {
  const isSingle = players.length === 1;
  const anyHR = players.some(p => p.hasHR);

  let pages = '';

  // Page 1 — Cover
  pages += buildCoverPage(players);

  // Pages 2-4 — Team Summary (skip if single player)
  if (!isSingle) {
    pages += buildInternalLoadSummary(players, anyHR);
    pages += buildWorkDoneSummary(players);
    pages += buildPerformanceSummary(players, anyHR);
  }

  // Page 5 — Internal Load Table
  pages += buildInternalLoadTable(players);

  // Page 6 — Work Done Table
  pages += buildWorkDoneTable(players);

  // Page 7 — Performance Table
  pages += buildPerformanceTable(players);

  // Page 8 — Targets
  pages += buildTargetsPage(players);

  // Pages 9-23 — Bar Charts
  pages += buildBarCharts(players);

  return wrapReport(pages, players);
}

function wrapReport(pagesHTML, players) {
  const title = `Barin Sports PRO Report — ${players[0].date}`;
  const actualsJSON = JSON.stringify(players.map(p => ({
    he: p.hasHR ? p.hExert : null,
    tee: p.tee, ed: p.ed, hmld: p.hmld,
    d345: p.d345, acc: p.acc, dec: p.dec
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${REPORT_CSS}
</style>
</head>
<body>
<div class="toolbar no-print">
  <button class="btn btn-save" onclick="saveHTML()">Save HTML</button>
  <button class="btn btn-print" onclick="window.print()">Export PDF</button>
</div>
${pagesHTML}
<script>
function saveHTML() {
  var blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = document.title.replace(/\\s+/g, '_') + '.html';
  a.click();
}

var ACTUALS = ${actualsJSON};

function recalcTargets() {
  ['he','tee','ed','hmld','d345','acc','dec'].forEach(function(m) {
    var normEl = document.getElementById('norm_' + m);
    var norm = normEl ? parseFloat(normEl.value) : NaN;
    ACTUALS.forEach(function(a, i) {
      var el = document.getElementById('pct_' + i + '_' + m);
      if (!el) return;
      if (m === 'he' && a[m] === null) {
        el.textContent = '\\u2013'; el.className = 'pct-display na'; return;
      }
      if (a[m] === null || !norm || isNaN(norm)) {
        el.textContent = '\\u2013'; el.className = 'pct-display na'; return;
      }
      var pct = Math.round(a[m] / norm * 100);
      el.textContent = pct + '%';
      el.className = 'pct-display ' + (pct >= 85 ? 'pct-ok' : pct >= 60 ? 'pct-mid' : 'pct-low');
    });
  });
}
</script>
</body>
</html>`;
}

// ── Page builders ──

function buildCoverPage(players) {
  const actType = players[0].activityType;
  const date = players[0].date;

  let tableRows = players.map(p =>
    `<tr><td class="name-col">${esc(p.name)}</td><td>${p.date}</td><td>${p.start}</td><td>${p.end}</td></tr>`
  ).join('');

  return `<div class="page">
  <div style="text-align:center; padding: 40px 0 20px;">
    <img src="https://i.imgur.com/hHgp1iR.png" alt="Barin Sports PRO" style="max-height:60px; margin-bottom:24px;" onerror="this.style.display='none'">
    <h1 style="font-size:36px; font-weight:300; color:#1a1a2e; margin-bottom:8px;">Personal stats</h1>
    <p style="color:#8a8fa8; font-size:13px; margin-bottom:32px;">${esc(actType)} — ${date}</p>
  </div>
  <table class="data-table">
    <thead><tr><th>Player Name</th><th>Date</th><th>Start</th><th>End</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>`;
}

function buildInternalLoadSummary(players, anyHR) {
  const hrPlayers = players.filter(p => p.hasHR);

  function avgHRZone(getter) {
    if (!hrPlayers.length) return null;
    return Math.round(avg(hrPlayers.map(getter)));
  }
  function totalHRZone(getter) {
    if (!hrPlayers.length) return null;
    return sum(hrPlayers.map(getter));
  }
  function fmtZoneSec(secs, totalSecs) {
    if (secs == null) return na();
    return fmtHRZoneSummary(secs, totalSecs);
  }

  const avgTotalHRTime = hrPlayers.length ? Math.round(avg(hrPlayers.map(p => p.totalHRtime))) : 0;
  const totalTotalHRTime = hrPlayers.length ? sum(hrPlayers.map(p => p.totalHRtime)) : 0;

  const zones = [
    { label: 'HR Zone 1', cls: 'z1', avgV: avgHRZone(p => p.hz1s), totV: totalHRZone(p => p.hz1s) },
    { label: 'HR Zone 2', cls: 'z2', avgV: avgHRZone(p => p.hz2s), totV: totalHRZone(p => p.hz2s) },
    { label: 'HR Zone 3', cls: 'z3', avgV: avgHRZone(p => p.hz3s), totV: totalHRZone(p => p.hz3s) },
    { label: 'HR Zone 4', cls: 'z4', avgV: avgHRZone(p => p.hz4s), totV: totalHRZone(p => p.hz4s) },
    { label: 'HR Zone 5', cls: 'z5', avgV: avgHRZone(p => p.hz5s), totV: totalHRZone(p => p.hz5s) },
  ];

  const avgMaxHR = hrPlayers.length ? Math.round(avg(hrPlayers.map(p => p.max_hr))) : null;
  const maxMaxHR = hrPlayers.length ? Math.max(...hrPlayers.map(p => p.max_hr)) : null;
  const avgHExert = hrPlayers.length ? avg(hrPlayers.map(p => p.hExert)).toFixed(1) : null;
  const totalHExert = hrPlayers.length ? sum(hrPlayers.map(p => p.hExert)).toFixed(1) : null;

  function buildRows(side) {
    const totalTime = side === 'avg' ? avgTotalHRTime : totalTotalHRTime;
    let rows = '';
    if (!anyHR) {
      return `<div class="summary-row"><div class="summary-label" style="background:#666; flex:1; justify-content:center;"><em>N/A (no HR monitor)</em></div></div>`;
    }
    zones.forEach(z => {
      const val = side === 'avg' ? z.avgV : z.totV;
      rows += `<div class="summary-row">
        <div class="summary-label ${z.cls}">${z.label}</div>
        <div class="summary-value">${fmtZoneSec(val, totalTime)}</div>
      </div>`;
    });
    rows += `<div class="summary-row">
      <div class="summary-label" style="background:#37474F;">Max HR</div>
      <div class="summary-value">${side === 'avg' ? (avgMaxHR != null ? avgMaxHR + ' bpm' : na()) : (maxMaxHR != null ? maxMaxHR + ' bpm' : na())}</div>
    </div>`;
    rows += `<div class="summary-row">
      <div class="summary-label perf">Heart Exertion</div>
      <div class="summary-value">${side === 'avg' ? (avgHExert != null ? avgHExert : na()) : (totalHExert != null ? totalHExert : na())}</div>
    </div>`;
    return rows;
  }

  return `<div class="page">
  <div class="page-title">Team Summary: Internal Load</div>
  <div class="summary-grid">
    <div class="summary-box"><h3>Average Internal Load</h3>${buildRows('avg')}</div>
    <div class="summary-box"><h3>Total Internal Load</h3>${buildRows('total')}</div>
  </div>
</div>`;
}

function buildWorkDoneSummary(players) {
  const n = players.length;
  const metrics = [
    { label: 'Distance Zone 1', cls: 'z1', key: 'zone1' },
    { label: 'Distance Zone 2', cls: 'z2', key: 'zone2' },
    { label: 'Distance Zone 3', cls: 'z3', key: 'zone3' },
    { label: 'Distance Zone 4', cls: 'z4', key: 'zone4' },
    { label: 'Distance Zone 5', cls: 'z5', key: 'zone5' },
    { label: 'Distance (3+4+5)', cls: 'perf', key: 'd345' },
    { label: 'Total Distance', cls: 'perf', key: 'td' },
    { label: 'Equivalent Distance', cls: 'perf', key: 'ed' },
    { label: 'HMLD', cls: 'perf', key: 'hmld' },
    { label: 'Sprints Distance', cls: 'z5', key: 'zone5' },
    { label: 'Sprints Count', cls: 'z5', key: 'sprints' },
  ];

  function buildRows(side) {
    return metrics.map(m => {
      const vals = players.map(p => p[m.key]);
      const v = side === 'avg' ? avg(vals) : sum(vals);
      const avgTD = side === 'avg' ? avg(players.map(p => p.td)) : sum(players.map(p => p.td));
      const isCount = m.key === 'sprints';
      const display = isCount
        ? Math.round(v)
        : `${Math.round(v)}m (${avgTD > 0 ? ((v / avgTD) * 100).toFixed(1) : '0.0'}% of TDist)`;
      return `<div class="summary-row">
        <div class="summary-label ${m.cls}">${m.label}</div>
        <div class="summary-value">${display}</div>
      </div>`;
    }).join('');
  }

  return `<div class="page">
  <div class="page-title">Team Summary: Work Done</div>
  <div class="summary-grid">
    <div class="summary-box"><h3>Average Work Done</h3>${buildRows('avg')}</div>
    <div class="summary-box"><h3>Total Work Done</h3>${buildRows('total')}</div>
  </div>
</div>`;
}

function buildPerformanceSummary(players, anyHR) {
  const n = players.length;

  function r(label, cls, avgVal, totalVal) {
    return `<div class="summary-row">
      <div class="summary-label ${cls}">${label}</div>
      <div class="summary-value">${avgVal}</div>
    </div>`;
  }

  const avgRows = [
    { label: 'Total NRG Expenditure', cls: 'perf', v: fmt(avg(players.map(p => p.tee)), 2) + ' kJ/kg' },
    { label: 'Accelerations', cls: 'perf', v: Math.round(avg(players.map(p => p.acc))) },
    { label: 'Decelerations', cls: 'perf', v: Math.round(avg(players.map(p => p.dec))) },
    { label: 'Left Turns', cls: 'perf', v: Math.round(avg(players.map(p => p.left))) },
    { label: 'Right Turns', cls: 'perf', v: Math.round(avg(players.map(p => p.right))) },
    { label: 'Intensity Indicator (ED/TD)', cls: 'perf', v: avg(players.map(p => p.di)).toFixed(2) },
    { label: 'Work Load Index', cls: 'perf', v: anyHR ? 'N/A' : 'N/A' },
    { label: 'Avg Metabolic Power', cls: 'perf', v: fmt(avg(players.map(p => p.avg_mp)), 2) + ' W/kg' },
    { label: 'Max Metabolic Power', cls: 'perf', v: fmt(avg(players.map(p => p.max_mp)), 2) + ' W/kg' },
    { label: 'Top Speed', cls: 'perf', v: fmt(avg(players.map(p => p.top_spd)), 2) + ' km/h' },
  ];

  const totalRows = [
    { label: 'Total NRG Expenditure', cls: 'perf', v: fmt(sum(players.map(p => p.tee)), 2) + ' kJ/kg' },
    { label: 'Accelerations', cls: 'perf', v: sum(players.map(p => p.acc)) },
    { label: 'Decelerations', cls: 'perf', v: sum(players.map(p => p.dec)) },
    { label: 'Left Turns', cls: 'perf', v: sum(players.map(p => p.left)) },
    { label: 'Right Turns', cls: 'perf', v: sum(players.map(p => p.right)) },
  ];

  function renderBox(title, rows) {
    return `<div class="summary-box"><h3>${title}</h3>${rows.map(r =>
      `<div class="summary-row">
        <div class="summary-label ${r.cls}">${r.label}</div>
        <div class="summary-value">${r.v}</div>
      </div>`
    ).join('')}</div>`;
  }

  return `<div class="page">
  <div class="page-title">Team Summary: Performance</div>
  <div class="summary-grid">
    ${renderBox('Average Performance', avgRows)}
    ${renderBox('Total Performance', totalRows)}
  </div>
</div>`;
}

function buildInternalLoadTable(players) {
  const headerRow = `<tr>
    <th>Player</th><th>Duration</th>
    <th class="z1h">HR Zone 1</th><th class="z2h">HR Zone 2</th>
    <th class="z3h">HR Zone 3</th><th class="z4h">HR Zone 4</th>
    <th class="z5h">HR Zone 5</th>
    <th>Average HR</th><th>Maximum HR</th><th>Heart Exertion</th>
  </tr>`;

  const bodyRows = players.map(p => {
    if (!p.hasHR) {
      return `<tr>
        <td class="name-col">${esc(p.name)}</td><td>${p.duration}</td>
        <td class="na">N/A</td><td class="na">N/A</td><td class="na">N/A</td>
        <td class="na">N/A</td><td class="na">N/A</td>
        <td class="na">N/A</td><td class="na">N/A</td><td class="na">N/A</td>
      </tr>`;
    }
    return `<tr>
      <td class="name-col">${esc(p.name)}</td><td>${p.duration}</td>
      <td>${p.hz1 || na()}</td><td>${p.hz2 || na()}</td>
      <td>${p.hz3 || na()}</td><td>${p.hz4 || na()}</td>
      <td>${p.hz5 || na()}</td>
      <td>${p.avg_hr} bpm</td><td>${p.max_hr} bpm</td><td>${fmt(p.hExert, 1)}</td>
    </tr>`;
  }).join('');

  return `<div class="page">
  <div class="page-title">Internal Load — All Players</div>
  <table class="data-table">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}

function buildWorkDoneTable(players) {
  const headerRow = `<tr>
    <th>Player</th><th>Duration</th>
    <th class="z1h">Dist Zone 1</th><th class="z2h">Dist Zone 2</th>
    <th class="z3h">Dist Zone 3</th><th class="z4h">Dist Zone 4</th>
    <th class="z5h">Dist Zone 5</th>
    <th>Dist(3+4+5)</th><th>Total Dist</th><th>Equiv Dist</th>
    <th>HMLD</th><th>Sprint Dist</th><th>Sprints</th>
  </tr>`;

  const bodyRows = players.map(p => {
    return `<tr>
      <td class="name-col">${esc(p.name)}</td><td>${p.duration}</td>
      <td>${fmtDist(p.zone1, p.td)}</td><td>${fmtDist(p.zone2, p.td)}</td>
      <td>${fmtDist(p.zone3, p.td)}</td><td>${fmtDist(p.zone4, p.td)}</td>
      <td>${fmtDist(p.zone5, p.td)}</td>
      <td>${fmtDist(p.d345, p.td)}</td><td>${Math.round(p.td)}m</td>
      <td>${Math.round(p.ed)}m</td><td>${Math.round(p.hmld)}m</td>
      <td>${Math.round(p.zone5)}m</td><td>${p.sprints}</td>
    </tr>`;
  }).join('');

  return `<div class="page">
  <div class="page-title">Work Done — All Players</div>
  <table class="data-table">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}

function buildPerformanceTable(players) {
  const headerRow = `<tr>
    <th>Player</th><th>Duration</th><th>Total NRG (kJ/kg)</th>
    <th>Accelerations</th><th>Decelerations</th>
    <th>Left Turns</th><th>Right Turns</th>
    <th>Intensity Indicator</th><th>Work Load Index</th>
    <th>Avg MP (W/kg)</th><th>Max MP (W/kg)</th>
    <th>Avg Speed (km/h)</th><th>Top Speed (km/h)</th>
  </tr>`;

  const bodyRows = players.map(p => {
    return `<tr>
      <td class="name-col">${esc(p.name)}</td><td>${p.duration}</td>
      <td>${fmt(p.tee, 2)}</td>
      <td>${p.acc}</td><td>${p.dec}</td>
      <td>${p.left}</td><td>${p.right}</td>
      <td>${p.di.toFixed(2)}</td>
      <td>${p.hasHR ? 'N/A' : na()}</td>
      <td>${fmt(p.avg_mp, 2)}</td><td>${fmt(p.max_mp, 2)}</td>
      <td>${fmt(p.avg_spd, 2)}</td><td>${fmt(p.top_spd, 2)}</td>
    </tr>`;
  }).join('');

  return `<div class="page">
  <div class="page-title">Performance — All Players</div>
  <table class="data-table">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}

function buildTargetsPage(players) {
  const metrics = [
    { key: 'he', label: 'Heart Exertion' },
    { key: 'tee', label: 'Total NRG (kJ/kg)' },
    { key: 'ed', label: 'Equiv. Distance (m)' },
    { key: 'hmld', label: 'HMLD (m)' },
    { key: 'd345', label: 'Distance 3+4+5 (m)' },
    { key: 'acc', label: 'Accelerations' },
    { key: 'dec', label: 'Decelerations' },
  ];

  const thRow = `<tr style="background:#1e1e2e;">
    <th style="text-align:left;">Player</th>
    ${metrics.map(m => `<th>${m.label}</th>`).join('')}
  </tr>`;

  const normRow = `<tr style="background:#fffde7;">
    <td style="font-weight:700; text-align:left; background:#fffde7;">Target / Norm</td>
    ${metrics.map(m =>
      `<td style="background:#fffde7;"><input class="norm-input" type="number" id="norm_${m.key}" oninput="recalcTargets()" placeholder="—"></td>`
    ).join('')}
  </tr>`;

  const playerRows = players.map((p, i) => {
    return `<tr>
      <td class="player-td">${esc(p.name)}</td>
      ${metrics.map(m => {
        const actual = m.key === 'he'
          ? (p.hasHR ? fmt(p.hExert, 1) : '–')
          : m.key === 'tee' ? fmt(p.tee, 2)
          : m.key === 'ed' ? Math.round(p.ed)
          : m.key === 'hmld' ? Math.round(p.hmld)
          : m.key === 'd345' ? Math.round(p.d345)
          : m.key === 'acc' ? p.acc
          : p.dec;
        return `<td>
          <span id="pct_${i}_${m.key}" class="pct-display na">–</span>
          <span class="actual">${actual}</span>
        </td>`;
      }).join('')}
    </tr>`;
  }).join('');

  return `<div class="page">
  <div class="page-title">Targets</div>
  <div style="background:#e3f2fd; border:1px solid #90caf9; border-radius:8px; padding:10px 16px; margin-bottom:16px; font-size:12px; color:#1565C0;">
    Enter target/norm values. Percentages update live.
  </div>
  <table class="targets-table">
    <thead>${thRow}</thead>
    <tbody>${normRow}${playerRows}</tbody>
  </table>
</div>`;
}

function buildBarCharts(players) {
  const charts = [
    { title: 'Total Distance', key: 'td', unit: 'm', color: '#3a3a3a', round: true },
    { title: 'Distance Zone 1', key: 'zone1', unit: 'm', color: '#4a4a4a', round: true },
    { title: 'Distance Zone 2', key: 'zone2', unit: 'm', color: '#1565C0', round: true },
    { title: 'Distance Zone 3', key: 'zone3', unit: 'm', color: '#2E7D32', round: true },
    { title: 'Distance Zone 4', key: 'zone4', unit: 'm', color: '#F9A825', round: true },
    { title: 'Distance Zone 5 (Sprints dist.)', key: 'zone5', unit: 'm', color: '#C62828', round: true },
    { title: 'Equivalent Distance', key: 'ed', unit: 'm', color: '#00838F', round: true },
    { title: 'HMLD', key: 'hmld', unit: 'm', color: '#7B1FA2', round: true },
    { title: 'Distance (3+4+5)', key: 'd345', unit: 'm', color: '#6A1B9A', round: true },
    { title: 'Total NRG Expenditure', key: 'tee', unit: ' kJ/kg', color: '#1565C0', round: false, decimals: 2 },
    { title: 'Left Turns', key: 'left', unit: '', color: '#E65100', round: true },
    { title: 'Right Turns', key: 'right', unit: '', color: '#0277BD', round: true },
    { title: 'Sprints Count', key: 'sprints', unit: '', color: '#C62828', round: true },
    { title: 'Top Speed', key: 'top_spd', unit: ' km/h', color: '#37474F', round: false, decimals: 2 },
    { title: 'Avg Metabolic Power', key: 'avg_mp', unit: ' W/kg', color: '#00695C', round: false, decimals: 2 },
  ];

  let pages = '';

  // Standard bar charts
  charts.forEach(chart => {
    pages += buildSingleBarChart(players, chart);
  });

  // Acc + Dec combined chart
  pages += buildAccDecChart(players);

  return pages;
}

function buildSingleBarChart(players, chart) {
  const sorted = [...players].sort((a, b) => b[chart.key] - a[chart.key]);
  const maxVal = Math.max(...sorted.map(p => p[chart.key]));
  const chartMax = maxVal * 1.1;
  const avgVal = avg(sorted.map(p => p[chart.key]));
  const avgPct = chartMax > 0 ? (avgVal / chartMax) * 100 : 0;

  function fmtVal(v) {
    if (chart.round) return Math.round(v);
    return v.toFixed(chart.decimals || 0);
  }

  const rows = sorted.map(p => {
    const v = p[chart.key];
    const pct = chartMax > 0 ? (v / chartMax) * 100 : 0;
    return `<div class="bar-row">
      <div class="bar-label">${esc(p.name)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct.toFixed(1)}%; background:${chart.color};">${fmtVal(v)}${chart.unit}</div>
        <div class="bar-avg-line" style="left:${avgPct.toFixed(1)}%"></div>
      </div>
    </div>`;
  }).join('');

  return `<div class="page">
  <div class="chart-title">${chart.title}</div>
  <div class="bar-chart">${rows}
    <div class="bar-row bar-avg-row">
      <div class="bar-label"></div>
      <div class="bar-track" style="background:transparent; height:auto;">
        <div class="bar-avg-label" style="left:${avgPct.toFixed(1)}%">${fmtVal(avgVal)}${chart.unit}</div>
      </div>
    </div>
  </div>
</div>`;
}

function buildAccDecChart(players) {
  const sorted = [...players].sort((a, b) => b.acc - a.acc);
  const allVals = sorted.flatMap(p => [p.acc, p.dec]);
  const maxVal = Math.max(...allVals);
  const chartMax = maxVal * 1.1;
  const avgAcc = avg(sorted.map(p => p.acc));
  const avgDec = avg(sorted.map(p => p.dec));

  const rows = sorted.map(p => {
    const accPct = chartMax > 0 ? (p.acc / chartMax) * 100 : 0;
    const decPct = chartMax > 0 ? (p.dec / chartMax) * 100 : 0;
    const accAvgPct = chartMax > 0 ? (avgAcc / chartMax) * 100 : 0;
    const decAvgPct = chartMax > 0 ? (avgDec / chartMax) * 100 : 0;
    return `<div class="bar-row">
      <div class="bar-label">${esc(p.name)} — Acc</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${accPct.toFixed(1)}%; background:#00897B;">${p.acc}</div>
        <div class="bar-avg-line" style="left:${accAvgPct.toFixed(1)}%"></div>
      </div>
    </div>
    <div class="bar-row">
      <div class="bar-label">${esc(p.name)} — Dec</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${decPct.toFixed(1)}%; background:#5C6BC0;">${p.dec}</div>
        <div class="bar-avg-line" style="left:${decAvgPct.toFixed(1)}%"></div>
      </div>
    </div>`;
  }).join('');

  const accAvgPctFinal = chartMax > 0 ? (avgAcc / chartMax) * 100 : 0;
  const decAvgPctFinal = chartMax > 0 ? (avgDec / chartMax) * 100 : 0;

  return `<div class="page">
  <div class="chart-title">Accelerations &amp; Decelerations</div>
  <div class="bar-chart">${rows}
    <div class="bar-row bar-avg-row">
      <div class="bar-label" style="font-size:9px; color:#00897B;">Acc avg</div>
      <div class="bar-track" style="background:transparent; height:auto;">
        <div class="bar-avg-label" style="left:${accAvgPctFinal.toFixed(1)}%; color:#00897B;">${Math.round(avgAcc)}</div>
      </div>
    </div>
    <div class="bar-row bar-avg-row">
      <div class="bar-label" style="font-size:9px; color:#5C6BC0;">Dec avg</div>
      <div class="bar-track" style="background:transparent; height:auto;">
        <div class="bar-avg-label" style="left:${decAvgPctFinal.toFixed(1)}%; color:#5C6BC0;">${Math.round(avgDec)}</div>
      </div>
    </div>
  </div>
</div>`;
}

// ── Report CSS (embedded) ──

const REPORT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body { background: #f4f5f8; font-family: 'DM Sans', sans-serif; color: #1a1a2e; }

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

.toolbar { position: fixed; top: 16px; right: 20px; z-index: 999; display: flex; gap: 10px; }
.btn { padding: 9px 22px; border: none; border-radius: 50px; cursor: pointer;
       font-size: 12px; font-weight: 700; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
.btn-print { background: #C62828; color: #fff; }
.btn-print:hover { background: #d32f2f; }
.btn-save { background: #1565C0; color: #fff; }
.btn-save:hover { background: #1976D2; }

.page { max-width: 1200px; margin: 0 auto 28px; padding: 36px 36px 28px;
        background: #fff; border-radius: 12px; border: 1px solid #e4e7ee;
        box-shadow: 0 2px 12px rgba(0,0,0,.06); }

.page-title { font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
              text-transform: uppercase; color: #8a8fa8;
              margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e4e7ee; }

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

.z1h { background: #4a4a4a !important; }
.z2h { background: #1565C0 !important; }
.z3h { background: #2E7D32 !important; }
.z4h { background: #F9A825 !important; color: #222 !important; }
.z5h { background: #C62828 !important; }

.z1 { background: #4a4a4a; } .z2 { background: #1565C0; }
.z3 { background: #2E7D32; } .z4 { background: #F9A825; color: #222 !important; }
.z5 { background: #C62828; } .perf { background: #00838F; }

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
.bar-avg-label { position: absolute; top: 0; font-size: 9px; color: #C62828;
                 font-weight: 700; transform: translateX(-50%); white-space: nowrap; }
.bar-avg-row .bar-track { position: relative; height: 14px !important; }

.targets-table { width: 100%; border-collapse: separate; border-spacing: 0;
                 border-radius: 8px; overflow: hidden; border: 1px solid #e4e7ee; }
.targets-table th { padding: 10px 12px; font-size: 10px; font-weight: 700; color: #fff;
                    text-align: center; background: #1e1e2e;
                    border-right: 1px solid rgba(255,255,255,.08); }
.targets-table td { padding: 8px 10px; font-size: 11px; text-align: center;
                    border-bottom: 1px solid #e4e7ee; border-right: 1px solid #e4e7ee; }
.targets-table tr:nth-child(even) td { background: #fafbff; }
.targets-table tr:hover td { background: #f0f4ff !important; }
.targets-table .player-td { text-align: left; font-weight: 700; }
.targets-table .actual { color: #8a8fa8; font-size: 10px; display: block; margin-top: 2px; }
.targets-table .pct-display { font-weight: 800; font-size: 14px; }
.norm-input { width: 80px; border: 1.5px solid #e4e7ee; border-radius: 6px;
              padding: 5px 8px; font-size: 11px; text-align: center; background: #fffde7;
              font-family: 'DM Sans', sans-serif; }
.norm-input:focus { outline: none; border-color: #1565C0; background: #e8f0fe;
                    box-shadow: 0 0 0 3px rgba(21,101,192,.12); }
.pct-ok  { color: #2E7D32; } .pct-mid { color: #d68000; } .pct-low { color: #C62828; }
`;
