/**
 * STRESS TEST: goes well above the normal load, step by step, to see how the system degrades.
 * Goal: find at which level latency or errors break the SLOs, and check the system recovers
 * when the load goes back down.
 */

import { endpointBreakdown, SUMMARY_TREND_STATS } from '../src/config.ts';
import { buildSummary } from '../src/lib/summary.ts';
import { mixedWorkload, setupApi, type SetupData } from '../src/scenarios/journeys.ts';

const STEP = __ENV.STEP || '1m';

export const options = {
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    stepped_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      // With 1-3 s of think time each virtual user sends about 1.5 requests per second,
      // so 400 VUs ask for ~600 req/s: above the ~480 req/s found by the breakpoint test.
      stages: [
        { duration: '30s', target: 50 }, // normal load
        { duration: STEP, target: 50 },
        { duration: '30s', target: 150 }, // above normal
        { duration: STEP, target: 150 },
        { duration: '30s', target: 300 }, // around the limit
        { duration: STEP, target: 300 },
        { duration: '30s', target: 400 }, // beyond the limit
        { duration: STEP, target: 400 },
        { duration: '1m', target: 0 }, // recovery
      ],
      gracefulRampDown: '30s',
    },
  },
  // Stress tests are expected to break the SLOs at the top: thresholds here are looser
  // and only fail the run if the system collapses.
  thresholds: {
    ...endpointBreakdown(),
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export const setup = setupApi;

export default function (data: SetupData): void {
  mixedWorkload(data);
}

export function handleSummary(data: unknown) {
  return buildSummary('stress', data);
}
