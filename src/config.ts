/**
 * Central configuration. Every value can be overridden with an environment variable:
 *   k6 run -e BASE_URL=http://localhost:3001 tests/load.ts
 */
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
export const USERNAME = __ENV.API_USERNAME || 'admin';
export const PASSWORD = __ENV.API_PASSWORD || 'password123';

/**
 * Service Level Objectives (SLOs) shared by every test type.
 * Thresholds turn them into pass/fail criteria: if one is breached, k6 exits with code 99
 * and the CI job fails.
 */
export const SLO = {
  /** 95% of all requests faster than this (ms). */
  p95: 500,
  /** 99% of all requests faster than this (ms). */
  p99: 1000,
  /** Maximum share of failed requests. */
  errorRate: 0.01,
  /** Minimum share of passed functional checks. */
  checks: 0.99,
} as const;

/** Thresholds applied to every test, plus per-endpoint latency budgets. */
export function defaultThresholds(): Record<string, string[]> {
  return {
    http_req_failed: [`rate<${SLO.errorRate}`],
    http_req_duration: [`p(95)<${SLO.p95}`, `p(99)<${SLO.p99}`],
    checks: [`rate>${SLO.checks}`],
    // Per-endpoint budgets: writes are allowed to be slower than reads.
    'http_req_duration{endpoint:list_bookings}': ['p(95)<400'],
    'http_req_duration{endpoint:get_booking}': ['p(95)<300'],
    'http_req_duration{endpoint:search_bookings}': ['p(95)<400'],
    'http_req_duration{endpoint:create_booking}': ['p(95)<600'],
    'http_req_duration{endpoint:update_booking}': ['p(95)<600'],
    'http_req_duration{endpoint:patch_booking}': ['p(95)<600'],
    'http_req_duration{endpoint:delete_booking}': ['p(95)<600'],
    'http_req_duration{endpoint:auth}': ['p(95)<400'],
  };
}

/** Percentiles shown in the end-of-test summary (p99 is not included by default). */
export const SUMMARY_TREND_STATS = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];

const ENDPOINTS = [
  'auth',
  'list_bookings',
  'search_bookings',
  'get_booking',
  'create_booking',
  'update_booking',
  'patch_booking',
  'delete_booking',
];

/**
 * k6 only reports tagged sub-metrics that have a threshold. Tests with loose thresholds
 * (stress, spike, breakpoint) add these always-true ones to still get latency per endpoint.
 */
export function endpointBreakdown(): Record<string, string[]> {
  return Object.fromEntries(
    ENDPOINTS.map((endpoint) => [`http_req_duration{endpoint:${endpoint}}`, ['max>=0']]),
  );
}
