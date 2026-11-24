# بوت كلمة — Kalima 📖

بوت تليجرام بيعلّم مفردات إنجليزية للناطقين بالعربي بأسلوب **التكرار المتباعد (Spaced Repetition / SM-2)**: الكلمة بتجيلك، تخمّن معناها، تختبر نفسك، وكل ما تجاوب صح الكلمة بتتأخر أكتر — ولو غلطت بترجعلك تاني يوم. كده الكلمات بتثبت بجد.

## إيه اللي جوّه؟

- **3 حزم جاهزة، 90 كلمة حقيقية** بمثال وترجمته:
  - 📦 إنجليزية مقابلات الشغل — **مجانية** (30 كلمة)
  - 🔒 إنجليزية التقنية والبرمجة — Pro (30 كلمة)
  - 🔒 أساسيات الآيلتس IELTS — Pro (30 كلمة)
- جلسة يومية: المراجعات المستحقة الأول، وبعدين كلمات جديدة (10/يوم مجاناً، بلا حد مع Pro)
- اختبار اختيار من متعدد (4 معاني) بزرار، وتصحيح فوري
- تتبّع تقدّم: كلمات متعلمة، مراجعات مستحقة، وسلسلة أيام متتالية (Streak 🔥)
- تذكير يومي تلقائي للي عنده مراجعات ولسه مذاكرش النهارده

## المعمارية

```
Telegram user ──► telegram-webhook (Edge Function) ──► Postgres (Supabase)
                        │  bot brain: menus, cards, quiz, SM-2 grading
                        ├── _shared/telegram.ts   Bot API helpers
                        ├── _shared/sm2.ts        SM-2 (pure + tests)
                        ├── _shared/session.ts    next word / packs / streak
                        └── _shared/supabase.ts   service-role client
pg_cron ──► daily-reminder (Edge Function, CRON_SECRET header)
payments  ──► stub — see "الدفع" below
```

قرارات تصميم مهمة:
- **Stateless:** مفيش جلسات محفوظة على السيرفر. كل خطوة بتتحسب من قاعدة البيانات (الكلمة المستحقة الأقدم، أو الكلمة الجديدة التالية)، وسياق الزرار بيتنقل في `callback_data`.
- **`callback_data` قصير:** حد تليجرام 64 بايت، فالكلمة بتتعرّف بكود قصير زي `j12` (حرف الحزمة + رقمها) مش UUID.
- **SM-2 مبسّط:** إجابة صح = درجة 4 (interval: يوم ← 6 أيام ← × ease factor)، إجابة غلط = درجة 1 (ترجع بعد يوم، والـ repetitions بتتصفّر). المنطق في `_shared/sm2.ts` وليه اختبارات (`sm2.test.ts`).
- **الأمان:** RLS مفعّل على كل الجداول **من غير أي policies** — البوت بس (service role) يقدر يوصل للبيانات.

## التكلفة: صفر

Supabase Free + Telegram Bot API (مجاني) + GitHub Free. مفيش سيرفر مدفوع، ومفيش AI API مدفوع — المحتوى مكتوب وجاهز في قاعدة البيانات.

## خطوات التشغيل

### 1) مشروع Supabase جديد
اعمل مشروع جديد على supabase.com (مشروع منفصل عن تطبيقك القديم)، وخد الـ Project Ref.

### 2) البوت من BotFather
على تليجرام: افتح @BotFather ← `/newbot` ← اختار اسم ويوزرنيم بينتهي بـ `bot` ← خد الـ Token. **التوكن سرّي — متحطوش في Git ولا في الشات.**

### 3) الأسرار
```bash
supabase link --project-ref <PROJECT_REF>
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_BOT_USERNAME=... \
  TELEGRAM_WEBHOOK_SECRET=<long-random> CRON_SECRET=<long-random> \
  POLAR_CHECKOUT_URL= PAYMENTS_ENABLED=false
```
(`SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` بيتحطوا تلقائياً من Supabase.)

### 4) قاعدة البيانات والنشر
```bash
supabase db push
supabase functions deploy telegram-webhook daily-reminder payments
```
ادمج مداخل `[functions.*]` من `supabase/config.toml` المرفق في الكونفيج بتاعك لو موجود أصلاً (المهم `verify_jwt = false` للتليجرام ويبهوك والتذكير).

### 5) تفعيل الـ Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```
الرد لازم يكون `{"ok":true,...}`.

### 6) التذكير اليومي (اختياري)
فعّل إضافات `pg_cron` و `pg_net` من Dashboard، وشغّل اللي في `supabase/cron.sql` بعد ما تحط الـ Project Ref والـ `CRON_SECRET`.

## المجاني و Pro

| | مجاني | Pro (~$3/شهر) |
|---|---|---|
| حزمة المقابلات | ✅ | ✅ |
| حزم التقنية والآيلتس | 🔒 | ✅ |
| كلمات جديدة يومياً | 10 | بلا حد |
| المراجعات والـ streak | ✅ | ✅ |

الحالة بتتخزن في `telegram_users.is_pro` و `pro_until` — تفعيل يدوي من Table Editor ينفع للبداية.

## الدفع (لسه مش مفعّل — بصراحة)

الـ MVP ده **مش بيستلم دفع حقيقي**، ودالة `payments` ستَب (stub) بترجع 501. الخطتين الجايات:

- **(أ) Polar (الأساسية):** Polar هو Merchant of Record وبيبعت الفلوس لمصر. اعمل منتج اشتراك وحط لينك الـ checkout في سرّ `POLAR_CHECKOUT_URL` — زرار ⭐ Pro في البوت هيعرضه فوراً. التفعيل التلقائي (webhook يقلب `is_pro`) خطوة جاية ومتوصفة في تعليقات `payments/index.ts`؛ لحد ما تتعمل، التفعيل يدوي بعد ما الدفع يوصلك إشعاره.
- **(ب) Telegram Stars:** دفع جوه تليجرام بعملة `XTR` (الكود التخطيطي موجود في تعليقات `payments/index.ts`). خلي بالك: صرف الـ Stars بيعدي على Fragment و TON، فهو الخطة الاحتياطية مش الأساسية.

## اختبار من الأول للآخر ✅

1. ابعت `/start` للبوت ← رسالة ترحيب وقايمة أزرار.
2. دوس **📚 الحزم** ← 3 حزم، التقنية والآيلتس عليهم 🔒.
3. افتح حزمة المقابلات ← كرت كلمة، دوس **إظهار المعنى** ← المعنى والمثال، دوس **اختبرني** ← 4 اختيارات.
4. جاوب صح ← «هراجعها بعد يوم»؛ وجاوب غلط على كلمة تانية ← «هرجع أوريهالك بكرة».
5. **📊 تقدّمي** ← كلمات متعلمة و streak = 1.
6. دوس الحزمة المقفولة ← رسالة Pro، ولو حاطط `POLAR_CHECKOUT_URL` هيظهر زرار الاشتراك.
7. كمّل 10 كلمات جديدة ← رسالة «خلّصت كلمات النهارده».
8. (اختياري) شغّل `daily-reminder` بـ curl وهيدر `x-cron-secret` ← تذكير يوصل للي عنده مستحقات.

## خريطة الطريق

- تفعيل Polar webhook (تفعيل Pro تلقائياً)
- Telegram Stars كقناة دفع تانية
- حزم جديدة (سفر، بيزنس، طب) ونطق صوتي للكلمات
- لوحة متصدرين أسبوعية ومسابقات خفيفة جوه البوت
