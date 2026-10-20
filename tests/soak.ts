/**
 * SOAK TEST: normal load for a long time.
 * Goal: find problems that only appear over time (memory leaks, growing response times,
 * data that piles up). Latency at the end must look like latency at the start.
 *
 *   k6 run -e DURATION=1h tests/soak.ts
 */
import { defaultThresholds, SUMMARY_TREND_STATS } from '../src/config.ts';
import { buildSummary } from '../src/lib/summary.ts';
import { mixedWorkload, setupApi, type SetupData } from '../src/scenarios/journeys.ts';

export const options = {
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    long_run: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || '30m',
    },
  },
  thresholds: defaultThresholds(),
};

export const setup = setupApi;

export default function (data: SetupData): void {
  mixedWorkload(data);
}

export function handleSummary(data: unknown) {
  return buildSummary('soak', data);
}
