// Kalima bot brain — Telegram webhook.
//
// Stateless by design: no server-side session is stored. The bot derives the
// "current session" from the DB on every step (next due word, else next new
// word), and button context travels in callback_data using short codes
// (see _shared/telegram.ts — callback_data is capped at 64 bytes by Telegram):
//   m:<menu>            main menu actions          e.g. m:today
//   p:<packSlug>        open a pack                e.g. p:tech
//   rv:<wordCode>       reveal meaning             e.g. rv:j12
//   qz:<wordCode>       start quiz for the word    e.g. qz:j12
//   q:<ansCode>:<pick>  quiz answer                e.g. q:j12:j7
//   nx:<mode>:<scope>  next word (s=session, r=review; scope=all or pack slug)

import { createServiceClient, isPro } from "../_shared/supabase.ts";
import {
  answerCallbackQuery,
  editMessageText,
  type InlineKeyboard,
  menuKeyboard,
  parseWordCode,
  quizKeyboard,
  sendMessage,
  sendWordCard,
  wordCode,
} from "../_shared/telegram.ts";
import {
  canAccessPack,
  cardText,
  countNewWordsToday,
  dueCount,
  getUser,
  getWordByCode,
  nextDueWord,
  nextNewWord,
  quizOptions,
  type TgUser,
  touchStreak,
  upsertUser,
  type WordRow,
} from "../_shared/session.ts";
import { applySm2, qualityFromQuiz } from "../_shared/sm2.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface TgFrom {
  id: number;
  username?: string;
  first_name?: string;
}
interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: TgFrom;
  text?: string;
}
interface TgCallback {
  id: string;
  from: TgFrom;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}
interface TgUpdate {
  message?: TgMessage;
  callback_query?: TgCallback;
}

const WELCOME = (name: string) =>
  `أهلاً ${name} 👋 أنا <b>بوت كلمة</b> — هعلّمك كلمات إنجليزية مهمة كل يوم، وبأسلوب التكرار المتباعد عشان الكلمة تثبت ومتنسهاش.\n\nاختار من القايمة اللي تحت 👇`;

async function showPacks(sb: SupabaseClient, user: TgUser, chatId: number) {
  const { data } = await sb.from("packs").select("*").order("sort_order");
  const rows = (data ?? []).map((p: {
    slug: string;
    title_ar: string;
    title_en: string;
    is_free: boolean;
  }) => {
    const locked = !canAccessPack(user, p);
    return [{
      text: `${locked ? "🔒" : "📦"} ${p.title_ar} — ${p.title_en}`,
      callback_data: `p:${p.slug}`,
    }];
  });
  rows.push([{ text: "🏠 القايمة الرئيسية", callback_data: "m:menu" }]);
  await sendMessage(
    chatId,
    "📚 <b>الحزم المتاحة</b>\nالحزمة المقفولة 🔒 بتتفتح مع Pro.",
    {
      inline_keyboard: rows,
    },
  );
}

async function serveNext(
  sb: SupabaseClient,
  user: TgUser,
  chatId: number,
  mode: "s" | "r",
  scope: string,
) {
  let packId: string | undefined;
  let packSlug: string | undefined;
  if (scope !== "all") {
    const { data: pack } = await sb.from("packs").select("*").eq("slug", scope)
      .maybeSingle();
    if (!pack) {
      await sendMessage(chatId, "الحزمة دي مش موجودة.", menuKeyboard());
      return;
    }
    const p = pack as { id: string; slug: string; is_free: boolean };
    if (!canAccessPack(user, p)) {
      await showPro(user, chatId);
      return;
    }
    packId = p.id;
    packSlug = p.slug;
  }

  // 1) Reviews due first (both in session and review modes).
  const due = await nextDueWord(sb, user.telegram_id, packId);
  if (due) {
    await sendWordCard(
      chatId,
      `🔁 <b>مراجعة</b>\n\n${cardText(due, false)}`,
      wordCode(due.packs?.slug ?? "", due.sort_order),
    );
    return;
  }
  if (mode === "r") {
    await sendMessage(
      chatId,
      "🎉 مفيش مراجعات مستحقة دلوقتي. برافو عليك!",
      menuKeyboard(),
    );
    return;
  }

  // 2) New words, respecting the daily limit (Pro = unlimited).
  const limit = isPro(user) ? Number.MAX_SAFE_INTEGER : user.daily_new_limit;
  const newToday = await countNewWordsToday(sb, user.telegram_id);
  if (newToday >= limit) {
    await sendMessage(
      chatId,
      `⏳ خلّصت كلمات النهارده الجديدة (${limit}). المراجعات لسه متاحة، أو كمّل بكرة — والاستمرارية أهم من الكمية 💪`,
      menuKeyboard(),
    );
    return;
  }

  let word: WordRow | null = null;
  if (packId) {
    word = await nextNewWord(sb, user.telegram_id, packId);
  } else {
    const { data: packs } = await sb.from("packs").select("*").order(
      "sort_order",
    );
    for (const p of (packs ?? []) as { id: string; is_free: boolean }[]) {
      if (!canAccessPack(user, p)) continue;
      word = await nextNewWord(sb, user.telegram_id, p.id);
      if (word) break;
    }
  }
  if (!word) {
    await sendMessage(
      chatId,
      "🎓 خلّصت كل الكلمات المتاحة ليك. جرّب المراجعة أو فعّل Pro لحزم أكتر.",
      menuKeyboard(),
    );
    return;
  }
  void packSlug;
  await sendWordCard(
    chatId,
    `🆕 <b>كلمة جديدة</b>\n\n${cardText(word, false)}`,
    wordCode(word.packs?.slug ?? "", word.sort_order),
  );
}

async function showProgress(sb: SupabaseClient, user: TgUser, chatId: number) {
  const { count: learned } = await sb.from("user_word_progress")
    .select("*", { count: "exact", head: true }).eq(
      "telegram_id",
      user.telegram_id,
    );
  const due = await dueCount(sb, user.telegram_id);
  const newToday = await countNewWordsToday(sb, user.telegram_id);
  await sendMessage(
    chatId,
    `📊 <b>تقدّمك</b>\n\n📖 كلمات اتعلمتها: <b>${
      learned ?? 0
    }</b>\n🔁 مستحق للمراجعة دلوقتي: <b>${due}</b>\n🆕 كلمات جديدة النهارده: <b>${newToday}</b>\n🔥 سلسلة أيام متتالية: <b>${user.streak_days}</b> يوم\n⭐ حالتك: <b>${
      isPro(user) ? "Pro" : "مجاني"
    }</b>`,
    menuKeyboard(),
  );
}

async function showPro(user: TgUser, chatId: number) {
  if (isPro(user)) {
    await sendMessage(
      chatId,
      "⭐ إنت Pro فعلاً — كل الحزم مفتوحة والكلمات الجديدة بلا حد. استمتع!",
      menuKeyboard(),
    );
    return;
  }
  const url = Deno.env.get("POLAR_CHECKOUT_URL");
  const kb: InlineKeyboard = url
    ? {
      inline_keyboard: [[{ text: "⭐ اشترك في Pro — $3/شهر", url }], [{
        text: "🏠 القايمة الرئيسية",
        callback_data: "m:menu",
      }]],
    }
    : menuKeyboard();
  await sendMessage(
    chatId,
    `⭐ <b>Kalima Pro — $3/شهر تقريباً</b>\n\n✅ كل الحزم مفتوحة (مقابلات + تقنية + آيلتس وحزم جاية)\n✅ كلمات جديدة بلا حد يومياً\n✅ مراجعات كاملة\n\n${
      url
        ? "ادفع من زرار الاشتراك اللي تحت، وهيتم تفعيل حسابك بعد تأكيد الدفع."
        : "الدفع هيتفعّل قريباً جداً — شكراً على صبرك 🙏"
    }`,
    kb,
  );
}

async function gradeAnswer(
  sb: SupabaseClient,
  user: TgUser,
  chatId: number,
  messageId: number | undefined,
  ansCode: string,
  pickCode: string,
) {
  const ansParsed = parseWordCode(ansCode);
  if (!ansParsed) return;
  const word = await getWordByCode(
    sb,
    ansCode,
    ansParsed.slug,
    ansParsed.sortOrder,
  );
  if (!word) return;
  const correct = ansCode === pickCode;

  const { data: existing } = await sb.from("user_word_progress").select("*")
    .eq("telegram_id", user.telegram_id).eq("word_id", word.id).maybeSingle();
  const prev = existing as {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
  } | null;
  const result = applySm2(
    prev ?? { ease_factor: 2.5, interval_days: 0, repetitions: 0 },
    qualityFromQuiz(correct),
  );
  await sb.from("user_word_progress").upsert({
    telegram_id: user.telegram_id,
    word_id: word.id,
    ease_factor: result.ease_factor,
    interval_days: result.interval_days,
    repetitions: result.repetitions,
    next_review_at: result.next_review_at.toISOString(),
    last_result: correct ? "correct" : "wrong",
  }, { onConflict: "telegram_id,word_id" });
  await sb.from("quiz_events").insert({
    telegram_id: user.telegram_id,
    word_id: word.id,
    correct,
  });
  await touchStreak(sb, user);

  const feedback = correct
    ? `✅ <b>صح!</b> ${word.word} = ${word.meaning_ar}\nهراجعها معاك بعد ${result.interval_days} يوم.`
    : `❌ <b>مش دي.</b> ${word.word} معناها: <b>${word.meaning_ar}</b>\n<i>${word.example_en}</i>\nهرجع أوريهالك بكرة عشان تثبت.`;
  const kb: InlineKeyboard = {
    inline_keyboard: [
      [{ text: "▶️ الكلمة اللي بعدها", callback_data: "nx:s:all" }, {
        text: "🔁 مراجعة",
        callback_data: "nx:r:all",
      }],
      [{ text: "🏠 القايمة الرئيسية", callback_data: "m:menu" }],
    ],
  };
  if (messageId) {
    await editMessageText(
      chatId,
      messageId,
      `${cardText(word, true)}\n\n${feedback}`,
      kb,
    ).catch(
      () => sendMessage(chatId, feedback, kb),
    );
  } else {
    await sendMessage(chatId, feedback, kb);
  }
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }
  let update: TgUpdate;
  try {
    update = await req.json() as TgUpdate;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const sb = createServiceClient();

  try {
    if (update.message?.from && update.message.chat) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const user = await upsertUser(sb, msg.from!);
      const text = (msg.text ?? "").trim();
      const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();
      if (cmd === "/start") {
        await sendMessage(
          chatId,
          WELCOME(user.first_name ?? "صديقي"),
          menuKeyboard(),
        );
      } else if (cmd === "/packs") await showPacks(sb, user, chatId);
      else if (cmd === "/today") await serveNext(sb, user, chatId, "s", "all");
      else if (cmd === "/review") await serveNext(sb, user, chatId, "r", "all");
      else if (cmd === "/progress") await showProgress(sb, user, chatId);
      else if (cmd === "/pro") await showPro(user, chatId);
      else {
        await sendMessage(chatId, "اختار من القايمة 👇", menuKeyboard());
      }
      return new Response("ok");
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat.id ?? cq.from.id;
      const user = (await getUser(sb, cq.from.id)) ??
        await upsertUser(sb, cq.from);
      const data = cq.data ?? "";
      await answerCallbackQuery(cq.id);

      if (data === "m:menu") {
        await sendMessage(chatId, "🏠 القايمة الرئيسية", menuKeyboard());
      } else if (data === "m:packs") await showPacks(sb, user, chatId);
      else if (data === "m:today") {
        await serveNext(sb, user, chatId, "s", "all");
      } else if (data === "m:review") {
        await serveNext(sb, user, chatId, "r", "all");
      } else if (data === "m:progress") await showProgress(sb, user, chatId);
      else if (data === "m:pro") await showPro(user, chatId);
      else if (data.startsWith("p:")) {
        await serveNext(sb, user, chatId, "s", data.slice(2));
      } else if (data.startsWith("nx:")) {
        const [, mode, scope] = data.split(":");
        await serveNext(
          sb,
          user,
          chatId,
          mode === "r" ? "r" : "s",
          scope ?? "all",
        );
      } else if (data.startsWith("rv:")) {
        const code = data.slice(3);
        const parsed = parseWordCode(code);
        const word = parsed
          ? await getWordByCode(sb, code, parsed.slug, parsed.sortOrder)
          : null;
        if (word && cq.message) {
          await editMessageText(
            chatId,
            cq.message.message_id,
            cardText(word, true),
            {
              inline_keyboard: [[{
                text: "🧠 اختبرني",
                callback_data: `qz:${code}`,
              }]],
            },
          );
        }
      } else if (data.startsWith("qz:")) {
        const code = data.slice(3);
        const parsed = parseWordCode(code);
        const word = parsed
          ? await getWordByCode(sb, code, parsed.slug, parsed.sortOrder)
          : null;
        if (word && cq.message) {
          const options = await quizOptions(sb, word);
          await editMessageText(
            chatId,
            cq.message.message_id,
            `🧠 إيه معنى <b>${word.word}</b>؟`,
            quizKeyboard(code, options),
          );
        }
      } else if (data.startsWith("q:")) {
        const [, ans, pick] = data.split(":");
        await gradeAnswer(sb, user, chatId, cq.message?.message_id, ans, pick);
      }
      return new Response("ok");
    }
  } catch (err) {
    console.error("webhook error", err);
  }
  return new Response("ok");
});
