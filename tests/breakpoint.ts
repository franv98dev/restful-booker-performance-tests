/**
 * BREAKPOINT TEST: keeps increasing the arrival rate until the SLOs break, then stops.
 * Goal: find the maximum sustainable throughput (capacity) of the system.
 * `abortOnFail` ends the test as soon as a threshold is crossed; the rate reached at that
 * moment is the breakpoint.
 */
import { endpointBreakdown, SLO, SUMMARY_TREND_STATS } from '../src/config.ts';
import { buildSummary } from '../src/lib/summary.ts';
import { mixedWorkload, setupApi, type SetupData } from '../src/scenarios/journeys.ts';

export const options = {
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    find_the_limit: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: Number(__ENV.MAX_VUS || 1000),
      stages: [{ duration: __ENV.DURATION || '10m', target: Number(__ENV.MAX_RATE || 400) }],
    },
  },
  thresholds: {
    ...endpointBreakdown(),
    http_req_failed: [
      { threshold: `rate<${SLO.errorRate}`, abortOnFail: true, delayAbortEval: '10s' },
    ],
    http_req_duration: [
      { threshold: `p(95)<${SLO.p95}`, abortOnFail: true, delayAbortEval: '10s' },
    ],
  },
};

export const setup = setupApi;

export default function (data: SetupData): void {
  mixedWorkload(data);
}

export function handleSummary(data: unknown) {
  return buildSummary('breakpoint', data);
}
