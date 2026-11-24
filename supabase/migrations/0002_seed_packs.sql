-- Kalima seed: 3 packs x 30 words. Idempotent: conflicts do nothing.

insert into public.packs (slug, title_ar, title_en, is_free, sort_order) values
  ('job-interview', 'إنجليزية مقابلات الشغل', 'Job Interview English', true, 1),
  ('tech', 'إنجليزية التقنية والبرمجة', 'Tech & Programming English', false, 2),
  ('ielts', 'أساسيات الآيلتس', 'IELTS Essentials', false, 3)
on conflict (slug) do nothing;

-- ---------- Pack 1: Job Interview ----------
insert into public.words (pack_id, word, meaning_ar, example_en, example_ar, sort_order)
select p.id, v.word, v.meaning_ar, v.example_en, v.example_ar, v.sort_order::int
from public.packs p
join (values
('candidate','مرشح للوظيفة','She is the best candidate for this job.','هي أفضل مرشحة لهذه الوظيفة.',1),
('experience','خبرة','I have three years of experience in sales.','عندي خبرة ثلاث سنوات في المبيعات.',2),
('qualifications','مؤهلات','His qualifications match the job requirements.','مؤهلاته تناسب متطلبات الوظيفة.',3),
('strengths','نقاط القوة','One of my strengths is working under pressure.','من نقاط قوتي العمل تحت الضغط.',4),
('weakness','نقطة ضعف','My biggest weakness is public speaking, and I am improving it.','أكبر نقطة ضعف عندي هي التحدث أمام الجمهور، وأنا أطوّرها.',5),
('salary','راتب','They offered him a good salary.','عرضوا عليه راتباً جيداً.',6),
('teamwork','العمل الجماعي','Teamwork helps us finish projects faster.','العمل الجماعي يساعدنا على إنهاء المشاريع أسرع.',7),
('deadline','موعد نهائي','We finished the report before the deadline.','أنهينا التقرير قبل الموعد النهائي.',8),
('responsible','مسؤول عن','I was responsible for a team of five people.','كنت مسؤولاً عن فريق من خمسة أشخاص.',9),
('challenge','تحدٍ','This job is a new challenge for me.','هذه الوظيفة تحدٍ جديد بالنسبة لي.',10),
('achievement','إنجاز','Winning that client was a great achievement.','كسب ذلك العميل كان إنجازاً عظيماً.',11),
('opportunity','فرصة','Thank you for this opportunity.','شكراً لكم على هذه الفرصة.',12),
('apply','يتقدم لوظيفة','I want to apply for this position.','أريد أن أتقدم لهذه الوظيفة.',13),
('hire','يوظّف','The company plans to hire ten engineers.','تخطط الشركة لتوظيف عشرة مهندسين.',14),
('position','منصب / وظيفة','He applied for a manager position.','تقدم لمنصب مدير.',15),
('manager','مدير','My manager gave me useful feedback.','أعطاني مديري ملاحظات مفيدة.',16),
('company','شركة','She works for a large company.','هي تعمل في شركة كبيرة.',17),
('skills','مهارات','This job needs strong computer skills.','هذه الوظيفة تحتاج مهارات كمبيوتر قوية.',18),
('communicate','يتواصل','We communicate with clients every day.','نتواصل مع العملاء كل يوم.',19),
('solve','يحل','I like to solve problems quickly.','أحب حل المشاكل بسرعة.',20),
('improve','يحسّن / يطوّر','I want to improve my English this year.','أريد أن أطوّر لغتي الإنجليزية هذا العام.',21),
('goal','هدف','My goal is to become a team leader.','هدفي أن أصبح قائد فريق.',22),
('professional','محترف','He is professional and always on time.','هو محترف ودائماً في موعده.',23),
('punctual','ملتزم بالمواعيد','Being punctual is important in our team.','الالتزام بالمواعيد مهم في فريقنا.',24),
('flexible','مرن','I am flexible with working hours.','أنا مرن في ساعات العمل.',25),
('motivated','متحفز / لديه دافع','Our team is young and motivated.','فريقنا شاب ومتحفز.',26),
('confident','واثق','I feel confident about this interview.','أشعر بالثقة تجاه هذه المقابلة.',27),
('previous','سابق','In my previous job, I trained new staff.','في وظيفتي السابقة درّبت الموظفين الجدد.',28),
('expect','يتوقع','What do you expect from this job?','ما الذي تتوقعه من هذه الوظيفة؟',29),
('offer','عرض (وظيفة)','They sent me a job offer yesterday.','أرسلوا لي عرض وظيفة أمس.',30)
) as v(word, meaning_ar, example_en, example_ar, sort_order) on true
where p.slug = 'job-interview'
on conflict (pack_id, word) do nothing;

-- ---------- Pack 2: Tech & Programming ----------
insert into public.words (pack_id, word, meaning_ar, example_en, example_ar, sort_order)
select p.id, v.word, v.meaning_ar, v.example_en, v.example_ar, v.sort_order::int
from public.packs p
join (values
('variable','متغير','A variable stores a value in your code.','المتغير يخزن قيمة في الكود.',1),
('function','دالة','This function returns the total price.','هذه الدالة ترجع السعر الإجمالي.',2),
('loop','حلقة تكرار','Use a loop to repeat the action ten times.','استخدم حلقة تكرار لتكرار الفعل عشر مرات.',3),
('array','مصفوفة','The names are stored in an array.','الأسماء مخزنة في مصفوفة.',4),
('string','سلسلة نصية','A string can contain letters and numbers.','السلسلة النصية يمكن أن تحتوي على حروف وأرقام.',5),
('boolean','قيمة منطقية (صح/خطأ)','The result is a boolean: true or false.','النتيجة قيمة منطقية: صح أو خطأ.',6),
('database','قاعدة بيانات','User data is saved in the database.','بيانات المستخدمين محفوظة في قاعدة البيانات.',7),
('server','خادم','The server is down for maintenance.','الخادم متوقف للصيانة.',8),
('bug','خطأ برمجي','There is a bug in the login page.','يوجد خطأ برمجي في صفحة تسجيل الدخول.',9),
('debug','يصحح الأخطاء','It took an hour to debug the code.','استغرق تصحيح الكود ساعة.',10),
('deploy','ينشر (التطبيق)','We deploy the app every Friday.','ننشر التطبيق كل يوم جمعة.',11),
('repository','مستودع كود','Push your code to the repository.','ارفع الكود إلى المستودع.',12),
('branch','فرع (في Git)','Create a new branch for this feature.','أنشئ فرعاً جديداً لهذه الميزة.',13),
('commit','تثبيت التغييرات','Write a clear message for each commit.','اكتب رسالة واضحة لكل تثبيت.',14),
('merge','يدمج','Merge the branch into main.','ادمج الفرع في الفرع الرئيسي.',15),
('query','استعلام','This query returns all active users.','هذا الاستعلام يرجع كل المستخدمين النشطين.',16),
('endpoint','نقطة اتصال (API)','The API has an endpoint for payments.','واجهة البرمجة فيها نقطة اتصال للمدفوعات.',17),
('authentication','مصادقة / تسجيل دخول','Authentication protects user accounts.','المصادقة تحمي حسابات المستخدمين.',18),
('encryption','تشفير','Encryption keeps messages private.','التشفير يحافظ على خصوصية الرسائل.',19),
('framework','إطار عمل','React is a popular framework for web apps.','ريأكت إطار عمل مشهور لتطبيقات الويب.',20),
('library','مكتبة برمجية','Import the library at the top of the file.','استورد المكتبة في أعلى الملف.',21),
('runtime','بيئة التشغيل','The error happened at runtime.','حدث الخطأ أثناء التشغيل.',22),
('compiler','مترجم برمجي','The compiler found two errors.','وجد المترجم البرمجي خطأين.',23),
('syntax','صياغة الكود','Check the syntax before you run it.','راجع صياغة الكود قبل تشغيله.',24),
('parameter','مَعامل / وسيط','This function takes one parameter.','هذه الدالة تأخذ معاملاً واحداً.',25),
('return','يُرجع قيمة','The function returns a number.','الدالة ترجع رقماً.',26),
('error','خطأ','Read the error message carefully.','اقرأ رسالة الخطأ بعناية.',27),
('request','طلب','The browser sends a request to the server.','المتصفح يرسل طلباً إلى الخادم.',28),
('response','استجابة / رد','The server response was very fast.','كانت استجابة الخادم سريعة جداً.',29),
('cache','ذاكرة مؤقتة','Clear the cache and try again.','امسح الذاكرة المؤقتة وحاول مرة أخرى.',30)
) as v(word, meaning_ar, example_en, example_ar, sort_order) on true
where p.slug = 'tech'
on conflict (pack_id, word) do nothing;

-- ---------- Pack 3: IELTS Essentials ----------
insert into public.words (pack_id, word, meaning_ar, example_en, example_ar, sort_order)
select p.id, v.word, v.meaning_ar, v.example_en, v.example_ar, v.sort_order::int
from public.packs p
join (values
('significant','مهم / كبير','There was a significant rise in prices.','كان هناك ارتفاع كبير في الأسعار.',1),
('increase','يزداد / زيادة','Sales increased last year.','زادت المبيعات في العام الماضي.',2),
('decrease','ينقص / نقصان','Pollution decreased in the city centre.','انخفض التلوث في وسط المدينة.',3),
('approximately','تقريباً','The journey takes approximately two hours.','تستغرق الرحلة ساعتين تقريباً.',4),
('benefit','فائدة','Exercise has many benefits for health.','للرياضة فوائد كثيرة للصحة.',5),
('consequence','نتيجة / عاقبة','Every action has a consequence.','لكل فعل نتيجة.',6),
('environment','البيئة','We must protect the environment.','يجب أن نحمي البيئة.',7),
('government','الحكومة','The government built new schools.','بنت الحكومة مدارس جديدة.',8),
('society','المجتمع','Technology changed society quickly.','غيّرت التكنولوجيا المجتمع بسرعة.',9),
('individual','فرد','Each individual has different needs.','لكل فرد احتياجات مختلفة.',10),
('research','بحث علمي','Recent research shows clear results.','تُظهر الأبحاث الحديثة نتائج واضحة.',11),
('evidence','دليل','There is strong evidence for this idea.','يوجد دليل قوي على هذه الفكرة.',12),
('method','طريقة / أسلوب','This method is simple and effective.','هذه الطريقة بسيطة وفعّالة.',13),
('process','عملية','Learning a language is a long process.','تعلّم لغة عملية طويلة.',14),
('available','متاح','Free courses are available online.','توجد دورات مجانية متاحة على الإنترنت.',15),
('require','يتطلب','This job requires experience.','هذه الوظيفة تتطلب خبرة.',16),
('contribute','يساهم','Everyone can contribute to the project.','يمكن للجميع المساهمة في المشروع.',17),
('generation','جيل','The younger generation uses phones a lot.','الجيل الأصغر يستخدم الهواتف كثيراً.',18),
('tradition','تقليد / عادة متوارثة','It is a family tradition to eat together.','من تقاليد العائلة أن نأكل معاً.',19),
('culture','ثقافة','Travelling teaches you about other cultures.','السفر يعلّمك عن ثقافات أخرى.',20),
('economic','اقتصادي','The country faces economic problems.','تواجه الدولة مشاكل اقتصادية.',21),
('global','عالمي','Climate change is a global issue.','تغيّر المناخ قضية عالمية.',22),
('local','محلي','Buy food from local shops.','اشترِ الطعام من المحلات المحلية.',23),
('major','رئيسي / كبير','Traffic is a major problem in Cairo.','الزحام مشكلة رئيسية في القاهرة.',24),
('minor','بسيط / ثانوي','It is only a minor problem.','إنها مشكلة بسيطة فقط.',25),
('complex','معقّد','The system is complex but useful.','النظام معقّد لكنه مفيد.',26),
('obvious','واضح','The answer is obvious.','الإجابة واضحة.',27),
('particular','معيّن / خاص','Choose one particular example.','اختر مثالاً معيناً واحداً.',28),
('whereas','بينما / في حين أن','He likes tea, whereas I prefer coffee.','هو يحب الشاي، بينما أنا أفضل القهوة.',29),
('furthermore','علاوة على ذلك','The job is well paid; furthermore, it is near my home.','الوظيفة براتب جيد؛ وعلاوة على ذلك هي قريبة من بيتي.',30)
) as v(word, meaning_ar, example_en, example_ar, sort_order) on true
where p.slug = 'ielts'
on conflict (pack_id, word) do nothing;
