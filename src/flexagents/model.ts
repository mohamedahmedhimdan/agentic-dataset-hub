export type StageTheme = 'mint' | 'amber';

export type Stage = {
  id: number;
  code: string;
  nameAr: string;
  shortAr: string;
  fullTitleAr: string;
  descAr: string;
  formula: string;
  theme: StageTheme;
  cam: {x: number; y: number; z: number};
  lossTarget: number;
  uncertainty: number;
};

export type Domain = {
  id: string;
  datasetId: 'CU01' | 'CU02' | 'AT01' | 'AT03';
  name: string;
  titleAr: string;
  metrics: string;
  promptAr: string;
  adaptAr: string;
  outputAr: string;
};

/** Closed loop after deployment: observe, diagnose, propose Δθ, shadow-test, then commit or roll back. */
export const STAGES: Stage[] = [
  {
    id: 1,
    code: 'E1',
    nameAr: 'المراقبة الذاتية',
    shortAr: 'يرصد الخطأ وعدم اليقين أثناء التشغيل.',
    fullTitleAr: 'استقبال المهمة والمراقبة الذاتية',
    descAr: 'أثناء R0–R6 يراقب الطالب تفعيلاته ومؤشر عدم اليقين، ليعرف إن كانت المهمة تتجاوز ما تثبّت في التدريب التأسيسي T0–T6.',
    formula: 'e(t) = ||y_pred - y|| , u = H(p(y|x, θ(t)))',
    theme: 'mint',
    cam: {x: 0, y: 1.7, z: 8.8},
    lossTarget: 0.68,
    uncertainty: 0.42,
  },
  {
    id: 2,
    code: 'E2',
    nameAr: 'التشخيص الذاتي',
    shortAr: 'يعزل الطبقة المسؤولة عن القصور.',
    fullTitleAr: 'تشخيص الطبقات وتحديد القصور',
    descAr: 'يحسب حساسية المعاملات ليحدد طبقة المحوّل التي أفسدت استدعاء الأداة أو قراءة الواجهة، دون الاستعانة بمعلم خارجي.',
    formula: 'S_ij = |∂L / ∂W_ij| → layer l*',
    theme: 'mint',
    cam: {x: -3.8, y: 2, z: 7.2},
    lossTarget: 0.6,
    uncertainty: 0.35,
  },
  {
    id: 3,
    code: 'E3',
    nameAr: 'التفكير في الأوزان',
    shortAr: 'يبحث عن اتجاه تعديل على منحنى الخسارة.',
    fullTitleAr: 'التفكير في مساحة الأوزان',
    descAr: 'يستكشف هندسة L(θ) واتجاه الانحدار المحلي ليجد تعديلًا صغيرًا يحسّن المهمة الحالية دون مسح المهارات السابقة.',
    formula: 'd* = argmin_d [ ∇Lᵀ d + ½ dᵀ H d ]',
    theme: 'mint',
    cam: {x: 4, y: 2.4, z: 7},
    lossTarget: 0.51,
    uncertainty: 0.27,
  },
  {
    id: 4,
    code: 'E4',
    nameAr: 'توليد تحديث LoRA',
    shortAr: 'يبني Δθ منخفض الرتبة ومتفرقًا.',
    fullTitleAr: 'توليد تحديثات أوزان موضعية',
    descAr: 'يولّد الطالب تحديثًا منخفض الرتبة ومتفرقًا Δθ = B·A بصيغة BF16، يمس أعمدة قليلة مرتبطة بالقصور الذي شخّصه.',
    formula: 'Δθ = B · A   (rank r = 8, BF16)',
    theme: 'amber',
    cam: {x: 0.3, y: 4.5, z: 6.2},
    lossTarget: 0.38,
    uncertainty: 0.2,
  },
  {
    id: 5,
    code: 'E5',
    nameAr: 'بيئة الظل',
    shortAr: 'يجرّب المرشح دون لمس الأوزان النشطة.',
    fullTitleAr: 'المحاكاة في بيئة الظل المعزولة',
    descAr: 'تُطبَّق الإضافة على نسخة ظل فقط. الأوزان التي تخدم المهام الحية تبقى θ(t) إلى أن تمر البوابة.',
    formula: 'θ_cand = θ(t) + Δθ',
    theme: 'amber',
    cam: {x: 0, y: 0.5, z: 4.2},
    lossTarget: 0.26,
    uncertainty: 0.14,
  },
  {
    id: 6,
    code: 'E6',
    nameAr: 'الاختبار الذاتي',
    shortAr: 'يقارن المرشح بالأداء الحالي.',
    fullTitleAr: 'الاختبار والتقييم الذاتي',
    descAr: 'تُعاد مسارات تحقق قصيرة على θ_cand لقياس الكسب والتأكد أن المهارات القديمة لم تسقط تحت حد التراجع.',
    formula: 'Δperf = Perf(θ_cand) − Perf(θ(t))',
    theme: 'mint',
    cam: {x: -3, y: -1.2, z: 5.6},
    lossTarget: 0.18,
    uncertainty: 0.1,
  },
  {
    id: 7,
    code: 'E7',
    nameAr: 'بوابة الأمان',
    shortAr: 'تقبل الدمج أو تعيد θ(t) فورًا.',
    fullTitleAr: 'بوابة الأمان والتراجع التلقائي',
    descAr: 'إن رُصد تراجع تُرفض الإضافة وتُعاد الحلقة إلى التفكير في الأوزان. لا يُكتب شيء في الأوزان النشطة قبل اجتياز الشروط الثلاثة.',
    formula: 'pass if ΔL ≤ −ε and regression ≤ δ',
    theme: 'mint',
    cam: {x: 3.2, y: 1.4, z: 6},
    lossTarget: 0.13,
    uncertainty: 0.07,
  },
  {
    id: 8,
    code: 'E8',
    nameAr: 'الدمج الدائم',
    shortAr: 'يثبت θ(t+1) ثم يكمِل المهمة.',
    fullTitleAr: 'الدمج الدائم وتنفيذ المهمة',
    descAr: 'بعد الاجتياز تصبح أوزان الظل هي الحالة النشطة. المهارة المكتسبة تبقى مع الطالب في المهام التالية، بلا معلم خارجي.',
    formula: 'θ(t+1) = θ_cand',
    theme: 'mint',
    cam: {x: 0, y: 1.8, z: 8.4},
    lossTarget: 0.08,
    uncertainty: 0.03,
  },
];

/** One sandbox per library record the visitor can open. */
export const DOMAINS: Domain[] = [
  {
    id: 'cu01',
    datasetId: 'CU01',
    name: 'AgentNet',
    titleAr: 'مسارات استخدام الكمبيوتر',
    metrics: 'Desktop trajectories · mouse and keyboard',
    promptAr: 'تسجيل فاتورة على سطح مكتب غير مألوف من مسارات AgentNet، مع تغيّر موضع زر الحفظ بين اللقطات.',
    adaptAr: 'القصور هنا مكاني: الطالب يخطئ إحداثي النقرة. التشخيص يعزل طبقة الرؤية، وتحديث LoRA يحرّك قرار النقرة، ثم تُراجع بيئة الظل أن الحفظ تم مرة واحدة.',
    outputAr: 'دُمج تحديث الرؤية المكانية في θ(t+1). حدد الوكيل زر الحفظ الجديد وأغلق المهمة بعد حفظ واحد على مسار AgentNet.',
  },
  {
    id: 'cu02',
    datasetId: 'CU02',
    name: 'GUI-360',
    titleAr: 'تثبيت العناصر على الشاشة',
    metrics: 'Visual grounding · action prediction',
    promptAr: 'تحديد عنصر واجهة في لقطة GUI-360 حين تختلف الإحداثيات المعالجة عن نظام الشاشة الحالي.',
    adaptAr: 'القصور في مطابقة الصندوق مع نظام الإحداثيات. التحديث الموضعي يضبط طبقة التثبيت البصري، وبوابة الأمان ترفض أي هبوط في مهام النقر التي اجتازها الطالب من قبل.',
    outputAr: 'اجتاز θ_cand فحص التثبيت على GUI-360 دون تراجع في مهام النقر السابقة، ثم أصبح θ(t+1).',
  },
  {
    id: 'at01',
    datasetId: 'AT01',
    name: 'Nemotron-SFT-Agentic-v2',
    titleAr: 'استدعاء الأدوات متعدد الخطوات',
    metrics: 'Tool calls · multi-step agent traces',
    promptAr: 'مسألة تحتاج سلسلة استدعاءات من Nemotron-SFT-Agentic-v2، مع قراءة نتيجة كل أداة قبل القرار التالي.',
    adaptAr: 'القصور في اختيار الأداة أو في تجاهل نتيجتها. التشخيص يستهدف طبقة قرار الاستدعاء، والظل يعيد المسار ليتأكد أن النتيجة الواردة من الأداة هي ما يراه الطالب بعد ذلك.',
    outputAr: 'تقلّص خطأ اختيار الأداة على مسار Nemotron بعد الدمج. الطالب يقرأ نتيجة الأداة ثم يتوقف عند اكتمال السلسلة.',
  },
  {
    id: 'at03',
    datasetId: 'AT03',
    name: 'Open-SWE-Traces',
    titleAr: 'إصلاح برمجي مع اختبارات',
    metrics: 'Edit, test, and terminal traces',
    promptAr: 'فشل اختبار في مستودع غير مألوف ضمن Open-SWE-Traces. المطلوب رقعة صغيرة ثم إعادة الاختبار قبل أي ادعاء بالنجاح.',
    adaptAr: 'القصور في إغلاق الحلقة بين ناتج الاختبار والتعديل التالي. تحديث منخفض الرتبة يربط رسالة الفشل بالرقعة، والبوابة ترفض الدمج إن بقي الاختبار أحمر.',
    outputAr: 'قُبلت الرقعة في θ(t+1) بعد أن أعاد الظل تشغيل الاختبار المرتبط بمسار Open-SWE-Traces ومرّ بلا تراجع.',
  },
];

export const CANDIDATE_LOSS = [0.72, 0.62, 0.49, 0.37, 0.28, 0.21, 0.16, 0.11];
