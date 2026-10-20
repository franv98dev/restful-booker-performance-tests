/**
 * SPIKE TEST: a sudden jump of traffic (e.g. a promotion goes live), then back to normal.
 * Goal: the system survives the spike without failing requests and recovers quickly.
 */
import { endpointBreakdown, SUMMARY_TREND_STATS } from '../src/config.ts';
import { buildSummary } from '../src/lib/summary.ts';
import { mixedWorkload, setupApi, type SetupData } from '../src/scenarios/journeys.ts';

const PEAK = Number(__ENV.PEAK || 150);

export const options = {
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    traffic_spike: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 5 }, // calm
        { duration: '10s', target: PEAK }, // spike
        { duration: '1m', target: PEAK }, // stay at the peak
        { duration: '10s', target: 5 }, // back to normal
        { duration: '1m', target: 5 }, // recovery
      ],
    },
  },
  thresholds: {
    ...endpointBreakdown(),
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(99)<3000'],
  },
};

export const setup = setupApi;

export default function (data: SetupData): void {
  mixedWorkload(data);
}

export function handleSummary(data: unknown) {
  return buildSummary('spike', data);
}
