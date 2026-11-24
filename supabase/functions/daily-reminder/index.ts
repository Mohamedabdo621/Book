// Daily reminder — meant to be called once a day by Supabase Cron
// (pg_cron + pg_net, see supabase/cron.sql) with header: x-cron-secret: <CRON_SECRET>.
// Sends a short Arabic reminder to users who have words due AND haven't studied today.

import { createServiceClient } from "../_shared/supabase.ts";
import { sendMessage } from "../_shared/telegram.ts";

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const sb = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // Users with at least one due word.
  const { data: dueRows, error } = await sb.from("user_word_progress")
    .select("telegram_id").lte("next_review_at", new Date().toISOString())
    .limit(5000);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  const dueUsers = [
    ...new Set(
      (dueRows ?? []).map((r: { telegram_id: number }) => r.telegram_id),
    ),
  ];

  let sent = 0;
  for (const telegramId of dueUsers) {
    const { data: user } = await sb.from("telegram_users")
      .select("last_study_date, streak_days").eq("telegram_id", telegramId)
      .maybeSingle();
    if (
      !user ||
      (user as { last_study_date: string | null }).last_study_date === today
    ) continue;
    const { count } = await sb.from("user_word_progress").select("*", {
      count: "exact",
      head: true,
    }).eq("telegram_id", telegramId).lte(
      "next_review_at",
      new Date().toISOString(),
    );
    try {
      await sendMessage(
        telegramId,
        `⏰ عندك <b>${
          count ?? 0
        }</b> كلمة مستنية مراجعة النهارده.\nخمس دقايق بس هيحافظوا على سلسلتك (${
          (user as { streak_days: number }).streak_days
        } يوم 🔥) وكلماتك هتثبت.\n\nافتح جلسة اليوم من /today`,
      );
      sent++;
    } catch (err) {
      console.error("reminder failed for", telegramId, err);
    }
  }
  return Response.json({ ok: true, candidates: dueUsers.length, sent });
});
