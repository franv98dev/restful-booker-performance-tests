import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

import { SLO } from '../config.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SummaryData = any;

function ms(value: number | undefined): string {
  return value === undefined ? '-' : `${value.toFixed(0)} ms`;
}

function pct(value: number | undefined): string {
  return value === undefined ? '-' : `${(value * 100).toFixed(2)}%`;
}

/** Markdown summary: used as the GitHub Actions job summary and saved next to the report. */
function markdown(testName: string, data: SummaryData): string {
  const m = data.metrics;
  const duration = m.http_req_duration?.values ?? {};
  const thresholds = Object.entries(m)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap(([metric, v]: [string, any]) =>
      Object.entries(v.thresholds ?? {}).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ([rule, t]: [string, any]) => `| \`${metric}\` | \`${rule}\` | ${t.ok ? '✅' : '❌'} |`,
      ),
    );

  const endpoints = Object.keys(m)
    .filter((k) => k.startsWith('http_req_duration{endpoint:'))
    .sort()
    .map((k) => {
      const v = m[k].values;
      const name = k.slice('http_req_duration{endpoint:'.length, -1);
      return `| ${name} | ${ms(v.avg)} | ${ms(v['p(95)'])} | ${ms(v.max)} |`;
    });

  return [
    `## Performance test: ${testName}`,
    '',
    `| Requests | Throughput | Error rate | p95 | p99 | Checks passed |`,
    `| ---: | ---: | ---: | ---: | ---: | ---: |`,
    `| ${m.http_reqs?.values.count ?? 0} | ${(m.http_reqs?.values.rate ?? 0).toFixed(1)} req/s | ${pct(m.http_req_failed?.values.rate)} | ${ms(duration['p(95)'])} | ${ms(duration['p(99)'])} | ${pct(m.checks?.values.rate)} |`,
    '',
    `SLOs: p95 < ${SLO.p95} ms · p99 < ${SLO.p99} ms · errors < ${SLO.errorRate * 100}% · checks > ${SLO.checks * 100}%`,
    '',
    '### Latency by endpoint',
    '',
    '| Endpoint | avg | p95 | max |',
    '| --- | ---: | ---: | ---: |',
    ...endpoints,
    '',
    '### Thresholds',
    '',
    '| Metric | Rule | Result |',
    '| --- | --- | :---: |',
    ...thresholds,
    '',
  ].join('\n');
}

/** Builds the end-of-test outputs: console summary, JSON for tooling and Markdown for humans. */
export function buildSummary(testName: string, data: SummaryData): Record<string, string> {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`reports/${testName}-summary.json`]: JSON.stringify(data, null, 2),
    [`reports/${testName}-summary.md`]: markdown(testName, data),
  };
}
