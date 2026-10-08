import type { IconName } from '../components/icons/Icon';
import type { Localized } from '../i18n/LanguageProvider';
import type { VerificationStatus } from '../components/ui/VerificationBadge';

/**
 * Listing and marketing content, in both languages.
 *
 * Deliberately not lorem ipsum: real Iraqi city and district names, real
 * appliance wattages and plausible system sizes, so the layout is tested
 * against the text lengths it will actually carry. Arabic runs 20–25% longer
 * than English here, which is exactly the pressure the layout needs to survive.
 *
 * Every user-visible string is a `Localized<T>` pair. When this is wired to an
 * API, the shape stays the same — only the source changes.
 */

const L = <T,>(en: T, ar: T): Localized<T> => ({ en, ar });

/* ------------------------------------------------------------------ */

export type Company = {
  id: string;
  status: VerificationStatus;
  rating: number;
  reviews: number;
  featured?: boolean;
  logoUrl?: string;
  name: Localized<string>;
  location: Localized<string>;
  projects: Localized<string>;
  experience: Localized<string>;
  services: Localized<string[]>;
  supportPhone?: string;
};

export const companies: Company[] = [
  {
    id: 'rafidain',
    status: 'verified',
    rating: 4.8,
    reviews: 126,
    featured: true,
    name: L('Rafidain Solar Systems', 'الرافدين للأنظمة الشمسية'),
    location: L('Baghdad · Al-Mansour', 'بغداد · المنصور'),
    projects: L('120+ projects', 'أكثر من 120 مشروعًا'),
    experience: L('9 years', '9 سنوات'),
    services: L(
      ['Residential', 'On-grid', 'Hybrid', 'Maintenance'],
      ['سكني', 'على الشبكة', 'هجين', 'صيانة'],
    ),
  },
  {
    id: 'tigris',
    status: 'verified',
    rating: 4.6,
    reviews: 84,
    name: L('Tigris Energy Works', 'دجلة لأعمال الطاقة'),
    location: L('Baghdad · Al-Karrada', 'بغداد · الكرادة'),
    projects: L('78 projects', '78 مشروعًا'),
    experience: L('6 years', '6 سنوات'),
    services: L(
      ['Commercial', 'Off-grid', 'Battery storage'],
      ['تجاري', 'خارج الشبكة', 'تخزين بطاريات'],
    ),
  },
  {
    id: 'nahrain',
    status: 'pending',
    rating: 4.4,
    reviews: 41,
    name: L('Al-Nahrain Renewables', 'النهرين للطاقة المتجددة'),
    location: L('Basra · Al-Ashar', 'البصرة · العشار'),
    projects: L('35 projects', '35 مشروعًا'),
    experience: L('3 years', '3 سنوات'),
    services: L(['Residential', 'Water pumping'], ['سكني', 'ضخ المياه']),
  },
];

/* ------------------------------------------------------------------ */

export type Project = {
  id: string;
  size: string;
  rating: number;
  tone: 'home' | 'commercial' | 'hybrid';
  installationIcon: IconName;
  status: 'completed' | 'inProgress';
  /** Photograph of the installation. Omit and the card draws `SolarArray` instead. */
  imageUrl?: string;
  title: Localized<string>;
  location: Localized<string>;
  installation: Localized<string>;
  company: Localized<string>;
  description?: Localized<string>;
  batteryKwh?: number | null;
  completedAt?: string | null;
  panelCount?: number | null;
  roofType?: string | null;
  inverterDetails?: string | null;
  annualGenerationKwh?: number | null;
  galleryUrls?: string[];
  testimonial?: string | null;
  clientName?: string | null;
  companyId?: number;
  companyLogoUrl?: string | null;
  companyVerificationStatus?: VerificationStatus;
  verifiedReview?: VerifiedProjectReview | null;
};

export type VerifiedProjectReview = {
  rating: number;
  client_name: string;
  comment: string;
  is_verified: boolean;
};

export const projects: Project[] = [
  {
    id: 'p1',
    size: '8.4 kWp',
    rating: 4.9,
    tone: 'home',
    installationIcon: 'home',
    status: 'completed',
    imageUrl: '/projects/residential-baghdad.jpg',
    title: L('Residential Solar System', 'منظومة شمسية سكنية'),
    location: L('Baghdad · Al-Jadriya', 'بغداد · الجادرية'),
    installation: L('On-grid rooftop', 'على الشبكة — سطح'),
    company: L('Rafidain Solar Systems', 'الرافدين للأنظمة الشمسية'),
  },
  {
    id: 'p2',
    size: '64 kWp',
    rating: 4.7,
    tone: 'commercial',
    installationIcon: 'building',
    status: 'completed',
    imageUrl: '/projects/commercial-erbil.jpg',
    title: L('Commercial Solar Installation', 'تركيب شمسي تجاري'),
    location: L('Erbil · Industrial Zone', 'أربيل · المنطقة الصناعية'),
    installation: L('Flat-roof array', 'مصفوفة سطح مستوٍ'),
    company: L('Tigris Energy Works', 'دجلة لأعمال الطاقة'),
  },
  {
    id: 'p3',
    size: '12.6 kWp',
    rating: 4.8,
    tone: 'hybrid',
    installationIcon: 'battery',
    status: 'completed',
    imageUrl: '/projects/hybrid-basra.jpg',
    title: L('Hybrid Solar System', 'منظومة شمسية هجينة'),
    location: L('Basra · Al-Zubair', 'البصرة · الزبير'),
    installation: L('Hybrid + 20 kWh storage', 'هجين + تخزين 20 kWh'),
    company: L('Al-Nahrain Renewables', 'النهرين للطاقة المتجددة'),
  },
];

/* ------------------------------------------------------------------ */

export type Step = {
  number: string;
  icon: IconName;
  title: Localized<string>;
  description: Localized<string>;
};

export const steps: Step[] = [
  {
    number: '01',
    icon: 'calculator',
    title: L('Enter Your Energy Needs', 'أدخل احتياجك من الطاقة'),
    description: L(
      'List the appliances you run and roughly how long each one is on. No meter reading required.',
      'اذكر الأجهزة التي تشغّلها وكم ساعة تقريبًا يعمل كل واحد. لا تحتاج قراءة عدّاد.',
    ),
  },
  {
    number: '02',
    icon: 'zap',
    title: L('Get a system-size estimate', 'احصل على تقدير لحجم المنظومة'),
    description: L(
      'We turn your loads into a daily figure and size the panels, inverter and battery around it.',
      'نحوّل أحمالك إلى رقم يومي، ونحدّد حوله عدد الألواح وحجم الإنفرتر والبطارية.',
    ),
  },
  {
    number: '03',
    icon: 'users',
    title: L('Compare Solar Companies', 'قارن بين شركات الطاقة'),
    description: L(
      'Compare installers and see whether their business and project evidence has been reviewed.',
      'قارن الشركات وشوف إذا كانت بياناتها وأدلة مشاريعها قيد التحقق أو مكتملة.',
    ),
  },
  {
    number: '04',
    icon: 'file-check',
    title: L('Request Your Solar System', 'اطلب منظومتك'),
    description: L(
      'Send your requirements to the companies you shortlist and compare their quotes in one place.',
      'أرسل متطلباتك إلى الشركات التي اخترتها وقارن عروضها في مكان واحد.',
    ),
  },
];

/* ------------------------------------------------------------------ */

export type TrustPoint = {
  /** Stable across languages, so React keys survive a language switch. */
  id: string;
  icon: IconName;
  title: Localized<string>;
  description: Localized<string>;
};

export const trustPoints: TrustPoint[] = [
  {
    id: 'verified',
    icon: 'shield-check',
    title: L('Every company is verified', 'كل شركة موثّقة'),
    description: L(
      'Companies under review are labeled clearly. The verified badge requires a checked trade licence, tax record and three completed projects.',
      'الشركات قيد التحقق تظهر بشارتها بوضوح. شارة التوثيق تتطلب تدقيق الرخصة والسجل الضريبي وثلاثة مشاريع منجزة.',
    ),
  },
  {
    id: 'history',
    icon: 'solar-panel',
    title: L('Real project history', 'سجل مشاريع حقيقي'),
    description: L(
      'Each listing shows systems the company actually built — size, location and completion date, not a portfolio claim.',
      'كل صفحة تعرض منظومات نفّذتها الشركة فعلًا — الحجم والموقع وتاريخ الإنجاز، لا مجرد ادعاء.',
    ),
  },
  {
    id: 'warranty',
    icon: 'file-check',
    title: L('Warranty terms up front', 'شروط الضمان معلنة مسبقًا'),
    description: L(
      'Panel, inverter, battery and workmanship cover are published before you request a quote, not after you sign.',
      'تغطية الألواح والإنفرتر والبطارية والتركيب منشورة قبل طلب العرض، لا بعد التوقيع.',
    ),
  },
  {
    id: 'ratings',
    icon: 'users',
    title: L('Ratings from real customers', 'تقييمات من عملاء حقيقيين'),
    description: L(
      'Only customers with a completed project on the platform can leave a review, and the project is shown alongside it.',
      'المراجعة متاحة فقط لعميل أنجز مشروعه على المنصة، والمشروع معروض إلى جانبها.',
    ),
  },
];

/* ------------------------------------------------------------------ */

export type Warranty = {
  id: string;
  icon: IconName;
  duration: string;
  component: Localized<string>;
  unit: Localized<string>;
  note: Localized<string>;
};

export const warranties: Warranty[] = [
  {
    id: 'panel',
    icon: 'solar-panel',
    duration: '25',
    component: L('Panel warranty', 'ضمان الألواح'),
    unit: L('years performance', 'سنة أداء'),
    note: L(
      'Linear output guarantee, transferable to the next owner of the property.',
      'ضمان إنتاج خطّي، وقابل للانتقال إلى المالك التالي للعقار.',
    ),
  },
  {
    id: 'inverter',
    icon: 'zap',
    duration: '10',
    component: L('Inverter warranty', 'ضمان الإنفرتر'),
    unit: L('years', 'سنوات'),
    note: L(
      'Covers the unit and firmware support, extendable to 15 years by most brands.',
      'يغطي الجهاز ودعم البرمجية، وقابل للتمديد إلى 15 سنة لدى أغلب العلامات.',
    ),
  },
  {
    id: 'battery',
    icon: 'battery',
    duration: '10',
    component: L('Battery warranty', 'ضمان البطارية'),
    unit: L('years or 6,000 cycles', 'سنوات أو 6,000 دورة'),
    note: L(
      'Whichever comes first, with a guaranteed 70% remaining capacity at end of term.',
      'أيهما أسبق، مع ضمان بقاء 70% من السعة في نهاية المدة.',
    ),
  },
  {
    id: 'installation',
    icon: 'wrench',
    duration: '5',
    component: L('Installation warranty', 'ضمان التركيب'),
    unit: L('years workmanship', 'سنوات على التنفيذ'),
    note: L(
      'Mounting, cabling and waterproofing, covered by the installing company.',
      'التثبيت والتمديدات والعزل المائي، بتغطية من الشركة المنفّذة.',
    ),
  },
];

/* ------------------------------------------------------------------ */

export type Review = {
  id: string;
  rating: number;
  initials: Localized<string>;
  name: Localized<string>;
  role: Localized<string>;
  body: Localized<string>;
  projectType: Localized<string>;
  isVerified?: boolean;
  companyName?: Localized<string>;
  projectTitle?: Localized<string>;
  location?: Localized<string>;
  systemKWp?: number;
  communicationRating?: number;
  workQualityRating?: number;
  createdAt?: string;
};

export const reviews: Review[] = [
  {
    id: 'r1',
    rating: 5,
    initials: L('YA', 'ي أ'),
    name: L('Yousif A.', 'يوسف أ.'),
    role: L('Homeowner · Baghdad', 'صاحب منزل · بغداد'),
    body: L(
      'The load calculator got our system size right on the first try. Two companies quoted within a day and the warranty terms were laid out clearly before we signed.',
      'حاسبة الأحمال حدّدت حجم منظومتنا بشكل صحيح من أول محاولة. وصلتنا عروض من شركتين خلال يوم، وشروط الضمان كانت واضحة قبل التوقيع.',
    ),
    projectType: L('Residential · 8.4 kWp', 'سكني · 8.4 kWp'),
  },
  {
    id: 'r2',
    rating: 5,
    initials: L('ZH', 'ز ح'),
    name: L('Zainab H.', 'زينب ح.'),
    role: L('Bakery owner · Erbil', 'صاحبة مخبز · أربيل'),
    body: L(
      'I needed the ovens and the cold room to survive the outages. Being able to filter for companies that had actually done commercial work saved me weeks of phone calls.',
      'كنت أحتاج أن تصمد الأفران وغرفة التبريد أمام الانقطاعات. إمكانية تصفية الشركات التي نفّذت أعمالًا تجارية فعلًا وفّرت عليّ أسابيع من الاتصالات.',
    ),
    projectType: L('Commercial · 64 kWp', 'تجاري · 64 kWp'),
  },
  {
    id: 'r3',
    rating: 4,
    initials: L('MK', 'م ك'),
    name: L('Mustafa K.', 'مصطفى ك.'),
    role: L('Farm owner · Basra', 'صاحب مزرعة · البصرة'),
    body: L(
      'The pump sizing was slightly conservative, but the installer adjusted it on site and explained why. Good to see the project history before choosing.',
      'تحديد حجم المضخة كان متحفّظًا قليلًا، لكن المنفّذ عدّله في الموقع وشرح السبب. من الجيد الاطلاع على سجل المشاريع قبل الاختيار.',
    ),
    projectType: L('Hybrid · 12.6 kWp', 'هجين · 12.6 kWp'),
  },
];

/* ------------------------------------------------------------------ */

export type Appliance = {
  id: string;
  watts: number;
  units: number;
  hours: number;
  icon: IconName;
  name: Localized<string>;
};

/** Starting configuration for the demo calculator — a 3-bedroom Baghdad home. */
export const defaultAppliances: Appliance[] = [
  { id: 'ac', watts: 1500, units: 2, hours: 6, icon: 'air-conditioner', name: L('Air Conditioner', 'مكيّف هواء') },
  { id: 'fridge', watts: 250, units: 1, hours: 24, icon: 'fridge', name: L('Refrigerator', 'ثلاجة') },
  { id: 'lights', watts: 12, units: 18, hours: 6, icon: 'lightbulb', name: L('LED Lighting', 'إنارة LED') },
  { id: 'tv', watts: 120, units: 2, hours: 5, icon: 'tv', name: L('Television', 'تلفزيون') },
  { id: 'pump', watts: 750, units: 1, hours: 2, icon: 'water-pump', name: L('Water Pump', 'مضخة ماء') },
];

/** Offered by the "add another appliance" control. */
export const extraAppliances: Appliance[] = [
  { id: 'washer', watts: 500, units: 1, hours: 1, icon: 'washing-machine', name: L('Washing Machine', 'غسالة') },
];

export const navLinks = [
  { key: 'nav.home', href: '#top' },
  { key: 'nav.companies', href: '#companies' },
  { key: 'nav.projects', href: '#projects' },
  { key: 'nav.how', href: '#how-it-works' },
] as const;
