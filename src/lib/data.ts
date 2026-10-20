import { randomIntBetween, randomItem } from './random.ts';

export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
}

const FIRST_NAMES = ['Ana', 'Lucas', 'Sofia', 'Mateo', 'Valentina', 'Juan', 'Camila', 'Diego'];
const LAST_NAMES = ['Gomez', 'Fernandez', 'Lopez', 'Diaz', 'Martinez', 'Perez', 'Romero', 'Sosa'];
const NEEDS = ['Breakfast', 'Late checkout', 'Parking', 'Crib'];

function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

/** A valid, random booking. The unique last name lets a virtual user find its own data. */
export function randomBooking(): Booking {
  const start = randomIntBetween(10, 300);
  return {
    firstname: randomItem(FIRST_NAMES),
    lastname: `${randomItem(LAST_NAMES)}${__VU}x${__ITER}`,
    totalprice: randomIntBetween(50, 2000),
    depositpaid: Math.random() < 0.5,
    bookingdates: { checkin: isoDate(start), checkout: isoDate(start + randomIntBetween(1, 14)) },
    additionalneeds: randomItem(NEEDS),
  };
}

export function randomFirstName(): string {
  return randomItem(FIRST_NAMES);
}
