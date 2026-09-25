import type { Localized } from '../i18n/LanguageProvider';

const L = <T,>(en: T, ar: T): Localized<T> => ({ en, ar });

/** The 18 Iraqi governorates, in the order people expect to scan them. */
export const governorates: { id: string; name: Localized<string> }[] = [
  { id: 'baghdad', name: L('Baghdad', 'بغداد') },
  { id: 'basra', name: L('Basra', 'البصرة') },
  { id: 'nineveh', name: L('Nineveh', 'نينوى') },
  { id: 'erbil', name: L('Erbil', 'أربيل') },
  { id: 'sulaymaniyah', name: L('Sulaymaniyah', 'السليمانية') },
  { id: 'duhok', name: L('Duhok', 'دهوك') },
  { id: 'kirkuk', name: L('Kirkuk', 'كركوك') },
  { id: 'najaf', name: L('Najaf', 'النجف') },
  { id: 'karbala', name: L('Karbala', 'كربلاء') },
  { id: 'babil', name: L('Babil', 'بابل') },
  { id: 'anbar', name: L('Anbar', 'الأنبار') },
  { id: 'diyala', name: L('Diyala', 'ديالى') },
  { id: 'dhiqar', name: L('Dhi Qar', 'ذي قار') },
  { id: 'maysan', name: L('Maysan', 'ميسان') },
  { id: 'muthanna', name: L('Muthanna', 'المثنى') },
  { id: 'qadisiyyah', name: L('Qadisiyyah', 'القادسية') },
  { id: 'salahaldin', name: L('Salah al-Din', 'صلاح الدين') },
  { id: 'wasit', name: L('Wasit', 'واسط') },
];

/**
 * Why a company surfaced for this request.
 *
 * A bare list of companies makes the customer do the filtering themselves.
 * Naming the match is the platform earning its place.
 */
export const matchReasons: Record<string, Localized<string>> = {
  rafidain: L(
    'Built 14 systems of this size in Baghdad, all on-grid rooftops',
    'نفّذت 14 منظومة بهذا الحجم في بغداد، كلها على أسطح مربوطة بالشبكة',
  ),
  tigris: L(
    'Strongest on battery storage — 9 hybrid installations in the last year',
    'الأقوى في تخزين البطاريات — 9 تركيبات هجينة خلال السنة الماضية',
  ),
  nahrain: L(
    'Covers the south and quotes on water pumping as well as household load',
    'تغطي الجنوب وتسعّر ضخ المياه إلى جانب أحمال المنزل',
  ),
};

/* ------------------------------------------------------------------ */

export type Quote = {
  companyId: string;
  /** Total price in IQD. */
  total: number;
  panelBrand: string;
  inverterBrand: string;
  battery: Localized<string>;
  capacityKWp: number;
  warranty: Localized<string>;
  installDays: Localized<string>;
  financing: boolean;
};

/**
 * Demo quotes, derived from the requested system size so the comparison is
 * internally consistent rather than three random numbers. In production these
 * arrive from the companies.
 */
export function buildQuotes(systemKWp: number, wantsFinancing: boolean): Quote[] {
  const base = Math.max(systemKWp, 1) * 1_150_000; // ≈ IQD per kWp, supply + install

  return [
    {
      companyId: 'rafidain',
      total: Math.round((base * 1.08) / 50_000) * 50_000,
      panelBrand: 'Jinko Tiger Neo 580 W',
      inverterBrand: 'Huawei SUN2000',
      battery: L('Pylontech 10 kWh', 'بايلونتك 10 kWh'),
      capacityKWp: Math.round(systemKWp * 10) / 10,
      warranty: L('25 yr panels · 10 yr inverter · 5 yr install', '25 سنة ألواح · 10 إنفرتر · 5 تركيب'),
      installDays: L('7 – 10 days', '7 – 10 أيام'),
      financing: wantsFinancing,
    },
    {
      companyId: 'tigris',
      total: Math.round((base * 0.94) / 50_000) * 50_000,
      panelBrand: 'Longi Hi-MO 6 570 W',
      inverterBrand: 'Growatt MOD',
      battery: L('BYD 10.2 kWh', 'بي واي دي 10.2 kWh'),
      capacityKWp: Math.round(systemKWp * 10) / 10,
      warranty: L('25 yr panels · 10 yr inverter · 3 yr install', '25 سنة ألواح · 10 إنفرتر · 3 تركيب'),
      installDays: L('10 – 14 days', '10 – 14 يومًا'),
      financing: false,
    },
    {
      companyId: 'nahrain',
      total: Math.round((base * 1.16) / 50_000) * 50_000,
      panelBrand: 'Trina Vertex S+ 445 W',
      inverterBrand: 'Deye Hybrid',
      battery: L('Deye 12 kWh', 'داي 12 kWh'),
      capacityKWp: Math.round(systemKWp * 1.05 * 10) / 10,
      warranty: L('25 yr panels · 12 yr inverter · 5 yr install', '25 سنة ألواح · 12 إنفرتر · 5 تركيب'),
      installDays: L('5 – 7 days', '5 – 7 أيام'),
      financing: wantsFinancing,
    },
  ];
}

/** IQD with a thousands separator — Latin digits, as in Iraqi price lists. */
export const formatIQD = (n: number) => n.toLocaleString('en-US');
