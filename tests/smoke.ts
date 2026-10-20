/**
 * SMOKE TEST: a minimal load (1 virtual user) that runs every journey once.
 * Goal: the script and the system work before running bigger tests. Runs on every push.
 */
import { defaultThresholds, SUMMARY_TREND_STATS } from '../src/config.ts';
import { buildSummary } from '../src/lib/summary.ts';
import {
  browse,
  book,
  manage,
  search,
  setupApi,
  type SetupData,
} from '../src/scenarios/journeys.ts';

export const options = {
  summaryTrendStats: SUMMARY_TREND_STATS,
  vus: 1,
  iterations: 3,
  thresholds: {
    ...defaultThresholds(),
    // In a smoke test every single check must pass.
    checks: ['rate==1'],
  },
};

export const setup = setupApi;

export default function (data: SetupData): void {
  browse();
  search();
  book();
  manage(data);
}

export function handleSummary(data: unknown) {
  return buildSummary('smoke', data);
}
