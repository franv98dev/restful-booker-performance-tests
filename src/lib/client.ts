import http, { type RefinedResponse, type ResponseType } from 'k6/http';

import { BASE_URL, PASSWORD, USERNAME } from '../config.ts';
import { type Booking } from './data.ts';

type Response = RefinedResponse<ResponseType | undefined>;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // A single media type on purpose: the API answers "418 I'm a Teapot" when Accept lists
  // several types (see the API tests project, BUG-014).
  Accept: 'application/json',
};

/**
 * Every request carries an `endpoint` tag. It groups URLs with different ids
 * (/booking/1, /booking/2...) into one metric and lets thresholds target a single endpoint.
 */
function params(endpoint: string, token?: string) {
  return {
    headers: token ? { ...JSON_HEADERS, Cookie: `token=${token}` } : JSON_HEADERS,
    tags: { endpoint, name: endpoint },
  };
}

/**
 * While browsing, another virtual user may delete a booking between listing it and opening it.
 * That 404 is expected behaviour, so it must not count in `http_req_failed`.
 */
const OK_OR_NOT_FOUND = http.expectedStatuses({ min: 200, max: 399 }, 404);

export function ping(): Response {
  return http.get(`${BASE_URL}/ping`, params('ping'));
}

export function createToken(): Response {
  return http.post(
    `${BASE_URL}/auth`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    params('auth'),
  );
}

export function listBookings(): Response {
  return http.get(`${BASE_URL}/booking`, params('list_bookings'));
}

export function searchBookings(query: Record<string, string>): Response {
  const qs = Object.entries(query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return http.get(`${BASE_URL}/booking?${qs}`, params('search_bookings'));
}

export function getBooking(id: number, allowNotFound = false): Response {
  const request = params('get_booking');
  return http.get(
    `${BASE_URL}/booking/${id}`,
    allowNotFound ? { ...request, responseCallback: OK_OR_NOT_FOUND } : request,
  );
}

export function createBooking(booking: Booking): Response {
  return http.post(`${BASE_URL}/booking`, JSON.stringify(booking), params('create_booking'));
}

export function updateBooking(id: number, booking: Booking, token: string): Response {
  return http.put(
    `${BASE_URL}/booking/${id}`,
    JSON.stringify(booking),
    params('update_booking', token),
  );
}

export function patchBooking(id: number, fields: Partial<Booking>, token: string): Response {
  return http.patch(
    `${BASE_URL}/booking/${id}`,
    JSON.stringify(fields),
    params('patch_booking', token),
  );
}

export function deleteBooking(id: number, token: string): Response {
  return http.del(`${BASE_URL}/booking/${id}`, null, params('delete_booking', token));
}
