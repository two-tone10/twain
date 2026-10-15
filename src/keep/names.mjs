// What other players see you as, and what circles are called: picked from these lists, never typed.
// Keep never asks anyone for their name. The server accepts only names from these lists
// (supabase/migrations/20261016100000_keep_no_typing.sql carries the same lists).

export const STAR_NAMES = [
  'Vega', 'Lyra', 'Altair', 'Deneb', 'Rigel', 'Sirius', 'Capella', 'Arcturus', 'Spica', 'Antares',
  'Polaris', 'Castor', 'Pollux', 'Mira', 'Electra', 'Maia', 'Alcyone', 'Merope', 'Atlas', 'Bellatrix',
  'Betelgeuse', 'Aldebaran', 'Regulus', 'Procyon', 'Achernar', 'Canopus', 'Fomalhaut', 'Hadar', 'Mimosa', 'Shaula',
  'Alnilam', 'Mintaka', 'Saiph', 'Alphard', 'Denebola', 'Algol', 'Mirach', 'Alpheratz', 'Hamal', 'Menkar',
  'Elnath', 'Alhena', 'Wezen', 'Adhara', 'Naos', 'Avior', 'Peacock', 'Nunki', 'Kaus', 'Rasalhague',
  'Sabik', 'Izar', 'Alkaid', 'Mizar', 'Alcor', 'Dubhe', 'Merak', 'Phecda', 'Thuban', 'Eltanin',
  'Sadr', 'Albireo', 'Enif', 'Markab', 'Scheat', 'Ankaa', 'Diphda', 'Acrux', 'Gacrux', 'Atria',
];
export const isStarName = (n) => STAR_NAMES.includes(n);

const CIRCLE_A = ['Quiet', 'Late', 'Bright', 'Slow', 'Far', 'Little', 'Wild', 'Gold', 'North', 'Small', 'Long', 'Silver'];
const CIRCLE_B = ['Harbor', 'Lanterns', 'Orchard', 'Porch', 'Comets', 'Kitchen', 'Meadow', 'Lighthouse', 'Table', 'Garden', 'Fireflies', 'Hours'];
export const circleNameAt = (a, b) => `The ${CIRCLE_A[a % CIRCLE_A.length]} ${CIRCLE_B[b % CIRCLE_B.length]}`;
export const isCircleName = (n) => CIRCLE_A.some((a) => CIRCLE_B.some((b) => n === `The ${a} ${b}`));

// A different one each time, never the same as the last.
export function anotherStar(current, rnd = Math.random) {
  const pool = STAR_NAMES.filter((n) => n !== current);
  return pool[Math.floor(rnd() * pool.length)];
}
export function anotherCircle(current, rnd = Math.random) {
  let n;
  do n = circleNameAt(Math.floor(rnd() * CIRCLE_A.length), Math.floor(rnd() * CIRCLE_B.length)); while (n === current);
  return n;
}

// For the server's allowlist.
export const CIRCLE_PARTS = { a: CIRCLE_A, b: CIRCLE_B };
