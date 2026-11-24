import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { isPro } from "./supabase.ts";
import { wordCode } from "./telegram.ts";

export interface TgUser {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  is_pro: boolean;
  pro_until: string | null;
  daily_new_limit: number;
  last_study_date: string | null;
  streak_days: number;
}

export interface WordRow {
  id: string;
  pack_id: string;
  word: string;
  meaning_ar: string;
  example_en: string;
  example_ar: string;
  sort_order: number;
  packs: { slug: string; title_ar: string } | null;
}

const WORD_SELECT =
  "id, pack_id, word, meaning_ar, example_en, example_ar, sort_order, packs(slug, title_ar)";

export async function upsertUser(
  sb: SupabaseClient,
  from: { id: number; username?: string; first_name?: string },
): Promise<TgUser> {
  const { data, error } = await sb.from("telegram_users").upsert({
    telegram_id: from.id,
    username: from.username ?? null,
    first_name: from.first_name ?? null,
  }, { onConflict: "telegram_id" }).select("*").single();
  if (error) throw error;
  return data as TgUser;
}

export async function getUser(
  sb: SupabaseClient,
  telegramId: number,
): Promise<TgUser | null> {
  const { data } = await sb.from("telegram_users").select("*").eq(
    "telegram_id",
    telegramId,
  )
    .maybeSingle();
  return (data as TgUser) ?? null;
}

/** Update streak after any study activity today. Returns the user row (refreshed). */
export async function touchStreak(
  sb: SupabaseClient,
  user: TgUser,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (user.last_study_date === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = user.last_study_date === yesterday ? user.streak_days + 1 : 1;
  await sb.from("telegram_users").update({
    last_study_date: today,
    streak_days: streak,
  })
    .eq("telegram_id", user.telegram_id);
}

/** New words introduced today = progress rows created today (a progress row is
 *  created the first time a word is graded, so this count is exact). */
export async function countNewWordsToday(
  sb: SupabaseClient,
  telegramId: number,
): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await sb.from("user_word_progress").select("*", {
    count: "exact",
    head: true,
  }).eq("telegram_id", telegramId).gte("created_at", start.toISOString());
  return count ?? 0;
}

export async function getWordByCode(
  sb: SupabaseClient,
  code: string,
  slug: string,
  sortOrder: number,
): Promise<WordRow | null> {
  void code;
  const { data: pack } = await sb.from("packs").select("id").eq("slug", slug)
    .maybeSingle();
  if (!pack) return null;
  const { data } = await sb.from("words").select(WORD_SELECT)
    .eq("pack_id", (pack as { id: string }).id).eq("sort_order", sortOrder)
    .maybeSingle();
  return (data as unknown as WordRow) ?? null;
}

export async function getWordById(
  sb: SupabaseClient,
  id: string,
): Promise<WordRow | null> {
  const { data } = await sb.from("words").select(WORD_SELECT).eq("id", id)
    .maybeSingle();
  return (data as unknown as WordRow) ?? null;
}

/** Next due word (oldest due first), optionally restricted to one pack. */
export async function nextDueWord(
  sb: SupabaseClient,
  telegramId: number,
  packId?: string,
): Promise<WordRow | null> {
  const { data } = await sb.from("user_word_progress")
    .select("word_id, next_review_at, words!inner(pack_id)")
    .eq("telegram_id", telegramId).lte(
      "next_review_at",
      new Date().toISOString(),
    )
    .order("next_review_at", { ascending: true }).limit(50);
  for (
    const row of (data ?? []) as unknown as {
      word_id: string;
      words: { pack_id: string };
    }[]
  ) {
    if (packId && row.words.pack_id !== packId) continue;
    return getWordById(sb, row.word_id);
  }
  return null;
}

/** Next brand-new word from a pack (lowest sort_order the user has no progress for). */
export async function nextNewWord(
  sb: SupabaseClient,
  telegramId: number,
  packId: string,
): Promise<WordRow | null> {
  const { data: seen } = await sb.from("user_word_progress").select("word_id")
    .eq("telegram_id", telegramId);
  const seenIds = new Set(
    (seen ?? []).map((r: { word_id: string }) => r.word_id),
  );
  const { data } = await sb.from("words").select(WORD_SELECT).eq(
    "pack_id",
    packId,
  )
    .order("sort_order", { ascending: true }).limit(100);
  for (const w of (data ?? []) as unknown as WordRow[]) {
    if (!seenIds.has(w.id)) return w;
  }
  return null;
}

/** Shuffle helper. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build 4 quiz options (correct meaning + 3 distractors from the same pack). */
export async function quizOptions(
  sb: SupabaseClient,
  word: WordRow,
): Promise<{ label: string; code: string }[]> {
  const { data } = await sb.from("words").select(WORD_SELECT).eq(
    "pack_id",
    word.pack_id,
  )
    .neq("id", word.id).limit(100);
  const others = shuffle((data ?? []) as unknown as WordRow[]).slice(0, 3);
  const slug = word.packs?.slug ?? "";
  const options = [
    { label: word.meaning_ar, code: wordCode(slug, word.sort_order) },
    ...others.map((o) => ({
      label: o.meaning_ar,
      code: wordCode(o.packs?.slug ?? slug, o.sort_order),
    })),
  ];
  return shuffle(options);
}

export function cardText(word: WordRow, revealed: boolean): string {
  const meaning = revealed ? `\nالمعنى: <b>${word.meaning_ar}</b>` : "";
  return `📖 <b>${word.word}</b>${meaning}\n\n<i>${word.example_en}</i>\n${word.example_ar}`;
}

export function canAccessPack(
  user: TgUser,
  pack: { is_free: boolean },
): boolean {
  return pack.is_free || isPro(user);
}

export async function dueCount(
  sb: SupabaseClient,
  telegramId: number,
): Promise<number> {
  const { count } = await sb.from("user_word_progress").select("*", {
    count: "exact",
    head: true,
  }).eq("telegram_id", telegramId).lte(
    "next_review_at",
    new Date().toISOString(),
  );
  return count ?? 0;
}
