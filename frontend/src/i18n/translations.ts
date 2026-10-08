import { rfqAr, rfqEn } from './translations.rfq';
import { assessmentAr, assessmentEn } from './translations.assessment';

/**
 * UI strings, English and Arabic.
 *
 * Only chrome lives here — labels, headings, accessible names. Marketing and
 * listing content lives in data/content.ts as `Localized<T>` pairs, so copy
 * can be swapped for API data later without touching this file.
 *
 * Placeholders use {name} and are filled by the second argument to `t`.
 */

export type Lang = 'en' | 'ar';

export const LANGS: Record<Lang, { label: string; dir: 'ltr' | 'rtl'; nativeName: string }> = {
  en: { label: 'English', dir: 'ltr', nativeName: 'English' },
  ar: { label: 'العربية', dir: 'rtl', nativeName: 'العربية' },
};

const site = {
  'nav.home': 'Home',
  'nav.requests': 'My Requests',
  'nav.companies': 'Solar Companies',
  'nav.projects': 'Projects',
  'nav.how': 'How It Works',
  'nav.calc': 'AI Solar Calculator',
  'cta.signin': 'Sign In',
  'cta.start': 'Get Started',
  'cta.soon': 'Accounts and sign-in are coming soon — you can request quotes without one.',

  'a11y.skip': 'Skip to content',
  'a11y.logoHome': 'Utu — home',
  'a11y.calcShortcut': 'Open the AI solar calculator',
  'a11y.menuOpen': 'Open menu',
  'a11y.menuClose': 'Close menu',
  'a11y.switchLang': 'Switch the site to Arabic',
  'a11y.heroVisual':
    'Sunset reflecting across a rooftop photovoltaic array, with a live output reading of 6.2 kilowatts and a recommended 8.4 kilowatt-peak system',

  'hero.pill': 'AI load calculator · built for Iraqi homes',
  'hero.h1': 'Find the Right Solar System for Your Energy Needs',
  'hero.sub':
    'Compare trusted solar companies, calculate your energy requirements, and find the right solar solution for your home or business.',
  'hero.cta1': 'Calculate My Solar Needs',
  'hero.cta2': 'Explore Solar Solutions',
  'hero.trust1': 'Verified companies',
  'hero.trust2': 'Completed projects',
  'hero.trust3': 'Average rating',
  'hero.live': 'Live output today',
  'hero.rec': 'Recommended 8.4 kWp',
  'hero.recSub': '12 panels · 10 kWh battery',

  'calc.pill': 'AI Solar Load Calculator',
  'calc.h2a': 'Tell us what you run.',
  'calc.h2b': 'We size the system.',
  'calc.sub':
    'Add the appliances in your home or business and how long each one runs. The calculator turns that into a daily load, then recommends panel count, inverter size and battery capacity.',
  'calc.p1': 'No meter reading or electricity bill required',
  'calc.p2': 'Accounts for Baghdad sun hours and grid outage patterns',
  'calc.p3': 'Results you can send straight to verified companies',

  'panel.title': 'Your appliances',
  'panel.sub': 'Example configuration — a 3-bedroom home in Baghdad',
  'panel.tag': 'Demo values',
  'panel.add': 'Add another appliance',
  'panel.resultHead': 'Estimated result',
  'panel.basis': 'Based on {h} peak sun hours · Baghdad',
  'panel.btn': 'Calculate My System',
  'panel.calculating': 'Calculating…',
  'panel.disclaimer': 'Estimates only — a verified company confirms the final design on site.',
  'panel.rfqLead': 'Happy with this estimate?',
  'panel.rfqCta': 'Request Quotes',
  'panel.rfqNote': 'Sends this system to the verified companies you choose.',

  'row.units': 'Units',
  'row.hours': 'Hours / day',
  'row.perDay': 'per day',
  'row.each': 'W each',
  'row.decrease': 'Decrease {n}',
  'row.increase': 'Increase {n}',
  'row.unitsOf': '{n} units',
  'row.hoursOf': '{n} hours per day',

  'res.usage': 'Estimated energy usage',
  'res.size': 'Recommended system size',
  'res.battery': 'Estimated battery capacity',
  'res.panels': 'Estimated solar panels',
  'res.usageNote': 'Across {n} appliance groups',
  'res.sizeNote': 'About {n} × {w} W panels',
  'res.batteryNote': 'Covers roughly {n} h of outage',
  'res.panelsNote': '{w} W monocrystalline',
  'res.unitKwhDay': 'kWh / day',
  'res.unitKwp': 'kWp',
  'res.unitKwh': 'kWh',
  'res.unitPanels': 'panels',

  'empty.title': 'Nothing to size yet',
  'empty.body':
    'Set the units and daily hours for at least one appliance and the recommendation appears here.',

  'how.eyebrow': 'How it works',
  'how.h2': 'From your electricity bill to a signed installation, in four steps',

  'co.eyebrow': 'Solar companies',
  'co.h2': 'Verified installers, with the work to prove it',
  'co.lede':
    'Every listing shows licence status, completed installations and reviews from customers whose projects are on the platform.',
  'co.viewAll': 'View All Companies',
  'co.view': 'View Company',
  'co.completed': 'Completed',
  'co.experience': 'Experience',
  'co.topRated': 'Top rated in Baghdad',

  'badge.verified': 'Verified',
  'badge.verifiedDesc': 'Licence, tax record and past installations checked',
  'badge.pending': 'Pending verification',
  'badge.pendingDesc': 'Documents submitted, review in progress',
  'badge.rejected': 'Not verified',
  'badge.rejectedDesc': 'Did not meet the listing requirements',

  'rate.aria': 'Rated {s} out of 5',
  'rate.ariaCount': 'Rated {s} out of 5 from {c} reviews',
  'rate.reviews': '({c} reviews)',

  'pr.eyebrow': 'Featured projects',
  'pr.h2': 'Systems already running across Iraq',
  'pr.viewAll': 'View All Projects',
  'pr.completed': 'Completed',
  'pr.inProgress': 'In progress',
  'pr.size': 'System size',
  'pr.install': 'Installation',
  'pr.by': 'Installed by',
  'pr.imgAlt': 'Solar array at {l}',

  'tr.eyebrow': 'Why trust us',
  'tr.h2': 'Checks that happen before a company reaches you',

  'wa.eyebrow': 'Warranty & after-sales',
  'wa.h2': 'Cover published before you commit',
  'wa.lede':
    'Each system on the platform lists its warranty terms per component, so two quotes can be compared on cover as well as price.',
  'wa.note':
    'Warranty documents are attached to the project record, so a future owner of the property can still see them.',

  'rv.eyebrow': 'Customer reviews',
  'rv.h2': 'From people whose systems are already running',
  'rv.lede':
    'Only customers with a completed project on the platform can leave a review, and the project it refers to is shown with it.',

  'fcta.h2': 'Ready to find the right solar solution?',
  'fcta.p': 'Calculate your energy needs and discover solar solutions from trusted companies.',
  'fcta.b1': 'Start Solar Calculator',
  'fcta.b2': 'Explore Companies',

  'ft.tagline':
    'The verified marketplace for solar energy in Iraq — calculate what you need, then compare companies that have actually built it.',
  'ft.platform': 'Platform',
  'ft.forCompanies': 'For Companies',
  'ft.support': 'Support',
  'ft.copy': '© 2026 Utu — Baghdad, Iraq',
  'ft.privacy': 'Privacy',
  'ft.terms': 'Terms',
  'ft.social': 'Utu on {n}',
  'ft.l1': 'Home',
  'ft.l2': 'Companies',
  'ft.l3': 'Projects',
  'ft.l4': 'Calculator',
  'ft.l5': 'How It Works',
  'ft.c1': 'Join Marketplace',
  'ft.c2': 'Add Your Company',
  'ft.c3': 'Manage Projects',
  'ft.s1': 'Help Center',
  'ft.s2': 'Contact',
  'ft.s3': 'FAQ',
} as const;

/** Site chrome plus the request-for-quote flow and the AI assessment flow. */
const en = { ...site, ...rfqEn, ...assessmentEn };

export type TranslationKey = keyof typeof en;

const siteAr: Record<keyof typeof site, string> = {
  'nav.home': 'الرئيسية',
  'nav.requests': 'طلباتي',
  'nav.companies': 'شركات الطاقة',
  'nav.projects': 'المشاريع',
  'nav.how': 'كيف تعمل',
  'nav.calc': 'حاسبة الطاقة الذكية',
  'cta.signin': 'تسجيل الدخول',
  'cta.start': 'ابدأ الآن',
  'cta.soon': 'الحسابات وتسجيل الدخول قريبًا — تكدر تطلب عروض أسعار بدون حساب.',

  'a11y.skip': 'تخطَّ إلى المحتوى',
  'a11y.logoHome': 'أوتو — الرئيسية',
  'a11y.calcShortcut': 'افتح حاسبة الطاقة الشمسية',
  'a11y.menuOpen': 'افتح القائمة',
  'a11y.menuClose': 'أغلق القائمة',
  'a11y.switchLang': 'تحويل الموقع إلى الإنجليزية',
  'a11y.heroVisual':
    'غروب ينعكس على مصفوفة ألواح شمسية على السطح، مع قراءة إنتاج حالية 6.2 كيلوواط ومنظومة مقترحة بقدرة 8.4 كيلوواط ذروي',

  'hero.pill': 'حاسبة الأحمال بالذكاء الاصطناعي · مصمّمة للبيوت العراقية',
  'hero.h1': 'اعثر على منظومة الطاقة الشمسية المناسبة لاحتياجك',
  'hero.sub':
    'قارن بين شركات الطاقة الشمسية الموثّقة، احسب احتياجك من الطاقة، واختر الحل المناسب لمنزلك أو مشروعك.',
  'hero.cta1': 'احسب احتياجي من الطاقة',
  'hero.cta2': 'تصفّح الحلول الشمسية',
  'hero.trust1': 'شركة موثّقة',
  'hero.trust2': 'مشروع منجز',
  'hero.trust3': 'متوسط التقييم',
  'hero.live': 'الإنتاج الحالي اليوم',
  'hero.rec': 'المقترح 8.4 kWp',
  'hero.recSub': '12 لوحًا · بطارية 10 kWh',

  'calc.pill': 'حاسبة الأحمال الشمسية الذكية',
  'calc.h2a': 'أخبرنا بما تشغّله.',
  'calc.h2b': 'ونحدّد لك حجم المنظومة.',
  'calc.sub':
    'أضف الأجهزة الموجودة في منزلك أو مشروعك وعدد ساعات تشغيل كل جهاز. الحاسبة تحوّل ذلك إلى حِمل يومي، ثم تقترح عدد الألواح وحجم الإنفرتر وسعة البطارية.',
  'calc.p1': 'لا تحتاج قراءة عدّاد ولا فاتورة كهرباء',
  'calc.p2': 'تأخذ بالحسبان ساعات الشمس في بغداد وانقطاعات الشبكة',
  'calc.p3': 'نتائج ترسلها مباشرة إلى الشركات الموثّقة',

  'panel.title': 'أجهزتك',
  'panel.sub': 'إعداد تجريبي — منزل بثلاث غرف نوم في بغداد',
  'panel.tag': 'قيم تجريبية',
  'panel.add': 'أضف جهازًا آخر',
  'panel.resultHead': 'النتيجة التقديرية',
  'panel.basis': 'بناءً على {h} ساعة ذروة شمسية · بغداد',
  'panel.btn': 'احسب منظومتي',
  'panel.calculating': 'جارٍ الحساب…',
  'panel.disclaimer': 'تقديرات فقط — الشركة الموثّقة تؤكّد التصميم النهائي في الموقع.',
  'panel.rfqLead': 'راضٍ عن هذا التقدير؟',
  'panel.rfqCta': 'اطلب عروض أسعار',
  'panel.rfqNote': 'يرسل هذه المنظومة إلى الشركات الموثّقة التي تختارها.',

  'row.units': 'العدد',
  'row.hours': 'ساعات/اليوم',
  'row.perDay': 'يوميًا',
  'row.each': 'واط للوحدة',
  'row.decrease': 'إنقاص {n}',
  'row.increase': 'زيادة {n}',
  'row.unitsOf': 'عدد {n}',
  'row.hoursOf': 'ساعات تشغيل {n}',

  'res.usage': 'استهلاك الطاقة التقديري',
  'res.size': 'حجم المنظومة المقترح',
  'res.battery': 'سعة البطارية التقديرية',
  'res.panels': 'عدد الألواح التقديري',
  'res.usageNote': 'موزّعة على {n} مجموعة أجهزة',
  'res.sizeNote': 'نحو {n} لوحًا بقدرة {w} واط',
  'res.batteryNote': 'تغطي نحو {n} ساعة انقطاع',
  'res.panelsNote': 'أحادي البلورة {w} واط',
  'res.unitKwhDay': 'kWh / يوم',
  'res.unitKwp': 'kWp',
  'res.unitKwh': 'kWh',
  'res.unitPanels': 'لوح',

  'empty.title': 'لا يوجد ما نحسبه بعد',
  'empty.body': 'حدّد العدد وساعات التشغيل لجهاز واحد على الأقل وستظهر التوصية هنا.',

  'how.eyebrow': 'كيف تعمل',
  'how.h2': 'من فاتورة الكهرباء إلى تركيب موقّع، في أربع خطوات',

  'co.eyebrow': 'شركات الطاقة الشمسية',
  'co.h2': 'شركات موثّقة، وأعمالها تشهد لها',
  'co.lede':
    'كل شركة معروضة مع حالة الترخيص والتركيبات المنجزة وتقييمات عملاء مشاريعهم موجودة على المنصة.',
  'co.viewAll': 'عرض كل الشركات',
  'co.view': 'عرض الشركة',
  'co.completed': 'منجزة',
  'co.experience': 'الخبرة',
  'co.topRated': 'الأعلى تقييمًا في بغداد',

  'badge.verified': 'موثّقة',
  'badge.verifiedDesc': 'تم التحقق من الترخيص والسجل الضريبي والتركيبات السابقة',
  'badge.pending': 'قيد التحقق',
  'badge.pendingDesc': 'قُدّمت المستندات والمراجعة جارية',
  'badge.rejected': 'غير موثّقة',
  'badge.rejectedDesc': 'لم تستوفِ شروط الإدراج',

  'rate.aria': 'التقييم {s} من 5',
  'rate.ariaCount': 'التقييم {s} من 5 بناءً على {c} مراجعة',
  'rate.reviews': '({c} مراجعة)',

  'pr.eyebrow': 'مشاريع مختارة',
  'pr.h2': 'منظومات تعمل فعلًا في أنحاء العراق',
  'pr.viewAll': 'عرض كل المشاريع',
  'pr.completed': 'منجز',
  'pr.inProgress': 'قيد التنفيذ',
  'pr.size': 'حجم المنظومة',
  'pr.install': 'نوع التركيب',
  'pr.by': 'نفّذتها',
  'pr.imgAlt': 'مصفوفة ألواح شمسية في {l}',

  'tr.eyebrow': 'لماذا تثق بنا',
  'tr.h2': 'فحوصات تجري قبل أن تصلك الشركة',

  'wa.eyebrow': 'الضمان وما بعد البيع',
  'wa.h2': 'تغطية معلنة قبل أن تلتزم',
  'wa.lede':
    'كل منظومة على المنصة تعرض شروط ضمانها لكل مكوّن، فتقدر تقارن بين عرضين على أساس التغطية كما على أساس السعر.',
  'wa.note': 'مستندات الضمان مرفقة بسجل المشروع، فيقدر المالك اللاحق للعقار أن يطّلع عليها.',

  'rv.eyebrow': 'آراء العملاء',
  'rv.h2': 'من أصحاب منظومات تعمل بالفعل',
  'rv.lede':
    'المراجعة متاحة فقط لعميل أنجز مشروعه على المنصة، والمشروع المقصود معروض إلى جانبها.',

  'fcta.h2': 'جاهز لإيجاد الحل الشمسي المناسب؟',
  'fcta.p': 'احسب احتياجك من الطاقة واكتشف حلولًا من شركات موثّقة.',
  'fcta.b1': 'ابدأ حاسبة الطاقة',
  'fcta.b2': 'تصفّح الشركات',

  'ft.tagline':
    'المنصة الموثّقة للطاقة الشمسية في العراق — احسب احتياجك، ثم قارن بين شركات نفّذت فعلًا ما تحتاجه.',
  'ft.platform': 'المنصة',
  'ft.forCompanies': 'للشركات',
  'ft.support': 'الدعم',
  'ft.copy': '© 2026 أوتو — بغداد، العراق',
  'ft.privacy': 'الخصوصية',
  'ft.terms': 'الشروط',
  'ft.social': 'أوتو على {n}',
  'ft.l1': 'الرئيسية',
  'ft.l2': 'الشركات',
  'ft.l3': 'المشاريع',
  'ft.l4': 'الحاسبة',
  'ft.l5': 'كيف تعمل',
  'ft.c1': 'انضم إلى المنصة',
  'ft.c2': 'أضف شركتك',
  'ft.c3': 'إدارة المشاريع',
  'ft.s1': 'مركز المساعدة',
  'ft.s2': 'اتصل بنا',
  'ft.s3': 'الأسئلة الشائعة',
};

const ar: Record<TranslationKey, string> = { ...siteAr, ...rfqAr, ...assessmentAr };

export const translations: Record<Lang, Record<TranslationKey, string>> = { en, ar };
