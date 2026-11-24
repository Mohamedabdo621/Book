// Simplified SM-2 spaced repetition (pure, unit-testable).
//
// Quiz mapping used by the bot (documented in README):
//   correct answer  -> quality 4 ("good")
//   wrong answer    -> quality 1 ("again")
// Direct grades 0-5 are also accepted for future UIs (e.g. self-grading buttons).
//
// Rules (classic SM-2):
//   quality < 3  -> repetitions = 0, interval = 1 day
//   quality >= 3 -> interval: 1st rep = 1 day, 2nd rep = 6 days,
//                   later = round(previous interval * ease_factor)
//   ease_factor' = ease + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), floored at 1.3

export interface WordProgress {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export interface Sm2Result extends WordProgress {
  next_review_at: Date;
}

export function applySm2(
  progress: WordProgress,
  quality: number,
  now: Date = new Date(),
): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease_factor, interval_days, repetitions } = progress;

  if (q < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions += 1;
  }

  ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease_factor < 1.3) ease_factor = 1.3;
  ease_factor = Math.round(ease_factor * 100) / 100;

  const next = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);
  return { ease_factor, interval_days, repetitions, next_review_at: next };
}

export function qualityFromQuiz(correct: boolean): number {
  return correct ? 4 : 1;
}
