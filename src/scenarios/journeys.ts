import { check, group, sleep } from 'k6';
import { randomIntBetween, randomItem } from '../lib/random.ts';

import * as api from '../lib/client.ts';
import { randomBooking, randomFirstName } from '../lib/data.ts';
import {
  bookingsCreated,
  bookingsDeleted,
  journeyDuration,
  journeySuccess,
} from '../lib/metrics.ts';

export interface SetupData {
  token: string;
}

/** Pause between user actions, so virtual users behave like people and not like a loop. */
function thinkTime(): void {
  sleep(randomIntBetween(1, 3));
}

function measure(journey: string, steps: () => boolean): void {
  const start = Date.now();
  const ok = steps();
  journeyDuration.add(Date.now() - start, { journey });
  journeySuccess.add(ok, { journey });
}

/** A guest browses the list of bookings and opens a few of them. */
export function browse(): void {
  group('browse', () =>
    measure('browse', () => {
      const list = api.listBookings();
      const listed = check(list, {
        'list: status 200': (r) => r.status === 200,
        'list: returns an array': (r) => Array.isArray(r.json()),
      });
      if (!listed) return false;

      const ids = (list.json() as { bookingid: number }[]).map((b) => b.bookingid);
      let ok = true;
      for (let i = 0; i < 3 && ids.length > 0; i++) {
        const res = api.getBooking(randomItem(ids), true);
        // 404 is valid here: another virtual user may have deleted the booking meanwhile.
        ok =
          check(res, { 'get: status 200 or 404': (r) => r.status === 200 || r.status === 404 }) &&
          ok;
      }
      return ok;
    }),
  );
  thinkTime();
}

/** A guest searches bookings by first name. */
export function search(): void {
  group('search', () =>
    measure('search', () =>
      check(api.searchBookings({ firstname: randomFirstName() }), {
        'search: status 200': (r) => r.status === 200,
        'search: returns an array': (r) => Array.isArray(r.json()),
      }),
    ),
  );
  thinkTime();
}

/** A guest creates a booking and reads it back. */
export function book(): void {
  group('book', () =>
    measure('book', () => {
      const booking = randomBooking();
      const created = api.createBooking(booking);
      const ok = check(created, {
        'create: status 200': (r) => r.status === 200,
        'create: returns an id': (r) => typeof r.json('bookingid') === 'number',
      });
      if (!ok) return false;
      bookingsCreated.add(1);

      const id = created.json('bookingid') as number;
      return check(api.getBooking(id), {
        'read back: status 200': (r) => r.status === 200,
        'read back: same guest': (r) => r.json('lastname') === booking.lastname,
      });
    }),
  );
  thinkTime();
}

/** Hotel staff create, update, partially update and cancel a booking (authenticated). */
export function manage(data: SetupData): void {
  group('manage', () =>
    measure('manage', () => {
      const created = api.createBooking(randomBooking());
      if (!check(created, { 'manage create: status 200': (r) => r.status === 200 })) return false;
      bookingsCreated.add(1);
      const id = created.json('bookingid') as number;

      const updated = api.updateBooking(id, randomBooking(), data.token);
      const patched = api.patchBooking(id, { additionalneeds: 'Late checkout' }, data.token);
      const deleted = api.deleteBooking(id, data.token);

      const ok =
        check(updated, { 'update: status 200': (r) => r.status === 200 }) &&
        check(patched, {
          'patch: status 200': (r) => r.status === 200,
          'patch: field changed': (r) => r.json('additionalneeds') === 'Late checkout',
        }) &&
        check(deleted, { 'delete: status 201': (r) => r.status === 201 });
      if (deleted.status === 201) bookingsDeleted.add(1);
      return ok;
    }),
  );
  thinkTime();
}

/**
 * Realistic traffic mix: most users only read, few write. The weights follow the usual shape
 * of a booking site (browsing >> searching > booking > admin changes).
 */
const MIX: [number, (data: SetupData) => void][] = [
  [0.6, browse],
  [0.2, search],
  [0.15, book],
  [0.05, manage],
];

export function mixedWorkload(data: SetupData): void {
  const roll = Math.random();
  let cumulative = 0;
  for (const [weight, journey] of MIX) {
    cumulative += weight;
    if (roll < cumulative) {
      journey(data);
      return;
    }
  }
  browse();
}

/** Runs once before the test: checks the API is up and gets a token for write journeys. */
export function setupApi(): SetupData {
  const ping = api.ping();
  if (ping.status !== 201) {
    throw new Error(`API is not available: GET /ping returned ${ping.status}`);
  }
  const auth = api.createToken();
  const token = auth.json('token');
  if (typeof token !== 'string') {
    throw new Error(`Could not get a token: ${auth.status} ${auth.body}`);
  }
  return { token };
}
