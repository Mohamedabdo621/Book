// Payments — STUB for the MVP. No live payment is processed here.
//
// Planned routes (see README "الدفع"):
//
// (a) Polar (merchant of record) — the bot's ⭐ Pro button simply shows the
//     POLAR_CHECKOUT_URL link (handled in telegram-webhook/showPro). When a
//     checkout completes, Polar sends a webhook; a future version of THIS
//     function will receive it, verify the Polar signature, and set
//     telegram_users.is_pro = true, pro_until = now() + 1 month for the user
//     whose telegram_id was passed as checkout metadata. Until then,
//     activation after a Polar payment is MANUAL (owner flips is_pro in the
//     Supabase table editor). Do not pretend otherwise to users.
//
// (b) Telegram Stars — in-bot payment with currency "XTR":
//       await fetch(`https://api.telegram.org/bot${token}/sendInvoice`, {
//         method: "POST", headers: { "content-type": "application/json" },
//         body: JSON.stringify({
//           chat_id, title: "Kalima Pro — شهر",
//           description: "كل الحزم + كلمات بلا حد لمدة شهر",
//           payload: `pro:${telegramId}`,
//           currency: "XTR",               // Telegram Stars — no provider_token needed
//           prices: [{ label: "Pro — شهر", amount: 150 }], // ~150 Stars ≈ $3
//         }),
//       });
//     …plus handling pre_checkout_query (must answer within 10s) and
//     successful_payment updates in telegram-webhook. Stars cash-out goes
//     through Fragment → TON, which is why Polar is the primary route.
//     This path stays disabled behind PAYMENTS_ENABLED until fully wired.

Deno.serve((req: Request) => {
  void req;
  if (Deno.env.get("PAYMENTS_ENABLED") !== "true") {
    return Response.json({
      ok: false,
      error: "PAYMENTS_NOT_ENABLED",
      message:
        "Payments are not wired to a live provider yet. Pro is sold via the POLAR_CHECKOUT_URL link shown by the bot, with manual activation.",
      polarCheckoutUrl: Deno.env.get("POLAR_CHECKOUT_URL") ?? null,
    }, { status: 501 });
  }
  // PAYMENTS_ENABLED=true is reserved for the future Polar webhook handler
  // described above; it is intentionally not implemented in this MVP.
  return Response.json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Webhook handler not implemented yet — see comments in this file.",
  }, { status: 501 });
});
