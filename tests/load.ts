/**
 * LOAD TEST: the expected, normal traffic.
 * Open model (constant-arrival-rate): new journeys start at a fixed rate whether or not the
 * system is slow, like real users do. Goal: the SLOs hold under the usual load.
 *
 *   k6 run -e RATE=10 -e DURATION=5m tests/load.ts
 */
import { defaultThresholds, SUMMARY_TREND_STATS } from '../src/config.ts';
import { buildSummary } from '../src/lib/summary.ts';
import { mixedWorkload, setupApi, type SetupData } from '../src/scenarios/journeys.ts';

const RATE = Number(__ENV.RATE || 10);

export const options = {
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    normal_traffic: {
      executor: 'constant-arrival-rate',
      rate: RATE, // journeys started per second
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: RATE * 3,
      maxVUs: RATE * 10,
    },
  },
  thresholds: {
    ...defaultThresholds(),
    // If the load generator can't start journeys on time, the test is not valid.
    dropped_iterations: ['count<10'],
  },
};

export const setup = setupApi;

export default function (data: SetupData): void {
  mixedWorkload(data);
}

export function handleSummary(data: unknown) {
  return buildSummary('load', data);
}
