/* مسار — العبادات، وقت الشاشة، التحديات، الماء، الأفكار، والمظهر */
(() => {
  'use strict';
  const M = window.Masar;
  const { $, todayISO, addDays, daysBetween, validISO, fmtDate } = M;
  const esc = M.escapeHtml;
  const KEY = M.KEYS.ext;
  const PRAYERS = [['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
  const STATUS = ['mosque', 'home', 'missed'];
  const SCREEN_APPS = [['tiktok', 'TikTok', 3], ['youtube', 'YouTube', 2], ['ai', 'أدوات الذكاء الاصطناعي', 1], ['other', 'تطبيقات أخرى', 1]];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, a, b, def = 0) => { const x = Number(v); return Number.isFinite(x) ? clamp(x, a, b) : def; };

  /* ---------------- برنامج التطور الشخصي: 10 مراحل × 30 يومًا ---------------- */
  const PHASES = [
    { name: 'الثقة بالنفس', t: [
      { c: 'الثقة', title: 'اكتب إنجازاتك الصغيرة', m: 'ثلاثة إنجازات مكتوبة', s: ['اكتب ثلاثة أشياء أنجزتها فعلًا خلال الأسبوع الماضي.', 'اقرأها بصوت مسموع مرة واحدة.', 'اختر منها ما تريد تكراره غدًا.'] },
      { c: 'الثقة', title: 'قل تفضيلك في أمر بسيط', m: 'تفضيل واحد معلن', s: ['في موقف يومي بسيط (اختيار مطعم أو فيلم) اذكر تفضيلك أولًا.', 'استخدم صيغة: «أنا أفضل… لأن…».', 'لاحظ شعورك بعدها دون أن تحكم على نفسك.'] },
      { c: 'الثقة', title: 'وقفة الثقة الهادئة', m: 'دقيقتان + موقف واحد', s: ['اجلس أو قف بوضعية مستقيمة مريحة لمدة دقيقتين.', 'تنفس ببطء وقل لنفسك جملة واقعية مثل: «أستطيع أن أحاول».', 'طبّق الوضعية نفسها في موقف حقيقي اليوم.'] },
      { c: 'الثقة', title: 'اقبل المجاملة بهدوء', m: 'مجاملة واحدة مقبولة أو مقدَّمة', s: ['إن مدحك أحد فقل «شكرًا» فقط دون التقليل من نفسك.', 'إن لم يحدث ذلك، امدح شخصًا مدحًا صادقًا ومحددًا.', 'دوّن كيف كان شعورك.'] },
      { c: 'الثقة', title: 'اعترف بخطأ صغير', m: 'اعتراف واحد', s: ['اختر خطأً صغيرًا حدث معك اليوم.', 'اذكره بجملة واحدة مع ما ستفعله لتصحيحه.', 'لا تبالغ في الاعتذار ولا تبرر طويلًا.'] },
      { c: 'الثقة', title: 'اطلب ما تحتاجه', m: 'طلب واحد واضح', s: ['حدد شيئًا بسيطًا تحتاجه (معلومة، مساعدة، وقت).', 'اطلبه بجملة واضحة واحدة.', 'تقبّل الجواب سواء كان نعم أو لا.'] }
    ] },
    { name: 'التواصل والاستماع', t: [
      { c: 'الاستماع', title: 'استمع دقيقتين كاملتين', m: 'تلخيص واحد', s: ['اختر محادثة واستمع فيها دقيقتين دون مقاطعة.', 'لا تجهّز ردك أثناء حديثه.', 'لخّص كلامه بجملة قبل أن ترد.'] },
      { c: 'التواصل', title: 'اسأل سؤالًا مفتوحًا', m: 'سؤالان', s: ['ابدأ سؤالك بـ «كيف» أو «ماذا» أو «لماذا».', 'اسأل سؤال متابعة مبنيًا على جوابه.', 'لاحظ من تكلم أكثر: أنت أم هو.'] },
      { c: 'الاستماع', title: 'تذكّر تفصيلة', m: 'تفصيلة واحدة', s: ['تذكّر تفصيلة قالها لك شخص سابقًا (اهتمام، مناسبة).', 'اسأله عنها اليوم.', 'لاحظ رد فعله.'] },
      { c: 'التواصل', title: 'حوار بلا هاتف', m: 'محادثة واحدة بلا هاتف', s: ['أبعد هاتفك عن يدك خلال محادثة اليوم.', 'انظر إلى من تحدثه بشكل طبيعي.', 'أنهِ الحوار بجملة ختام لطيفة.'] },
      { c: 'الاستماع', title: 'عاكس المشاعر', m: 'انعكاس واحد', s: ['لاحظ شعورًا يبدو على من تحدثه.', 'قل: «يبدو أنك…» ثم اسأله هل فهمتك جيدًا.', 'لا تعطِ نصيحة ما لم يطلبها.'] },
      { c: 'التواصل', title: 'ابدأ محادثة قصيرة', m: 'محادثة واحدة', s: ['ابدأ حديثًا من دقيقة مع شخص تعرفه.', 'استخدم موضوعًا مشتركًا (دراسة، مكان، اهتمام).', 'أنهِه بشكل مهذب.'] }
    ] },
    { name: 'التعبير الصوتي والوضوح', t: [
      { c: 'الصوت', title: 'قراءة بصوت مسموع', m: 'تقييم الوضوح من 1 إلى 5', s: ['اقرأ فقرة بصوت مسموع لمدة دقيقتين.', 'أبطئ قليلًا وتوقف عند نهاية كل فكرة.', 'سجّل صوتك وقيّم وضوحه من 5.'] },
      { c: 'الصوت', title: 'تنفّس قبل الكلام', m: 'ثلاث مرات', s: ['خذ نفسًا بطيئًا قبل أول جملة في محادثة اليوم.', 'تكلم على زفير هادئ.', 'كرر ذلك في ثلاثة مواقف.'] },
      { c: 'الوضوح', title: 'اشرح فكرة في 30 ثانية', m: 'تسجيل واحد مدته 30 ثانية', s: ['اختر مفهومًا تعرفه جيدًا.', 'اشرحه في 30 ثانية: فكرة، مثال، خلاصة.', 'سجّله واستمع إليه.'] },
      { c: 'الصوت', title: 'تمرين النطق', m: 'ثلاث جمل', s: ['اختر ثلاث جمل طويلة وانطقها بوضوح.', 'أعدها بنبرتين مختلفتين.', 'اختر النبرة الأنسب.'] },
      { c: 'الصوت', title: 'تنويع النبرة', m: 'تسجيلان للمقارنة', s: ['اقرأ فقرة بنبرة واحدة ثابتة ثم بتنويع في السرعة والارتفاع.', 'قارن التسجيلين.', 'اكتب ما الذي تغيّر.'] },
      { c: 'الوضوح', title: 'استبدل كلمات الحشو بوقفات', m: 'عدد كلمات الحشو في التسجيل', s: ['تحدث دقيقة عن يومك وسجّلها.', 'ضع وقفة قصيرة بدل «يعني» و«اممم».', 'عدّ كلمات الحشو وقارن في المرة القادمة.'] }
    ] },
    { name: 'الجرأة والمبادرة', t: [
      { c: 'المبادرة', title: 'ابدأ بالتحية', m: 'تحية واحدة مبادِرة', s: ['حيِّ شخصًا لا تحييه عادة (جار، زميل).', 'ابتسم وقل جملة قصيرة.', 'لا تجعل نجاحك مرهونًا بردّه.'] },
      { c: 'الجرأة', title: 'اسأل سؤالًا في مكان عام', m: 'سؤال علني واحد', s: ['اسأل سؤالًا في صف أو مجموعة أو متجر.', 'قله بصوت مسموع وواضح.', 'سجّل شعورك قبل السؤال وبعده.'] },
      { c: 'المبادرة', title: 'اقترح خطة صغيرة', m: 'اقتراح واحد', s: ['اقترح نشاطًا أو خطة صغيرة على أسرتك أو أصدقائك.', 'اذكر السبب باختصار.', 'تقبّل الرد بهدوء.'] },
      { c: 'الجرأة', title: 'افعل المؤجَّل', m: '15 دقيقة تنفيذ', s: ['اختر مهمة صغيرة وآمنة تؤجلها.', 'ابدأ خلال عشر دقائق.', 'اعمل عليها 15 دقيقة على الأقل.'] },
      { c: 'الجرأة', title: 'اطلب معلومة من غريب', m: 'طلب واحد', s: ['اطلب معلومة أو اتجاهًا من شخص في مكان عام آمن.', 'اشكره.', 'دوّن ما حدث وما تعلمته.'] },
      { c: 'المبادرة', title: 'عرّف بنفسك', m: 'تعريف واحد', s: ['قدّم نفسك لشخص جديد في موقف مناسب (فعالية، درس، مجموعة).', 'قل اسمك وجملة عمّا تفعله.', 'اسأله عن نفسه.'] }
    ] },
    { name: 'الكاريزما ولغة الجسد', t: [
      { c: 'لغة الجسد', title: 'تواصل بصري طبيعي', m: 'محادثة واحدة', s: ['انظر إلى عيني محدثك قرابة ثلاث ثوانٍ ثم انظر بعيدًا بهدوء.', 'كرر ذلك خلال المحادثة.', 'تجنب التحديق.'] },
      { c: 'لغة الجسد', title: 'وضعية منفتحة', m: 'موقف واحد', s: ['تجنب تشبيك الذراعين والانحناء قدر الإمكان.', 'اجلس بوضعية مستقيمة ومريحة.', 'لاحظ أثر ذلك على شعورك.'] },
      { c: 'الكاريزما', title: 'ابتسامة صادقة', m: 'ثلاث تحيات', s: ['ابتسم عند التحية حين تشعر بالود فعلًا.', 'اربطها بنظرة وجملة لطيفة.', 'لا تتصنّع.'] },
      { c: 'لغة الجسد', title: 'حركات يد هادئة', m: 'شرح مدته دقيقة', s: ['أثناء الشرح استخدم حركة يد واحدة تؤكد فكرتك.', 'خفّف الحركات العصبية.', 'سجّل نفسك دقيقة إن أمكن وراقب الفرق.'] },
      { c: 'الكاريزما', title: 'الإيقاع الهادئ', m: 'محادثتان', s: ['تكلم بإيقاع أبطأ قليلًا من المعتاد.', 'انتظر ثانيتين قبل أن ترد.', 'لاحظ كيف يُصغي الآخرون.'] },
      { c: 'الكاريزما', title: 'حضور الدخول', m: 'دخولان', s: ['عند دخول مكان توقف لحظة وتنفس.', 'ألقِ التحية بنبرة واضحة.', 'اختر مكانك بثقة.'] }
    ] },
    { name: 'خفة الظل', t: [
      { c: 'خفة الظل', title: 'لاحظ موقفًا طريفًا', m: 'موقف واحد', s: ['لاحظ موقفًا يوميًا طريفًا دون السخرية من شخص بعينه.', 'دوّنه في جملة.', 'احكه لشخص تثق به.'] },
      { c: 'خفة الظل', title: 'تعليق لطيف على الموقف', m: 'تعليق واحد', s: ['علّق تعليقًا خفيفًا على الموقف نفسه لا على الأشخاص.', 'اجعله قصيرًا.', 'إن لم يضحك أحد فلا بأس.'] },
      { c: 'خفة الظل', title: 'ابتسم من موقفك بلطف', m: 'موقف واحد', s: ['اذكر موقفًا بسيطًا أحرجك بطريقة خفيفة.', 'لا تحقّر نفسك.', 'راقب أثره على الجو.'] },
      { c: 'خفة الظل', title: 'رسالة طريفة لطيفة', m: 'رسالة واحدة', s: ['أرسل لشخص رسالة طريفة ولطيفة.', 'تأكد أنها لا تجرح أحدًا.', 'اقرأها مرتين قبل الإرسال.'] },
      { c: 'خفة الظل', title: 'اختر التوقيت', m: 'موقفان', s: ['انتظر لحظة مناسبة قبل التعليق.', 'جرّب ذلك في موقفين.', 'راقب ردود الفعل.'] },
      { c: 'خفة الظل', title: 'ثلاث ملاحظات في اليوم', m: 'ثلاث ملاحظات', s: ['دوّن ثلاث ملاحظات طريفة من يومك.', 'اختر أفضلها.', 'شاركها إن ناسب.'] }
    ] },
    { name: 'سرد القصص والتحدث أمام الآخرين', t: [
      { c: 'الحكي', title: 'قصة من يومك', m: 'قصة مدتها دقيقة', s: ['اختر موقفًا حدث معك اليوم.', 'احكه بترتيب: بداية، نقطة تغيّر، نهاية.', 'اجعله في دقيقة.'] },
      { c: 'الحكي', title: 'ابدأ بجملة جاذبة', m: 'ثلاث جمل افتتاحية', s: ['اكتب ثلاث جمل افتتاحية لقصتك.', 'اختر الأقوى.', 'احكها لشخص.'] },
      { c: 'الحكي', title: 'الرسالة في قصتك', m: 'قصة بخاتمة واضحة', s: ['حدّد الفكرة التي تريد إيصالها.', 'احذف التفاصيل التي لا تخدمها.', 'اختم بجملة واضحة.'] },
      { c: 'التحدث', title: 'تحدث أمام مجموعة صغيرة', m: 'مرة واحدة', s: ['قل رأيك أو معلومة أمام شخصين أو ثلاثة.', 'خذ ثلاثين ثانية.', 'اطلب رأيهم.'] },
      { c: 'الحكي', title: 'أعد حكي قصة سمعتها', m: 'قصة واحدة', s: ['اختر قصة قصيرة سمعتها.', 'احكها بكلماتك.', 'اذكر مصدرها.'] },
      { c: 'التحدث', title: 'عرض صغير', m: 'عرض مدته دقيقتان', s: ['حضّر دقيقتين عن موضوع تحبه.', 'قدّمهما لأسرتك أو أصدقائك.', 'اطلب ملاحظة واحدة.'] }
    ] },
    { name: 'الإقناع والتفاوض باحترام', t: [
      { c: 'الإقناع', title: 'اعرض فكرة في ثلاث جمل', m: 'عرض واحد', s: ['اختر فكرة مفيدة.', 'اشرحها: المشكلة، الحل، الفائدة.', 'اسأل عن اعتراضهم واستمع.'] },
      { c: 'الإقناع', title: 'افهم قبل أن تقنع', m: 'حوار واحد', s: ['اسأل عن سبب رأي الطرف الآخر.', 'لخّصه بأمانة.', 'ثم اعرض رأيك.'] },
      { c: 'التفاوض', title: 'ابحث عن حل وسط', m: 'اقتراح حل وسط', s: ['في خلاف بسيط اقترح حلًا يناسب الطرفين.', 'اذكر ما يهمك وما يهمّه.', 'اتفقا على خطوة.'] },
      { c: 'الإقناع', title: 'قدّم سببين', m: 'طلب بسببين', s: ['عند طلب أمر ما اذكر سببين واضحين.', 'اذكر حدود معرفتك بصدق.', 'لا تضغط على أحد.'] },
      { c: 'التفاوض', title: 'تفاوض على أمر صغير', m: 'مفاوضة واحدة', s: ['اطلب تعديلًا صغيرًا ومعقولًا (موعد، مهمة) في موقف مناسب.', 'ابدأ بالاحترام ثم الطلب.', 'تقبّل الرفض بهدوء.'] },
      { c: 'الإقناع', title: 'غيّر رأيك بالدليل', m: 'معلومة مخالفة واحدة', s: ['اختر رأيًا لديك وابحث عن معلومة تخالفه.', 'اقرأها بإنصاف.', 'دوّن هل تغيّر رأيك ولماذا.'] }
    ] },
    { name: 'الاستقلالية واتخاذ القرار', t: [
      { c: 'القرار', title: 'قرار صغير بنفسك', m: 'قرار واحد', s: ['اتخذ قرارًا يوميًا بسيطًا دون استشارة أحد.', 'اكتب سببك.', 'نفّذه.'] },
      { c: 'القرار', title: 'المفاضلة بمعايير', m: 'جدول معايير', s: ['اختر قرارًا متوسط الأهمية.', 'اكتب ثلاثة معايير وأعطِ كلًّا وزنًا.', 'اختر بناءً عليها.'] },
      { c: 'القرار', title: 'قرار بمهلة محددة', m: 'قرار بمهلة 10 دقائق', s: ['حدّد مهلة عشر دقائق لقرار مؤجل.', 'لا تتجاوز المهلة.', 'نفّذ القرار.'] },
      { c: 'الاستقلال', title: 'حدّد تفضيلك أولًا', m: 'قرار واحد', s: ['حدد تفضيلك قبل سماع آراء الآخرين.', 'اسمعهم بعد ذلك.', 'قرر بوعي.'] },
      { c: 'القرار', title: 'راجع قرارًا سابقًا', m: 'مراجعة واحدة', s: ['اختر قرارًا اتخذته الأسبوع الماضي.', 'ما الذي نجح وما الذي تعلمته؟', 'اكتب قاعدة لنفسك.'] },
      { c: 'الاستقلال', title: 'حاول بنفسك أولًا', m: 'مهمة واحدة', s: ['اختر مهمة كنت ستطلب فيها المساعدة فورًا.', 'جرّب بنفسك 20 دقيقة بجدية.', 'اطلب مساعدة محددة إن لزم.'] }
    ] },
    { name: 'الحدود والمواقف الصعبة', t: [
      { c: 'الحدود', title: 'قل لا بلطف', m: 'رفض واحد', s: ['اختر طلبًا لا يناسبك.', 'ارفض بجملة واضحة: «لا أستطيع هذه المرة».', 'لا تبرر طويلًا.'] },
      { c: 'الحدود', title: 'خذ وقتًا للتفكير', m: 'استخدام الجملة مرة واحدة', s: ['بدل الرد الفوري قل: «سأفكر وأرد عليك».', 'حدد موعد الرد.', 'التزم به.'] },
      { c: 'المواقف الصعبة', title: 'رسالة «أنا»', m: 'رسالة واحدة', s: ['حضّر جملة: «أنا أشعر… عندما… وأحتاج…».', 'استخدمها في موقف مناسب أو اكتبها.', 'ركّز على السلوك لا على الشخص.'] },
      { c: 'المواقف الصعبة', title: 'اختلف بهدوء', m: 'موقف واحد', s: ['في موقف خلاف تنفّس قبل أن ترد.', 'اذكر وجهة نظرك دون رفع صوتك.', 'إن ارتفعت الحدة، اقترح إيقاف الحوار وإكماله لاحقًا.'] },
      { c: 'الحدود', title: 'نبّه بلطف', m: 'تنبيه واحد', s: ['إن حدث أمر لا يناسبك (تأخر، مقاطعة) نبّه عليه باحترام.', 'اطلب تغييرًا محددًا.', 'اشكر عند الاستجابة.'] },
      { c: 'الحدود', title: 'ضع حدًّا واضحًا', m: 'حد واحد مكتوب', s: ['حدّد موقفًا متكررًا يستنزفك.', 'اكتب حدًّا واضحًا ومحترمًا له.', 'إن كان الموقف خطرًا أو ابتزازًا فاطلب مساعدة شخص بالغ موثوق.'] }
    ] }
  ];
  const LEVELS = [
    'المستوى 1 — نفّذ التمرين مع شخص مألوف وفي موقف هادئ.',
    'المستوى 2 — كرّر التمرين في موقف ثانٍ مختلف ودوّن الفرق.',
    'المستوى 3 — جرّبه مع شخص أقل ألفة في موقف مناسب.',
    'المستوى 4 — أضف عنصرًا جديدًا: مدة أطول أو موقفًا أقل راحة (دون تعريض أحد للحرج).'
  ];
  const SAFE = 'تذكير: لا تتجاوز حدودك أو حدود الآخرين، ولا تُحرج أحدًا ولا تضغط عليه.';
  const REVIEW_DAY = { c: 'مراجعة', title: 'يوم المراجعة والراحة', m: 'ملاحظة مكتوبة', s: ['اقرأ ملاحظاتك من هذه المرحلة.', 'اكتب أفضل ما نجح وأصعب ما واجهك.', 'حدّد خطوة واحدة تحملها إلى المرحلة التالية.'] };

  const THOUGHTS = [
    'الثقة تُبنى بالفعل الصغير المتكرر، لا بانتظار الشعور المثالي.',
    'كن واضحًا دون قسوة، وحازمًا دون إهانة.',
    'الكاريزما ليست أن تتكلم أكثر؛ بل أن تجعل الحوار أفضل.',
    'الشجاعة ليست غياب التوتر، بل اختيار خطوة آمنة رغم وجوده.',
    'الإقناع الجيد يشرح الفكرة ويترك للطرف الآخر حرية القرار.',
    'خفة الظل ليست إهانة الآخرين؛ أحيانًا أفضل نكتة ملاحظة ذكية عن الموقف.',
    'استمع كاملًا قبل أن تحاول أن تكون مقنعًا.',
    'الهدوء والوضوح أقوى من التظاهر بأنك لا تخطئ.',
    'ما تفعله اليوم بانتظام أهم مما تخطط له كل يوم دون تنفيذ.',
    'الانضباط أن تفعل الخطوة المطلوبة وأنت لا تشعر بالحماس.',
    'سجّل الواقع كما هو؛ التحسن يبدأ من الأرقام الصادقة.',
    'يوم ضعيف لا يلغي أسبوعًا جيدًا؛ المهم أن تعود غدًا.',
    'قلّل ما يستهلك وقتك قبل أن تزيد ما تضيفه إلى جدولك.',
    'الراحة جزء من الخطة وليست خروجًا عنها.',
    'السؤال الجيد يوفّر عليك ساعات من التخمين.',
    'حدودك الواضحة تحمي علاقاتك ولا تضرّها.',
    'ابدأ بخمس دقائق؛ البداية تصنع الزخم.',
    'قارن نفسك بنسختك من الأسبوع الماضي لا بحياة غيرك.',
    'القرار الصغير المتكرر يصنع شخصيةً أوضح من القرار الكبير النادر.',
    'قبل أن تحكم على يومك، اكتب ثلاثة أشياء أنجزتها فعلًا.'
  ];

  /* ---------------- البيانات ---------------- */
  const blank = () => ({ theme: null, prayers: {}, screen: {}, challenges: {}, water: { enabled: false, interval: 60 }, challengeOffset: {}, lastWaterNotice: 0,
    waterLog: {}, waterGoal: 8, screenGoal: { minutes: 180, weighted: 360 }, reviews: {}, customThoughts: [] });
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  function sanitize(raw) {
    if (!isObj(raw)) return null;
    const out = blank();
    out.theme = raw.theme === 'dark' || raw.theme === 'light' ? raw.theme : null;
    const entries = (o) => (isObj(o) ? Object.entries(o).filter(([k]) => validISO(k)).slice(0, 5000) : []);
    entries(raw.prayers).forEach(([d, v]) => {
      if (!isObj(v)) return; const day = {};
      PRAYERS.forEach(([id]) => { if (STATUS.includes(v[id])) day[id] = v[id]; });
      out.prayers[d] = day;
    });
    entries(raw.screen).forEach(([d, v]) => {
      if (!isObj(v)) return; const r = {};
      SCREEN_APPS.forEach(([id]) => { r[id] = num(v[id], 0, 1440); });
      out.screen[d] = r;
    });
    entries(raw.challenges).forEach(([d, v]) => {
      if (!isObj(v)) return;
      out.challenges[d] = { done: !!v.done, skipped: !!v.skipped && !v.done, reflection: typeof v.reflection === 'string' ? v.reflection.slice(0, 1000) : '', title: typeof v.title === 'string' ? v.title.slice(0, 120) : '', completedAt: typeof v.completedAt === 'string' ? v.completedAt.slice(0, 40) : '' };
    });
    entries(raw.challengeOffset).forEach(([d, v]) => { out.challengeOffset[d] = Math.round(num(v, 0, 11)); });
    entries(raw.waterLog).forEach(([d, v]) => { out.waterLog[d] = Math.round(num(v, 0, 60)); });
    if (isObj(raw.water)) out.water = { enabled: !!raw.water.enabled, interval: [45, 60, 90, 120].includes(Number(raw.water.interval)) ? Number(raw.water.interval) : 60 };
    out.waterGoal = Math.round(num(raw.waterGoal, 1, 40, 8));
    if (isObj(raw.screenGoal)) out.screenGoal = { minutes: Math.round(num(raw.screenGoal.minutes, 10, 1440, 180)), weighted: Math.round(num(raw.screenGoal.weighted, 10, 5760, 360)) };
    if (isObj(raw.reviews)) Object.entries(raw.reviews).slice(0, 400).forEach(([k, v]) => { if (/^[WM]-[\d-]{7,10}$/.test(k) && typeof v === 'string') out.reviews[k] = v.slice(0, 2000); });
    if (Array.isArray(raw.customThoughts)) out.customThoughts = raw.customThoughts.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 200)).slice(0, 50);
    return out;
  }
  function load() { try { return sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')) || blank(); } catch (e) { return blank(); } }
  let data = load();
  let hDate = todayISO();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { M.showToast('تعذر حفظ البيانات في المتصفح؛ صدّر نسخة احتياطية.'); return false; } M.emitChanged(); return true; };
  const toast = (m) => M.showToast(m);
  const datesBack = (end, n) => Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
  const dayLabel = (iso) => fmtDate(iso, { day: 'numeric', month: 'numeric' });
  const mondayOf = (iso) => { const d = new Date(`${iso}T12:00:00`); return addDays(iso, -((d.getDay() + 6) % 7)); };

  /* ---------------- الصلاة ---------------- */
  const prayedOf = (d) => { const day = data.prayers[d] || {}; return PRAYERS.filter(([id]) => day[id] === 'mosque' || day[id] === 'home').length; };
  const prayerScoreOf = (d) => { const day = data.prayers[d] || {}; return PRAYERS.reduce((n, [id]) => n + (day[id] === 'mosque' ? 10 : day[id] === 'home' ? 6 : 0), 0); };
  function prayerCounts(dates) {
    const c = { mosque: 0, home: 0, missed: 0, none: 0, slots: dates.length * 5 };
    dates.forEach((d) => { const day = data.prayers[d] || {}; PRAYERS.forEach(([id]) => { const v = day[id]; if (v === 'mosque') c.mosque++; else if (v === 'home') c.home++; else if (v === 'missed') c.missed++; else c.none++; }); });
    c.prayed = c.mosque + c.home; c.recorded = c.slots - c.none;
    return c;
  }
  function renderPrayers() {
    const day = data.prayers[hDate] || {};
    $('prayerList').innerHTML = PRAYERS.map(([id, name]) => `<div class="prayer-row" data-prayer="${id}"><strong>${name}</strong>` +
      [['mosque', 'المسجد'], ['home', 'البيت'], ['missed', 'لم أصلِّ']].map(([v, t]) => `<label><input type="radio" name="p_${id}" value="${v}" ${day[id] === v ? 'checked' : ''}> ${t}</label>`).join('') +
      `<button type="button" class="table-action" data-clear-prayer="${id}" ${day[id] ? '' : 'disabled'} aria-label="مسح تسجيل ${name}">مسح</button></div>`).join('');
    $('prayerScore').textContent = `${prayerScoreOf(hDate)}/50`;
    $('prayerStatus').textContent = Object.keys(day).length ? `سُجّل ${Object.keys(day).length} من 5 ليوم ${fmtDate(hDate)}. يُحفظ كل اختيار تلقائيًا.` : `لا يوجد تسجيل ليوم ${fmtDate(hDate)} بعد. اختر لكل صلاة؛ يُحفظ تلقائيًا.`;
    const stat = (label, n) => { const c = prayerCounts(datesBack(todayISO(), n)); const rate = c.recorded ? Math.round(c.prayed / c.recorded * 100) : null;
      return `<div class="stat-block"><strong>${label}</strong><div class="stat-big">${rate === null ? '—' : rate + '%'}</div><small>من المسجّل: ${c.prayed} صلاة · منها ${c.mosque} في المسجد · ${c.missed} لم تُصلَّ</small><small>غير مسجّل: ${c.none} من ${c.slots}</small></div>`; };
    $('prayerStats').innerHTML = stat('آخر 7 أيام', 7) + stat('آخر 30 يومًا', 30);
    const days = datesBack(todayISO(), 7);
    $('prayerHistory').innerHTML = `<div class="ph-head"><span></span>${PRAYERS.map(([, n]) => `<span>${n}</span>`).join('')}</div>` + days.slice().reverse().map((d) => {
      const dd = data.prayers[d] || {};
      return `<button type="button" class="ph-row ${d === hDate ? 'sel' : ''}" data-goto-date="${d}" aria-label="عرض ${fmtDate(d)}"><span>${fmtDate(d, { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>` +
        PRAYERS.map(([id, n]) => { const v = dd[id]; return `<i class="dot ${v || 'none'}" title="${n}: ${v === 'mosque' ? 'المسجد' : v === 'home' ? 'البيت' : v === 'missed' ? 'لم تُصلَّ' : 'غير مسجّل'}"></i>`; }).join('') + `</button>`;
    }).join('');
  }

  /* ---------------- وقت الشاشة ---------------- */
  const weightedOf = (r) => r ? SCREEN_APPS.reduce((n, [id, , w]) => n + (r[id] || 0) * w, 0) : 0;
  const totalOf = (r) => r ? SCREEN_APPS.reduce((n, [id]) => n + (r[id] || 0), 0) : 0;
  function renderScreen() {
    const r = data.screen[hDate];
    SCREEN_APPS.forEach(([id]) => { const el = $('screen' + id[0].toUpperCase() + id.slice(1)); if (el && document.activeElement !== el) el.value = r ? (r[id] || '') : ''; });
    $('screenLimitMin').value = data.screenGoal.minutes; $('screenLimitW').value = data.screenGoal.weighted;
    const live = readScreenInputs(); const total = totalOf(live), w = weightedOf(live);
    $('screenTotal').textContent = total; $('screenWeighted').textContent = w;
    const over = total > data.screenGoal.minutes || w > data.screenGoal.weighted;
    $('screenTotal').classList.toggle('over', total > data.screenGoal.minutes); $('screenWeighted').classList.toggle('over', w > data.screenGoal.weighted);
    const prev = data.screen[addDays(hDate, -1)];
    const before = datesBack(addDays(hDate, -1), 7).map((d) => data.screen[d]).filter(Boolean);
    const avg = before.length ? before.reduce((n, x) => n + weightedOf(x), 0) / before.length : null;
    const lines = [];
    if (r) {
      lines.push(over ? `تجاوزت الحد الذي حددته لهذا اليوم (${data.screenGoal.minutes} د أو ${data.screenGoal.weighted} نقطة موزونة).` : 'ضمن الحد الذي حددته لهذا اليوم.');
      if (prev) { const dlt = weightedOf(r) - weightedOf(prev); lines.push(dlt === 0 ? 'مثل اليوم السابق في النقاط الموزونة.' : `${dlt > 0 ? 'أعلى' : 'أقل'} من اليوم السابق بـ ${Math.abs(dlt)} نقطة موزونة.`); }
      if (avg !== null) { const dlt = Math.round(weightedOf(r) - avg); lines.push(dlt === 0 ? 'قريب من متوسط الأيام السبعة السابقة.' : `${dlt > 0 ? 'أعلى' : 'أقل'} من متوسط الأيام السبعة السابقة (${Math.round(avg)}) بـ ${Math.abs(dlt)} نقطة.`); }
    } else lines.push('لم يُحفظ وقت الشاشة لهذا اليوم بعد.');
    $('screenCompare').innerHTML = lines.map((l) => `<p class="${over && r ? 'warn-line' : ''}">${esc(l)}</p>`).join('');
    const days = datesBack(hDate, 14), vals = days.map((d) => weightedOf(data.screen[d])), mx = Math.max(1, data.screenGoal.weighted, ...vals);
    $('screenBars').innerHTML = days.map((d, i) => `<span class="mb ${vals[i] > data.screenGoal.weighted ? 'over' : ''} ${data.screen[d] ? '' : 'empty'}" style="--h:${Math.max(3, vals[i] / mx * 100)}%" title="${fmtDate(d)}: ${data.screen[d] ? vals[i] + ' نقطة موزونة' : 'غير مسجّل'}"><em>${new Date(d + 'T12:00:00').getDate()}</em></span>`).join('');
    $('screenBars').style.setProperty('--lim', String(data.screenGoal.weighted / mx));
  }
  function readScreenInputs() { const o = {}; SCREEN_APPS.forEach(([id]) => { o[id] = num($('screen' + id[0].toUpperCase() + id.slice(1)).value, 0, 1440); }); return o; }

  /* ---------------- التحدي اليومي ---------------- */
  function planDayOf(iso) { const raw = daysBetween(M.state().settings.startDate, iso) + 1; return clamp(raw, 1, 300); }
  function challengeFor(iso) {
    const day = planDayOf(iso), phase = Math.min(9, Math.floor((day - 1) / 30)), inPhase = ((day - 1) % 30) + 1;
    const P = PHASES[phase];
    if (inPhase >= 29) return { day, phase, inPhase, phaseName: P.name, review: true, ...REVIEW_DAY, steps: [...REVIEW_DAY.s, SAFE], level: 'مراجعة' };
    const off = data.challengeOffset[iso] || 0, tpl = P.t[((inPhase - 1) % 6 + off) % 6], lvl = Math.floor((inPhase - 1) / 7);
    return { day, phase, inPhase, phaseName: P.name, review: false, c: tpl.c, title: tpl.title, m: tpl.m, steps: [...tpl.s, LEVELS[lvl], SAFE], level: `المستوى ${lvl + 1}` };
  }
  function challengeStreak() { let d = todayISO(); if (!(data.challenges[d] && data.challenges[d].done)) d = addDays(d, -1); let n = 0; while (data.challenges[d] && data.challenges[d].done && n < 400) { n++; d = addDays(d, -1); } return n; }
  function renderChallenge() {
    const t = todayISO(), c = challengeFor(t), rec = data.challenges[t];
    const before = daysBetween(M.state().settings.startDate, t) < 0;
    $('challengeNumber').textContent = `اليوم ${c.day}/300`;
    $('challengeProgress').textContent = `المرحلة ${c.phase + 1} من 10: ${c.phaseName} · اليوم ${c.inPhase} من 30 · ${c.level}`;
    $('challengeCategory').textContent = c.c;
    $('challengeTitle').textContent = c.title;
    $('challengeText').textContent = before ? 'الخطة لم تبدأ بعد؛ هذا هو أول تحدٍّ. يمكنك البدء مبكرًا أو تعديل تاريخ البداية من «مؤشرات الخطة».' : 'نفّذ الخطوات التالية. الصعوبة ترتفع تدريجيًا خلال المرحلة، لكن لا تتجاوز حدودك أو حدود الآخرين.';
    $('challengeMeasure').textContent = `المقياس: ${c.m}`;
    $('challengeSteps').innerHTML = c.steps.map((s) => `<div class="challenge-step">${esc(s)}</div>`).join('');
    if (document.activeElement !== $('challengeReflection')) $('challengeReflection').value = rec ? rec.reflection : '';
    const done = !!(rec && rec.done), skipped = !!(rec && rec.skipped);
    $('challengeStatus').textContent = done ? 'تم إنجاز تحدي اليوم. يمكنك تعديل ملاحظتك.' : skipped ? 'تركت تحدي اليوم. لا بأس؛ عُد غدًا.' : 'لم يُسجَّل الإنجاز بعد.';
    $('completeChallenge').textContent = done ? 'تم الإنجاز ✓' : 'أنجزت التحدي';
    $('completeChallenge').disabled = done;
    $('skipChallenge').disabled = done || skipped;
    $('refreshChallenge').disabled = done || c.review;
    $('undoChallenge').hidden = !(done || skipped);
    $('habitDayLabel').textContent = `تحدي ${c.day} · ${c.phaseName}`;
    const all = Object.entries(data.challenges), doneN = all.filter(([, v]) => v.done).length, skipN = all.filter(([, v]) => v.skipped).length;
    $('challengeStats').innerHTML = [['مكتملة', doneN], ['متروكة', skipN], ['سلسلة حالية', challengeStreak()], ['نسبة الإنجاز', `${Math.min(100, Math.round(doneN / Math.max(1, Math.min(300, daysBetween(M.state().settings.startDate, t) + 1)) * 100))}%`]]
      .map(([l, v]) => `<div><strong>${v}</strong><small>${l}</small></div>`).join('');
    const hist = all.filter(([, v]) => v.done || v.skipped).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 25);
    $('challengeHistory').innerHTML = hist.length ? hist.map(([d, v]) => `<div class="hist-item"><span class="hist-date">${fmtDate(d, { day: 'numeric', month: 'short' })}</span><div><strong>${esc(v.title || challengeFor(d).title)}</strong>${v.reflection ? `<small>${esc(v.reflection.slice(0, 120))}</small>` : ''}</div><span class="badge-soft ${v.done ? '' : 'badge-muted'}">${v.done ? 'مكتمل' : 'متروك'}</span></div>`).join('') : '<div class="empty-state">لا يوجد سجل تحديات بعد. ابدأ بتحدي اليوم.</div>';
  }

  /* ---------------- المراجعات الأسبوعية والشهرية ---------------- */
  function reviewOptions() {
    const t = todayISO(), mon = mondayOf(t), opts = [];
    for (let i = 0; i < 8; i++) { const s = addDays(mon, -7 * i); opts.push({ key: `W-${s}`, from: s, to: addDays(s, 6) > t ? t : addDays(s, 6), label: i === 0 ? 'الأسبوع الحالي' : i === 1 ? 'الأسبوع الماضي' : `أسبوع يبدأ ${fmtDate(s, { day: 'numeric', month: 'short' })}` }); }
    const now = new Date(`${t}T12:00:00`);
    for (let i = 0; i < 6; i++) { const f = new Date(now.getFullYear(), now.getMonth() - i, 1), l = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const fi = iso(f), li = iso(l);
      opts.push({ key: `M-${fi.slice(0, 7)}-01`, from: fi, to: li > t ? t : li, label: i === 0 ? 'الشهر الحالي' : i === 1 ? 'الشهر الماضي' : fmtDate(fi, { month: 'long', year: 'numeric' }) }); }
    return opts;
  }
  function renderReview() {
    const sel = $('reviewSelect'), opts = reviewOptions(), cur = sel.value;
    if (!sel.options.length) sel.innerHTML = opts.map((o) => `<option value="${o.key}">${esc(o.label)}</option>`).join('');
    if (cur) sel.value = cur;
    const o = opts.find((x) => x.key === sel.value) || opts[0];
    const dates = []; for (let d = o.from; d <= o.to; d = addDays(d, 1)) dates.push(d);
    const ch = dates.map((d) => data.challenges[d]).filter(Boolean), pc = prayerCounts(dates);
    const sc = dates.map((d) => data.screen[d]).filter(Boolean), wc = dates.map((d) => data.waterLog[d]).filter((v) => v !== undefined);
    const logs = M.state().logs.filter((l) => l.date >= o.from && l.date <= o.to);
    const items = [
      `التحديات: ${ch.filter((x) => x.done).length} مكتمل، ${ch.filter((x) => x.skipped).length} متروك، من ${dates.length} يومًا`,
      `الصلاة: ${pc.recorded ? Math.round(pc.prayed / pc.recorded * 100) + '% من المسجّل' : 'لا تسجيل'} (${pc.mosque} في المسجد)`,
      `وقت الشاشة: ${sc.length ? 'متوسط ' + Math.round(sc.reduce((n, x) => n + weightedOf(x), 0) / sc.length) + ' نقطة موزونة في اليوم المسجّل' : 'لا تسجيل'}`,
      `الماء: ${wc.length ? 'متوسط ' + (wc.reduce((n, v) => n + v, 0) / wc.length).toFixed(1) + ' كوب في اليوم المسجّل' : 'لا تسجيل'}`,
      `السجل اليومي: ${logs.length} يوم، ${logs.reduce((n, l) => n + l.workHours + l.skillHours + l.studyHours, 0).toFixed(1)} ساعة عمل ودراسة`
    ];
    $('reviewSummary').innerHTML = `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    if (document.activeElement !== $('reviewText')) $('reviewText').value = data.reviews[o.key] || '';
  }

  /* ---------------- الماء ---------------- */
  let waterNext = 0;
  const waterStatusText = () => {
    if (!data.water.enabled) return 'التذكير غير مفعّل.';
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const next = waterNext ? new Date(waterNext).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—';
    return `التذكير مفعّل كل ${data.water.interval} دقيقة (القادم تقريبًا ${next}). يعمل أثناء بقاء الصفحة مفتوحة فقط، وقد يوقفه نظام الهاتف أو المتصفح في الخلفية. ` +
      (perm === 'granted' ? 'إشعارات المتصفح مفعّلة.' : perm === 'denied' ? 'إشعارات المتصفح محظورة؛ ستظهر التنبيهات داخل الصفحة فقط.' : perm === 'unsupported' ? 'متصفحك لا يدعم الإشعارات؛ ستظهر التنبيهات داخل الصفحة فقط.' : 'لم تُمنح صلاحية الإشعارات بعد.');
  };
  function renderWater() {
    $('waterInterval').value = String(data.water.interval);
    $('waterStatus').textContent = waterStatusText();
    $('waterGoal').value = data.waterGoal;
    const cups = data.waterLog[hDate] || 0;
    $('waterCups').textContent = `${cups} / ${data.waterGoal}`;
    $('waterMinus').disabled = cups <= 0;
    const days = datesBack(hDate, 7);
    $('waterBars').innerHTML = days.map((d) => { const v = data.waterLog[d] || 0; return `<span class="mb ${data.waterLog[d] === undefined ? 'empty' : ''} ${v >= data.waterGoal ? 'good' : ''}" style="--h:${Math.max(3, Math.min(100, v / Math.max(1, data.waterGoal) * 100))}%" title="${fmtDate(d)}: ${v} كوب"><em>${new Date(d + 'T12:00:00').getDate()}</em></span>`; }).join('');
  }
  function scheduleWater() { waterNext = data.water.enabled ? Date.now() + data.water.interval * 60000 : 0; }
  function waterTick() {
    if (!data.water.enabled || !waterNext || Date.now() < waterNext || document.visibilityState !== 'visible') return;
    const msg = 'حان وقت شرب الماء إذا كنت عطشانًا. خذ استراحة قصيرة.';
    toast(msg);
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('تذكير مسار', { body: msg, tag: 'masar-water' }); } catch (e) { /* تجاهل */ } }
    scheduleWater(); $('waterStatus').textContent = waterStatusText();
  }
  function addCup(delta = 1) { const t = todayISO(); data.waterLog[t] = clamp((data.waterLog[t] || 0) + delta, 0, 60); if (save()) { renderWater(); } }

  /* ---------------- الأفكار ---------------- */
  const allThoughts = () => [...THOUGHTS, ...data.customThoughts];
  function renderThought(idx) {
    const list = allThoughts(); const i = idx !== undefined ? idx : Math.floor(Date.now() / 86400000) % THOUGHTS.length;
    $('dailyThought').textContent = list[i % list.length]; $('dailyThought').dataset.i = String(i % list.length);
    $('customThoughtList').innerHTML = data.customThoughts.length ? data.customThoughts.map((t, k) => `<li><span>${esc(t)}</span><button type="button" class="table-action" data-del-thought="${k}" aria-label="حذف الفكرة">حذف</button></li>`).join('') : '<li class="muted-li">لا توجد أفكار خاصة بك بعد.</li>';
  }

  /* ---------------- المظهر ---------------- */
  function applyTheme() {
    const dark = (data.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    document.body.classList.toggle('theme-dark', dark);
    $('themeToggle').textContent = dark ? '☀ الوضع الفاتح' : '◐ الوضع الداكن';
    $('themeToggle').setAttribute('aria-pressed', String(dark));
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#101a16' : '#047857';
    document.dispatchEvent(new CustomEvent('masar:theme'));
  }

  /* ---------------- الأحداث ---------------- */
  function setHDate(d) { if (!validISO(d)) return; if (d > todayISO()) { toast('لا يمكن التسجيل لتاريخ مستقبلي.'); d = todayISO(); } hDate = d; $('hDate').value = d; renderDay(); }
  function renderDay() { renderPrayers(); renderScreen(); renderWater(); $('hDate').max = todayISO(); $('hNext').disabled = hDate >= todayISO(); }
  function renderAll() { renderDay(); renderChallenge(); renderReview(); renderThought(); }
  function bind() {
    $('themeToggle').addEventListener('click', () => { const dark = document.body.classList.contains('theme-dark'); data.theme = dark ? 'light' : 'dark'; applyTheme(); save(); });
    $('hDate').addEventListener('change', (e) => setHDate(e.target.value || todayISO()));
    $('hPrev').addEventListener('click', () => setHDate(addDays(hDate, -1)));
    $('hNext').addEventListener('click', () => setHDate(addDays(hDate, 1)));
    $('hToday').addEventListener('click', () => setHDate(todayISO()));
    $('prayerList').addEventListener('change', (e) => { const row = e.target.closest('[data-prayer]'); if (!row || e.target.type !== 'radio') return; const day = data.prayers[hDate] || {}; day[row.dataset.prayer] = e.target.value; data.prayers[hDate] = day; if (save()) { renderPrayers(); } });
    $('prayerList').addEventListener('click', (e) => { const b = e.target.closest('[data-clear-prayer]'); if (!b) return; const day = data.prayers[hDate] || {}; delete day[b.dataset.clearPrayer]; if (Object.keys(day).length) data.prayers[hDate] = day; else delete data.prayers[hDate]; if (save()) renderPrayers(); });
    $('prayerHistory').addEventListener('click', (e) => { const b = e.target.closest('[data-goto-date]'); if (b) setHDate(b.dataset.gotoDate); });
    ['screenTiktok', 'screenYoutube', 'screenAi', 'screenOther'].forEach((id) => $(id).addEventListener('input', () => { const live = readScreenInputs(); $('screenTotal').textContent = totalOf(live); $('screenWeighted').textContent = weightedOf(live); $('screenTotal').classList.toggle('over', totalOf(live) > data.screenGoal.minutes); $('screenWeighted').classList.toggle('over', weightedOf(live) > data.screenGoal.weighted); }));
    $('saveScreen').addEventListener('click', () => {
      const r = readScreenInputs(); data.screen[hDate] = r;
      const total = totalOf(r), w = weightedOf(r);
      if (save()) { renderScreen(); toast(total > data.screenGoal.minutes || w > data.screenGoal.weighted ? 'تجاوزت حدّك اليومي لوقت الشاشة. جرّب تقليل تطبيق واحد غدًا.' : 'تم حفظ وقت الشاشة.'); }
    });
    $('clearScreen').addEventListener('click', () => { if (!data.screen[hDate]) { toast('لا يوجد تسجيل لهذا اليوم.'); return; } if (!confirm(`حذف وقت الشاشة المسجّل ليوم ${fmtDate(hDate)}؟`)) return; delete data.screen[hDate]; if (save()) { renderScreen(); toast('تم حذف تسجيل اليوم.'); } });
    const saveLimits = () => { data.screenGoal = { minutes: Math.round(num($('screenLimitMin').value, 10, 1440, 180)), weighted: Math.round(num($('screenLimitW').value, 10, 5760, 360)) }; if (save()) { renderScreen(); toast('تم حفظ حدود وقت الشاشة.'); } };
    $('screenLimitMin').addEventListener('change', saveLimits); $('screenLimitW').addEventListener('change', saveLimits);
    $('completeChallenge').addEventListener('click', () => { const t = todayISO(); data.challenges[t] = { done: true, skipped: false, reflection: $('challengeReflection').value.trim().slice(0, 1000), title: challengeFor(t).title, completedAt: new Date().toISOString() }; if (save()) { renderChallenge(); renderReview(); toast('تم تسجيل إنجاز التحدي. أحسنت.'); } });
    $('skipChallenge').addEventListener('click', () => { const t = todayISO(); if (!confirm('هل تريد ترك تحدي اليوم؟ سيُسجَّل كمتروك ويمكنك التراجع.')) return; data.challenges[t] = { done: false, skipped: true, reflection: $('challengeReflection').value.trim().slice(0, 1000), title: challengeFor(t).title, completedAt: '' }; if (save()) { renderChallenge(); renderReview(); toast('سُجّل التحدي كمتروك لهذا اليوم.'); } });
    $('undoChallenge').addEventListener('click', () => { const t = todayISO(); const rec = data.challenges[t]; if (!rec) return; if (rec.reflection) data.challenges[t] = { done: false, skipped: false, reflection: rec.reflection, title: rec.title, completedAt: '' }; else delete data.challenges[t]; if (save()) { renderChallenge(); renderReview(); toast('تم التراجع عن تسجيل اليوم.'); } });
    $('challengeReflection').addEventListener('change', () => { const t = todayISO(); if (data.challenges[t]) { data.challenges[t].reflection = $('challengeReflection').value.trim().slice(0, 1000); if (save()) renderChallenge(); } });
    $('refreshChallenge').addEventListener('click', () => { const t = todayISO(); data.challengeOffset[t] = ((data.challengeOffset[t] || 0) + 1) % 6; if (save()) { renderChallenge(); toast('تم اختيار تحدٍّ بديل من المرحلة نفسها.'); } });
    $('reviewSelect').addEventListener('change', renderReview);
    $('reviewText').addEventListener('change', () => { const k = $('reviewSelect').value; const v = $('reviewText').value.trim().slice(0, 2000); if (v) data.reviews[k] = v; else delete data.reviews[k]; if (save()) toast('تم حفظ المراجعة.'); });
    $('enableWater').addEventListener('click', async () => { if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { /* تجاهل */ } } data.water = { enabled: true, interval: Number($('waterInterval').value) || 60 }; scheduleWater(); if (save()) { renderWater(); toast('تم تفعيل تذكير الماء داخل الصفحة.'); } });
    $('disableWater').addEventListener('click', () => { data.water = { ...data.water, enabled: false }; scheduleWater(); if (save()) { renderWater(); toast('تم إيقاف التذكير.'); } });
    $('waterInterval').addEventListener('change', () => { data.water.interval = Number($('waterInterval').value) || 60; scheduleWater(); if (save()) renderWater(); });
    $('waterPlus').addEventListener('click', () => { const t = hDate; data.waterLog[t] = clamp((data.waterLog[t] || 0) + 1, 0, 60); if (save()) renderWater(); });
    $('waterMinus').addEventListener('click', () => { const t = hDate; data.waterLog[t] = clamp((data.waterLog[t] || 0) - 1, 0, 60); if (save()) renderWater(); });
    $('waterGoal').addEventListener('change', () => { data.waterGoal = Math.round(num($('waterGoal').value, 1, 40, 8)); if (save()) renderWater(); });
    $('newThought').addEventListener('click', () => { const list = allThoughts(); if (list.length < 2) return; let i; do { i = Math.floor(Math.random() * list.length); } while (i === Number($('dailyThought').dataset.i)); renderThought(i); });
    $('addThought').addEventListener('click', () => { const v = $('thoughtInput').value.trim(); if (!v) { toast('اكتب فكرتك أولًا.'); return; } if (data.customThoughts.length >= 50) { toast('وصلت إلى الحد الأقصى (50 فكرة).'); return; } data.customThoughts.push(v.slice(0, 200)); $('thoughtInput').value = ''; if (save()) { renderThought(THOUGHTS.length + data.customThoughts.length - 1); toast('تمت إضافة فكرتك.'); } });
    $('thoughtInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('addThought').click(); } });
    $('customThoughtList').addEventListener('click', (e) => { const b = e.target.closest('[data-del-thought]'); if (!b) return; data.customThoughts.splice(Number(b.dataset.delThought), 1); if (save()) renderThought(0); });
    document.addEventListener('masar:view', (e) => { if (e.detail.view === 'habits') { hDate = todayISO(); $('hDate').value = hDate; renderAll(); } });
    document.addEventListener('masar:reload', () => { data = load(); hDate = todayISO(); $('hDate').value = hDate; applyTheme(); scheduleWater(); renderAll(); });
    document.addEventListener('visibilitychange', waterTick);
  }

  function init() {
    $('hDate').value = hDate; $('hDate').max = todayISO();
    applyTheme(); renderAll(); bind(); scheduleWater();
    setInterval(waterTick, 30000);
  }
  window.MasarModules = window.MasarModules || {};
  window.MasarModules.ext = { sanitize, get: () => data, addCup, prayedOf, prayerCounts, weightedOf, totalOf, challengeFor, PRAYERS, SCREEN_APPS };
  init();
})();
