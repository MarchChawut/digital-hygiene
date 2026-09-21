// Client-safe helpers for the self-reported device storage (GB) asked in the two pop-ups.

// Anything above this is a typo or abuse. It bounds how far ONE account can move the admin's
// averages (the cap used to be 100 000 GB = 100 TB: a single Guest account shifted the "average
// freed" card by tens of thousands of GB) — 16 TB is above any phone/laptop/desktop disk in use.
export const MAX_GB = 16_384;

export function isValidGb(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_GB;
}

// Text field -> number, or null when empty/invalid. Accepts a decimal comma ("128,5"), which the
// Thai keyboard on a phone offers.
export function parseGbInput(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (text === "" || !/^\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return isValidGb(n) ? n : null;
}

// Used space went down by this much (negative = it grew). One decimal, like the admin export.
export function freedGb(before: number, after: number): number {
  return Math.round((before - after) * 10) / 10;
}
