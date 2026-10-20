import { Counter, Rate, Trend } from 'k6/metrics';

/** Business-level metrics, reported next to k6's built-in HTTP metrics. */
export const bookingsCreated = new Counter('bookings_created');
export const bookingsDeleted = new Counter('bookings_deleted');

/** Duration of each full user journey (all its requests, without think time). */
export const journeyDuration = new Trend('journey_duration', true);

/** Share of journeys that completed every step correctly. */
export const journeySuccess = new Rate('journey_success');
