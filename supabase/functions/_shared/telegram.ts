// Thin Telegram Bot API helpers. Token comes from TELEGRAM_BOT_TOKEN env.

export type InlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};
export type InlineKeyboard = { inline_keyboard: InlineButton[][] };

function apiUrl(method: string): string {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function call(
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { ok?: boolean }).ok === false) {
    console.error(`telegram ${method} failed`, data);
  }
  return data;
}

export function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<unknown> {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<unknown> {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<unknown> {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

/**
 * Word codes: Telegram callback_data is limited to 64 BYTES, so UUIDs don't fit
 * (two UUIDs alone = 75 bytes). Every word is addressed by a short code instead:
 * pack letter (j = job-interview, t = tech, i = ielts) + sort_order, e.g. "j12".
 */
export const PACK_CODES: Record<string, string> = {
  "job-interview": "j",
  "tech": "t",
  "ielts": "i",
};
export const CODE_PACKS: Record<string, string> = {
  j: "job-interview",
  t: "tech",
  i: "ielts",
};

export function wordCode(packSlug: string, sortOrder: number): string {
  return `${PACK_CODES[packSlug] ?? "x"}${sortOrder}`;
}

export function parseWordCode(
  code: string,
): { slug: string; sortOrder: number } | null {
  const m = /^([a-z])(\d{1,3})$/.exec(code);
  if (!m || !CODE_PACKS[m[1]]) return null;
  return { slug: CODE_PACKS[m[1]], sortOrder: parseInt(m[2], 10) };
}

/** Send a word as a card with a button to reveal the meaning. */
export function sendWordCard(
  chatId: number,
  cardText: string,
  code: string,
): Promise<unknown> {
  return sendMessage(chatId, cardText, {
    inline_keyboard: [[{
      text: "👀 إظهار المعنى",
      callback_data: `rv:${code}`,
    }]],
  });
}

/** Multiple-choice quiz keyboard: callback = q:<answerCode>:<chosenCode>. */
export function quizKeyboard(
  answerCode: string,
  options: { label: string; code: string }[],
): InlineKeyboard {
  return {
    inline_keyboard: options.map((o) => [{
      text: o.label,
      callback_data: `q:${answerCode}:${o.code}`,
    }]),
  };
}

export function menuKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: "📚 الحزم", callback_data: "m:packs" }, {
        text: "▶️ جلسة اليوم",
        callback_data: "m:today",
      }],
      [{ text: "🔁 مراجعة", callback_data: "m:review" }, {
        text: "📊 تقدّمي",
        callback_data: "m:progress",
      }],
      [{ text: "⭐ Pro", callback_data: "m:pro" }],
    ],
  };
}
