import { applySm2, qualityFromQuiz } from "./sm2.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`assert failed: ${msg}`);
}
function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

const fresh = { ease_factor: 2.5, interval_days: 0, repetitions: 0 };
const now = new Date("2026-11-24T00:00:00Z");

Deno.test("first correct answer -> interval 1 day, repetitions 1", () => {
  const r = applySm2(fresh, qualityFromQuiz(true), now);
  assertEq(r.interval_days, 1, "interval");
  assertEq(r.repetitions, 1, "repetitions");
  assertEq(
    r.next_review_at.toISOString(),
    "2026-11-25T00:00:00.000Z",
    "next review",
  );
});

Deno.test("second correct -> interval 6 days", () => {
  const first = applySm2(fresh, 4, now);
  const second = applySm2(first, 4, now);
  assertEq(second.interval_days, 6, "interval");
  assertEq(second.repetitions, 2, "repetitions");
});

Deno.test("third correct -> interval scales by ease factor", () => {
  const first = applySm2(fresh, 4, now);
  const second = applySm2(first, 4, now);
  const third = applySm2(second, 4, now);
  // ease after two quality-4 grades stays 2.5 -> 6 * 2.5 = 15
  assertEq(third.interval_days, 15, "interval");
  assertEq(third.repetitions, 3, "repetitions");
});

Deno.test("wrong answer -> reset to 1 day, repetitions 0, ease drops but >= 1.3", () => {
  const learned = applySm2(applySm2(fresh, 4, now), 4, now);
  const r = applySm2(learned, qualityFromQuiz(false), now);
  assertEq(r.interval_days, 1, "interval");
  assertEq(r.repetitions, 0, "repetitions");
  assert(r.ease_factor >= 1.3, "ease floor");
  assert(r.ease_factor < learned.ease_factor, "ease decreased");
});
