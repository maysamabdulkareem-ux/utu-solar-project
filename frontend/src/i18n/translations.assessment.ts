/**
 * Copy for the UTU system assessment (#/assessment) and the UTU assistant.
 *
 * Same pattern as `translations.rfq.ts`: the English object is the source of
 * truth for the key set and the Arabic object is checked against it.
 *
 * Wording rule: these screens are a calculator-based estimate with templated
 * answers. They never claim an AI model, a "match score" or a price quote.
 */

export const assessmentEn = {
  'as.title': 'Your UTU system assessment',
  'as.subtitle': 'Three system options built from the appliances you entered in the smart calculator. Pick one and send it to verified companies for real quotes.',
  'as.back': 'Back to the calculator',
  'as.empty': 'Run the smart energy calculator first — there is nothing to assess yet.',
  'as.emptyCta': 'Open the smart calculator',

  'as.tiers.eyebrow': 'System options',
  'as.tier.economy.name': 'Economy',
  'as.tier.economy.tag': 'Lower upfront cost',
  'as.tier.economy.desc': 'A smaller system sized mainly for your daytime load.',
  'as.tier.balanced.name': 'Balanced',
  'as.tier.balanced.tag': 'Cost, coverage and backup in balance',
  'as.tier.balanced.desc': 'Sized directly from your calculator result.',
  'as.tier.balanced.badge': 'Suggested by UTU',
  'as.tier.highIndependence.name': 'High independence',
  'as.tier.highIndependence.tag': 'More solar coverage and backup',
  'as.tier.highIndependence.desc': 'Less reliance on the grid and generator, at a higher cost.',
  'as.tier.panelCapacity': 'Solar panel capacity',
  'as.tier.panelCount': 'Number of panels',
  'as.tier.inverter': 'Inverter size',
  'as.tier.battery': 'Battery capacity',
  'as.tier.cost': 'Rough cost estimate',
  'as.tier.backup': 'Estimated backup',
  'as.tier.coverage': 'Solar coverage',
  'as.tier.selectCta': 'Choose this option',
  'as.tier.selected': 'Selected',
  'as.compare.cta': 'Compare options',
  'as.compare.close': 'Hide comparison',
  'as.compare.title': 'Compare the three options',
  'as.estimateNote': 'Costs are rough market estimates, not prices. Companies quote the real price after seeing your site.',

  'as.why.title': 'Why this size?',
  'as.why.p1': 'Your system is sized around an estimated {daily} kWh per day across {count} active appliance groups.',
  'as.why.p2': '{name} is about {share}% of your daily use, so the {inverter} kW inverter keeps headroom for that load.',
  'as.why.p3': 'About {night}% of the load is assumed to fall in the evening, so the {battery} kWh battery is sized to carry it — roughly {backup} hours of backup under these assumptions.',

  'as.request.title': 'Ready for real prices?',
  'as.request.body': 'We fill the quote request with the {name} option ({size} kWp, {battery} kWh). You can still change every number before sending.',
  'as.request.cta': 'Request quotes for this system',

  'as.impact.eyebrow': 'Your energy mix',
  'as.impact.title': 'Before and after solar',
  'as.impact.subtitle': 'An estimate of how the selected option could change where your power comes from.',
  'as.impact.currentTitle': 'Typical mix today',
  'as.impact.currentNote': 'A typical Baghdad household before solar — used as the starting point, not your own bills.',
  'as.impact.grid': 'National grid',
  'as.impact.generator': 'Generator',
  'as.impact.solar': 'Solar',
  'as.impact.projectedTitle': 'With the selected option',
  'as.impact.solarCoverage': 'Solar coverage',
  'as.impact.gridDependency': 'Grid dependency',
  'as.impact.generatorDependency': 'Generator dependency',
  'as.impact.batteryBackup': 'Battery backup',
  'as.impact.monthlySaving': 'Monthly saving',
  'as.impact.annualSaving': 'Annual saving',
  'as.impact.estimatedBadge': 'Estimate',
  'as.impact.assumptionsToggle': 'How is this calculated?',
  'as.impact.assumptionsBody':
    'The starting mix assumes {gridBase}% national grid and {genBase}% private generator. Savings use {gridTariff} IQD/kWh for the grid and {genTariff} IQD/kWh for the generator, applied to the share solar is estimated to cover. Real bills vary with tariff bracket, generator subscription and weather.',
  'as.impact.unitHours': 'hours',
  'as.impact.unitIQD': 'IQD',

  'as.companies.eyebrow': 'Verified companies',
  'as.companies.title': 'Companies that can quote this system',
  'as.companies.subtitle': 'Only companies whose licence, tax record and completed projects were checked. Sorted by verified customer reviews.',
  'as.companies.reviews': '{n} verified reviews',
  'as.companies.noReviews': 'No verified reviews yet',
  'as.companies.view': 'View company',
  'as.companies.request': 'Request a quote from this company',
  'as.companies.empty': 'No verified companies are available yet.',
  'as.companies.loading': 'Loading companies…',

  'as.assistant.entry': 'Ask UTU assistant',
  'as.assistant.title': 'UTU assistant',
  'as.assistant.opening': 'Hi! Pick a question below — I answer from this assessment’s own numbers.',
  'as.assistant.quickTitle': 'Quick questions',
  'as.assistant.moreQuestions': 'More questions',
  'as.assistant.note': 'Ready-made answers built from your calculator result. Free-form chat comes in a later update.',
  'as.assistant.close': 'Close assistant',
  'as.assistant.q.whyThisSystem': 'Why this system?',
  'as.assistant.q.whyBattery': 'Why this battery size?',
  'as.assistant.q.whyInverter': 'Why this inverter size?',
  'as.assistant.q.reduceCost': 'Can I lower the cost?',
  'as.assistant.q.addAnotherAC': 'What if I add another AC?',
  'as.assistant.q.backupHours': 'How many hours of backup?',
  'as.assistant.q.whichCompanies': 'Which companies can quote it?',
  'as.assistant.a.whyThisSystem':
    'The {panelKWp} kWp option covers about {coverage}% of your estimated daily use with roughly {backup} hours of backup, at a rough estimate of {iqd} IQD.',
  'as.assistant.a.whyBattery':
    'About {nightShare}% of your use is assumed to fall in the evening. The {batteryKWh} kWh battery carries that for roughly {backup} hours. A shorter backup target allows a smaller battery.',
  'as.assistant.a.whyInverter':
    'The {inverterKW} kW inverter leaves headroom for your {panelKWp} kWp of panels and for appliances running at the same time.',
  'as.assistant.a.reduceCost':
    'Yes. The Economy option is roughly {savingIQD} IQD cheaper (about {iqd} IQD), with lower solar coverage (about {coverage}%) and shorter backup.',
  'as.assistant.a.reduceCostAlready':
    'You already picked the lowest-cost option. To go lower, reduce hours of heavy appliances (like ACs) in the calculator and run it again.',
  'as.assistant.a.addAnotherAC':
    'One more typical AC would raise your daily use by about {growthPct}%, so you would need a bigger system than the current {iqd} IQD estimate. Add it in the calculator for an exact figure.',
  'as.assistant.a.backupHours':
    'About {backup} hours from the {batteryKWh} kWh battery. The real time depends on which appliances stay on during an outage.',
  'as.assistant.a.whichCompanies':
    '{companyCount} verified companies can quote a system around {panelKWp} kWp. They are listed on this page — you can send your request to up to 3 of them.',
} as const;

export type AssessmentKey = keyof typeof assessmentEn;

export const assessmentAr: Record<AssessmentKey, string> = {
  'as.title': 'تقييم UTU لمنظومتك',
  'as.subtitle': 'ثلاث خيارات للمنظومة مبنية على الأجهزة اللي دخلتها بالحاسبة الذكية. اختار وحدة ودزها للشركات الموثّقة حتى توصلك أسعار حقيقية.',
  'as.back': 'الرجوع للحاسبة',
  'as.empty': 'شغّل حاسبة الطاقة الذكية أولاً — ماكو شي نقيّمه بعد.',
  'as.emptyCta': 'افتح الحاسبة الذكية',

  'as.tiers.eyebrow': 'خيارات المنظومة',
  'as.tier.economy.name': 'اقتصادية',
  'as.tier.economy.tag': 'كلفة أولية أقل',
  'as.tier.economy.desc': 'منظومة أصغر محسوبة أساساً على استهلاكك بالنهار.',
  'as.tier.balanced.name': 'متوازنة',
  'as.tier.balanced.tag': 'توازن بين الكلفة والتغطية والخزن',
  'as.tier.balanced.desc': 'محسوبة مباشرة من نتيجة حاسبتك.',
  'as.tier.balanced.badge': 'مقترحة من UTU',
  'as.tier.highIndependence.name': 'استقلالية عالية',
  'as.tier.highIndependence.tag': 'تغطية شمسية وخزن أكثر',
  'as.tier.highIndependence.desc': 'اعتماد أقل على الوطنية والمولدة، بكلفة أعلى.',
  'as.tier.panelCapacity': 'قدرة الألواح',
  'as.tier.panelCount': 'عدد الألواح',
  'as.tier.inverter': 'حجم الإنفرتر',
  'as.tier.battery': 'سعة البطارية',
  'as.tier.cost': 'كلفة تقريبية',
  'as.tier.backup': 'ساعات الخزن التقريبية',
  'as.tier.coverage': 'التغطية الشمسية',
  'as.tier.selectCta': 'اختار هذا الخيار',
  'as.tier.selected': 'مختار',
  'as.compare.cta': 'قارن الخيارات',
  'as.compare.close': 'إخفاء المقارنة',
  'as.compare.title': 'مقارنة الخيارات الثلاثة',
  'as.estimateNote': 'الكلف تقديرات تقريبية للسوق وليست أسعار. الشركات تحدد السعر الحقيقي بعد ما تشوف موقعك.',

  'as.why.title': 'ليش هذا الحجم؟',
  'as.why.p1': 'منظومتك محسوبة على استهلاك يومي تقديري {daily} kWh موزّع على {count} مجموعة أجهزة شغّالة.',
  'as.why.p2': '{name} ياخذ تقريباً {share}% من استهلاكك اليومي، لذلك الإنفرتر {inverter} kW يخلي مجال كافي لهذا الحمل.',
  'as.why.p3': 'نفترض إن تقريباً {night}% من الحمل يكون بالليل، فالبطارية {battery} kWh محسوبة حتى تشيله — تقريباً {backup} ساعة خزن حسب هذه الافتراضات.',

  'as.request.title': 'جاهز للأسعار الحقيقية؟',
  'as.request.body': 'نملي طلب عرض السعر بخيار "{name}" ({size} kWp، بطارية {battery} kWh). تكدر تعدّل أي رقم قبل الإرسال.',
  'as.request.cta': 'اطلب عروض أسعار لهذه المنظومة',

  'as.impact.eyebrow': 'مصادر طاقتك',
  'as.impact.title': 'قبل الطاقة الشمسية وبعدها',
  'as.impact.subtitle': 'تقدير لشلون ممكن يغيّر الخيار المختار مصادر الكهرباء ببيتك.',
  'as.impact.currentTitle': 'المزيج المعتاد حالياً',
  'as.impact.currentNote': 'بيت نموذجي ببغداد قبل الطاقة الشمسية — نقطة بداية للتقدير، مو فواتيرك الحقيقية.',
  'as.impact.grid': 'الكهرباء الوطنية',
  'as.impact.generator': 'المولدة',
  'as.impact.solar': 'الطاقة الشمسية',
  'as.impact.projectedTitle': 'ويّا الخيار المختار',
  'as.impact.solarCoverage': 'التغطية الشمسية',
  'as.impact.gridDependency': 'الاعتماد على الوطنية',
  'as.impact.generatorDependency': 'الاعتماد على المولدة',
  'as.impact.batteryBackup': 'خزن البطارية',
  'as.impact.monthlySaving': 'التوفير الشهري',
  'as.impact.annualSaving': 'التوفير السنوي',
  'as.impact.estimatedBadge': 'تقديري',
  'as.impact.assumptionsToggle': 'شلون انحسب هذا؟',
  'as.impact.assumptionsBody':
    'المزيج الأولي يفترض {gridBase}% من الوطنية و{genBase}% من مولدة أهلية. التوفير محسوب على {gridTariff} دينار/kWh للوطنية و{genTariff} دينار/kWh للمولدة، على الجزء اللي نقدّر إن الطاقة الشمسية تغطيه. الفواتير الحقيقية تختلف حسب شريحة التعرفة واشتراك المولدة والجو.',
  'as.impact.unitHours': 'ساعة',
  'as.impact.unitIQD': 'دينار',

  'as.companies.eyebrow': 'شركات موثّقة',
  'as.companies.title': 'شركات تكدر تسعّر هذه المنظومة',
  'as.companies.subtitle': 'بس الشركات اللي تدقّقت رخصتها وسجلها الضريبي ومشاريعها المنجزة. مرتبة حسب تقييمات الزبائن الموثّقة.',
  'as.companies.reviews': '{n} تقييم موثّق',
  'as.companies.noReviews': 'ماكو تقييمات موثّقة بعد',
  'as.companies.view': 'عرض الشركة',
  'as.companies.request': 'اطلب عرض سعر من هذه الشركة',
  'as.companies.empty': 'ماكو شركات موثّقة متاحة حالياً.',
  'as.companies.loading': 'جاري تحميل الشركات…',

  'as.assistant.entry': 'اسأل مساعد UTU',
  'as.assistant.title': 'مساعد UTU',
  'as.assistant.opening': 'هلا! اختار سؤال من الأسئلة الجاهزة — أجاوبك من أرقام تقييمك نفسه.',
  'as.assistant.quickTitle': 'أسئلة سريعة',
  'as.assistant.moreQuestions': 'أسئلة ثانية',
  'as.assistant.note': 'أجوبة جاهزة مبنية على نتيجة حاسبتك. المحادثة الحرة راح تنضاف بتحديث قادم.',
  'as.assistant.close': 'إغلاق المساعد',
  'as.assistant.q.whyThisSystem': 'ليش هذه المنظومة؟',
  'as.assistant.q.whyBattery': 'ليش هذا حجم البطارية؟',
  'as.assistant.q.whyInverter': 'ليش هذا حجم الإنفرتر؟',
  'as.assistant.q.reduceCost': 'أكدر أقلل الكلفة؟',
  'as.assistant.q.addAnotherAC': 'شيصير إذا أضفت سبلت ثاني؟',
  'as.assistant.q.backupHours': 'كم ساعة خزن تعطيني؟',
  'as.assistant.q.whichCompanies': 'يا شركات تكدر تسعّرها؟',
  'as.assistant.a.whyThisSystem':
    'خيار {panelKWp} kWp يغطي تقريباً {coverage}% من استهلاكك اليومي التقديري، ويّا خزن تقريباً {backup} ساعة، بكلفة تقريبية {iqd} دينار.',
  'as.assistant.a.whyBattery':
    'نفترض إن تقريباً {nightShare}% من استهلاكك يكون بالليل. البطارية {batteryKWh} kWh تشيله تقريباً {backup} ساعة. إذا تريد ساعات خزن أقل، تكفيك بطارية أصغر.',
  'as.assistant.a.whyInverter':
    'الإنفرتر {inverterKW} kW يخلي مجال كافي لألواحك ({panelKWp} kWp) وللأجهزة اللي تشتغل بنفس الوقت.',
  'as.assistant.a.reduceCost':
    'إي. الخيار الاقتصادي أرخص تقريباً بـ {savingIQD} دينار (حوالي {iqd} دينار)، بس تغطيته الشمسية أقل (تقريباً {coverage}%) وساعات الخزن أقصر.',
  'as.assistant.a.reduceCostAlready':
    'إنت مختار أرخص خيار أصلاً. حتى تقلل أكثر، نقّص ساعات تشغيل الأجهزة الثقيلة (مثل السبلت) بالحاسبة وأعد الحساب.',
  'as.assistant.a.addAnotherAC':
    'سبلت ثاني نموذجي يزيد استهلاكك اليومي تقريباً {growthPct}%، فراح تحتاج منظومة أكبر من التقدير الحالي ({iqd} دينار). أضفه بالحاسبة حتى يطلعلك الرقم بالضبط.',
  'as.assistant.a.backupHours':
    'تقريباً {backup} ساعة من بطارية {batteryKWh} kWh. الوقت الحقيقي يعتمد على الأجهزة اللي تبقى شغّالة وقت الانقطاع.',
  'as.assistant.a.whichCompanies':
    'أكو {companyCount} شركة موثّقة تكدر تسعّر منظومة حوالي {panelKWp} kWp. موجودة بهذه الصفحة — تكدر تدز طلبك لـ 3 منها كحد أقصى.',
};
