// Builds the GitHub Pages site from the reports of a run:
//   site/index.html          overview of every test (SLO results + key numbers)
//   site/<test>-report.html  k6 web dashboard of each test
//
// Usage: node scripts/build-site.mjs

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

const REPORTS = 'reports';
const SITE = 'site';
const ORDER = ['smoke', 'load', 'spike', 'stress', 'soak', 'breakpoint'];

mkdirSync(SITE, { recursive: true });

const escape = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const ms = (v) => (v === undefined ? '-' : `${Math.round(v)} ms`);
const pct = (v) => (v === undefined ? '-' : `${(v * 100).toFixed(2)}%`);

const tests = readdirSync(REPORTS)
  .filter((file) => file.endsWith('-summary.json'))
  .map((file) => file.replace('-summary.json', ''))
  .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

const rows = tests.map((name) => {
  const { metrics } = JSON.parse(readFileSync(`${REPORTS}/${name}-summary.json`, 'utf8'));
  const duration = metrics.http_req_duration?.values ?? {};
  const thresholds = Object.values(metrics).flatMap((m) => Object.values(m.thresholds ?? {}));
  const passed = thresholds.every((t) => t.ok);
  const dashboard = `${name}-report.html`;
  const hasDashboard = existsSync(`${REPORTS}/${dashboard}`);
  if (hasDashboard) copyFileSync(`${REPORTS}/${dashboard}`, `${SITE}/${dashboard}`);

  return `
      <tr>
        <td><strong>${escape(name)}</strong></td>
        <td class="${passed ? 'pass' : 'fail'}">${passed ? 'Pass' : 'SLO breached'}</td>
        <td>${metrics.http_reqs?.values.count ?? 0}</td>
        <td>${(metrics.http_reqs?.values.rate ?? 0).toFixed(1)} req/s</td>
        <td>${ms(duration['p(95)'])}</td>
        <td>${ms(duration['p(99)'])}</td>
        <td>${pct(metrics.http_req_failed?.values.rate)}</td>
        <td>${hasDashboard ? `<a href="${dashboard}">Dashboard</a>` : '-'}</td>
      </tr>`;
});

const commit = (process.env.GITHUB_SHA ?? 'local').slice(0, 7);
const date = new Date().toISOString().replace('T', ' ').slice(0, 16);

writeFileSync(
  `${SITE}/index.html`,
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Restful-Booker performance results</title>
  <style>
    :root { color-scheme: light dark; --ok: #1a7f37; --bad: #cf222e; --line: #8884; }
    body { font: 16px/1.5 system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: .5rem .75rem; border-bottom: 1px solid var(--line); text-align: left; }
    th { font-size: .85rem; text-transform: uppercase; letter-spacing: .03em; }
    .pass { color: var(--ok); font-weight: 600; }
    .fail { color: var(--bad); font-weight: 600; }
    .meta { opacity: .7; font-size: .9rem; }
    .wrap { overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Restful-Booker · performance results</h1>
  <p class="meta">Latest nightly run · ${escape(date)} UTC · commit ${escape(commit)} ·
    API in Docker with 1 CPU and 512 MB ·
    <a href="https://github.com/franv98dev/restful-booker-performance-tests">source code</a></p>
  <p>SLOs: p95 &lt; 500 ms · p99 &lt; 1000 ms · errors &lt; 1% · checks &gt; 99%.
    Stress and spike tests use looser limits on purpose (see the README).</p>
  <div class="wrap">
  <table>
    <thead>
      <tr><th>Test</th><th>Result</th><th>Requests</th><th>Throughput</th><th>p95</th><th>p99</th><th>Errors</th><th>Details</th></tr>
    </thead>
    <tbody>${rows.join('')}
    </tbody>
  </table>
  </div>
</body>
</html>
`,
);

console.log(`Site built with ${tests.length} test(s): ${tests.join(', ')}`);
