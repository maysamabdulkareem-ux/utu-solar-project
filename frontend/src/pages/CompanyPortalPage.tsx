import { useEffect, useState, type FormEvent } from 'react';
import {
  api,
  ApiError,
  hasActiveDeposit,
  isActiveDeposit,
  type AdminRevenueEntry,
  type ApiCompany,
  type ApiProject,
  type CompanyPortalRequest,
  type PolicyReport,
  type ProjectStatus,
  type VerificationDocument,
  type VerificationDocumentType,
} from '../api/client';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { Input } from '../components/ui/Input';
import { RequestChat } from '../components/rfq/RequestChat';
import { MarkViewedOnScreen } from '../components/rfq/MarkViewedOnScreen';
import {
  IRAQI_MOBILE_PATTERN,
  isValidIraqiMobile,
  isValidSupportPhone,
  SUPPORT_PHONE_PATTERN,
} from '../lib/supportPhone';
import { Textarea } from '../components/ui/Textarea';
import { FlowHeader } from '../components/layout/FlowHeader';
import { useLanguage } from '../i18n/LanguageProvider';
import { invalidateCompanies } from '../api/useCompanies';
import { useAuth } from '../state/AuthContext';

type QuoteFields = {
  total: string;
  panelCost: string;
  inverterCost: string;
  batteryCost: string;
  installationCost: string;
  capacity: string;
  panel: string;
  inverter: string;
  battery: string;
  warranty: string;
  days: string;
  valid: string;
  financing: boolean;
  downPayment: string;
  installmentMonths: string;
  monthlyInstallment: string;
  autoCalculateInstallment: boolean;
  greenInitiativeSupported: boolean;
  notes: string;
};

type CompletionFields = {
  title: string;
  description: string;
  installationType: string;
};

const TOKEN_KEY = 'utu-company-token';
type PortalMode = 'login' | 'register' | 'admin' | 'forgot' | 'reset';
type VerificationDocumentFiles = Partial<Record<VerificationDocumentType, File>>;

const IDENTITY_DOCUMENT_TYPES = [
  'national_id',
  'syndicate_card',
  'chamber_id',
  'office_permit',
] as const satisfies readonly VerificationDocumentType[];

const DOCUMENT_LABELS: Record<VerificationDocumentType, { en: string; ar: string }> = {
  national_id: { en: 'National ID', ar: 'البطاقة الوطنية' },
  syndicate_card: { en: 'Engineering Syndicate Card', ar: 'هوية نقابة المهندسين' },
  chamber_id: { en: 'Chamber of Commerce ID', ar: 'هوية غرفة التجارة' },
  office_permit: { en: 'Office Permit', ar: 'إجازة مكتب' },
  business_register: { en: 'Official Business Register / License', ar: 'السجل التجاري الرسمي / إجازة الشركة' },
  project_proof: { en: 'Completed Project Proof', ar: 'إثبات المشاريع المنجزة' },
  license: { en: 'Legacy Business License', ar: 'إجازة النشاط السابقة' },
  tax: { en: 'Legacy Tax Registration', ar: 'التسجيل الضريبي السابق' },
};

function verificationTier(status: string | undefined): 0 | 1 | 2 {
  if (status === 'verified') return 2;
  if (status === 'identity_verified') return 1;
  return 0;
}

function readPasswordResetToken() {
  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get('reset_token') ?? '';
}

function CompanyPasswordInput({
  label,
  name,
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  autoComplete: string;
  minLength: number;
}) {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const showLabel = lang === 'ar' ? 'إظهار كلمة المرور' : 'Show password';
  const hideLabel = lang === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password';

  return (
    <Input
      label={label}
      name={name}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      required
      minLength={minLength}
      endAdornment={(
        <button
          type="button"
          title={visible ? hideLabel : showLabel}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="grid h-9 w-9 place-items-center rounded text-content-tertiary hover:bg-bg-subtle hover:text-content-primary"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
        </button>
      )}
    />
  );
}

function readCompanyToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function clearCompanyToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The in-memory session is still cleared when storage is unavailable.
  }
}

export function CompanyPortalPage() {
  const { lang } = useLanguage();
  const { user, token: authToken, logout: logoutAuth } = useAuth();
  const ar = lang === 'ar';
  const [resetToken, setResetToken] = useState(readPasswordResetToken);
  const [mode, setMode] = useState<PortalMode>(() => (
    readPasswordResetToken() ? 'reset' : user?.role === 'admin' ? 'admin' : 'login'
  ));
  const [token, setToken] = useState(() => (
    user?.role === 'admin' ? '' : user?.role === 'company' ? authToken || readCompanyToken() : readCompanyToken()
  ));
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [requests, setRequests] = useState<CompanyPortalRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quotes, setQuotes] = useState<Record<string, Partial<QuoteFields>>>({});
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'open' | 'quoted' | 'selected'>('all');
  const [completionForms, setCompletionForms] = useState<Record<string, Partial<CompletionFields>>>({});
  const [completionErrors, setCompletionErrors] = useState<Record<string, string>>({});
  const [pendingCompanies, setPendingCompanies] = useState<ApiCompany[]>([]);
  const [adminProjects, setAdminProjects] = useState<ApiProject[]>([]);
  const [adminRevenue, setAdminRevenue] = useState<AdminRevenueEntry[]>([]);
  const [policyReports, setPolicyReports] = useState<PolicyReport[]>([]);
  const [previewDocument, setPreviewDocument] = useState<VerificationDocument | null>(null);
  const [reviewChecks, setReviewChecks] = useState<Record<number, {
    identity: boolean;
    business: boolean;
    projectProof: boolean;
    license: boolean;
    tax: boolean;
    projects: boolean;
  }>>({});
  const [verificationForm, setVerificationForm] = useState({
    projects: '0',
  });
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocumentFiles>({});
  const [identityDocumentType, setIdentityDocumentType] = useState<(typeof IDENTITY_DOCUMENT_TYPES)[number]>('national_id');

  useEffect(() => {
    if (user?.role === 'company') setToken(authToken);
    if (user?.role === 'admin') {
      setToken('');
      setMode('admin');
    }
  }, [authToken, user?.role]);

  const text = {
    title: user?.role === 'admin' ? (ar ? 'لوحة إدارة المنصة' : 'Platform administration') : (ar ? 'بوابة شركات الطاقة' : 'Solar company portal'),
    subtitle: user?.role === 'admin'
      ? (ar ? 'راجع طلبات توثيق الشركات وأدر المشاريع باستخدام صلاحية حساب المسؤول.' : 'Review company verification applications and manage projects using your administrator account.')
      : (ar ? 'سجّل شركتك وتابع طلبات عروض الأسعار المرسلة إليك.' : 'Register your company and respond to quote requests sent to you.'),
    login: ar ? 'تسجيل الدخول' : 'Sign in',
    register: ar ? 'تسجيل شركة جديدة' : 'Register a company',
    name: ar ? 'اسم الشركة' : 'Company name',
    founded: ar ? 'سنة التأسيس' : 'Year founded',
    phone: ar ? 'رقم الموبايل الرئيسي' : 'Primary Mobile',
    supportPhone: ar ? 'رقم الدعم السريع للشركة' : 'Company Support Hotline',
    supportPhoneOptional: ar ? 'هاتف الدعم / مركز الاتصال (اختياري)' : 'Support / Call Center Phone (Optional)',
    supportPhoneHelp: ar ? 'مطلوب. أدخل رقم هاتف أو رمز خط الدعم المباشر.' : 'Required. Enter a direct support phone number or hotline code.',
    supportPhoneHelpOptional: ar ? 'اختياري. يقبل موبايل عراقي أو رقم دعم قصير أو خط أرضي.' : 'Optional. Accepts an Iraqi mobile, short support code, or landline.',
    phoneRequiredMessage: ar ? 'أدخل رقم موبايل عراقي يبدأ بـ 075 أو 077 أو 078.' : 'Enter an Iraqi mobile number starting with 075, 077, or 078.',
    supportPhoneRequiredMessage: ar ? 'أدخل رقم الدعم السريع للشركة.' : 'Enter the company support hotline.',
    supportPhoneInvalidMessage: ar ? 'أدخل رقم دعم صالحاً.' : 'Enter a valid support hotline.',
    saveContactPhones: ar ? 'حفظ أرقام التواصل' : 'Save contact numbers',
    supportPhoneSaved: ar ? 'تم حفظ أرقام التواصل.' : 'Company contact numbers saved.',
    email: ar ? 'البريد الإلكتروني' : 'Email address',
    password: ar ? 'كلمة المرور (10 أحرف على الأقل)' : 'Password (at least 10 characters)',
    address: ar ? 'المحافظة والعنوان' : 'Governorate and address',
    license: ar ? 'رقم رخصة النشاط' : 'Business license number',
    tax: ar ? 'رقم التسجيل الضريبي' : 'Tax registration number',
    loginAction: ar ? 'دخول' : 'Sign in',
    registerAction: ar ? 'إرسال طلب التسجيل' : 'Submit registration',
    pending: ar
      ? 'حساب شركتك بانتظار التوثيق. سجّل الدخول وارفع وثيقة هوية أو مكتب لفتح تقديم العروض.'
      : 'Your company is pending verification. Sign in and upload an identity or office document to unlock quoting.',
    inbox: ar ? 'طلبات عروض الأسعار' : 'Quote requests',
    empty: ar ? 'ماكو طلبات مرسلة لشركتك حالياً.' : 'There are no requests for your company yet.',
    logout: ar ? 'تسجيل الخروج' : 'Sign out',
    system: ar ? 'المنظومة المطلوبة' : 'Requested system',
    customer: ar ? 'الزبون' : 'Customer',
    requestLocation: ar ? 'الموقع' : 'Location',
    requestSystemType: ar ? 'نوع النظام' : 'System type',
    requestBudget: ar ? 'الميزانية' : 'Budget',
    greenBudget: ar ? 'ميزانية المبادرة التقديرية' : 'Green Initiative estimated budget',
    requestTimeline: ar ? 'موعد التنفيذ المطلوب' : 'Requested timeline',
    requestNotes: ar ? 'ملاحظات إضافية' : 'Additional notes',
    requestFinancing: ar ? 'يفضل خيارات التقسيط' : 'Financing preferred',
    greenBadge: ar ? 'مبادرة خضراء / Green Initiative' : 'Green Initiative / مبادرة خضراء',
    greenSupport: ar ? 'ندعم توفير مستندات المبادرة الخضراء' : 'Supports Green Initiative documentation',
    greenSupportHelp: ar ? 'أكّد هذا فقط إذا كانت شركتك تستطيع تجهيز المستندات المطلوبة للطلب.' : 'Select only if your company can provide the documentation required for the application.',
    yes: ar ? 'نعم' : 'Yes',
    no: ar ? 'لا' : 'No',
    amount: ar ? 'السعر الكلي بالدينار العراقي' : 'Total price in IQD',
    capacity: ar ? 'القدرة المعروضة (kWp)' : 'Quoted capacity (kWp)',
    panel: ar ? 'ماركة الألواح' : 'Panel brand',
    inverter: ar ? 'ماركة الإنفرتر' : 'Inverter brand',
    battery: ar ? 'ماركة البطارية' : 'Battery brand',
    warranty: ar ? 'تفاصيل الضمان' : 'Warranty terms',
    days: ar ? 'أيام التركيب' : 'Installation days',
    valid: ar ? 'صلاحية العرض بالأيام' : 'Quote validity in days',
    financing: ar ? 'نوفر تقسيط' : 'Financing available',
    financingHelp: ar ? 'تقسيط مباشر من الشركة. حدد الدفعة الأولى والمدة؛ سيحسب النظام القسط الشهري تلقائياً.' : 'Direct installments from your company. Set the down payment and term; the monthly amount is calculated automatically.',
    downPayment: ar ? 'الدفعة الأولى (د.ع)' : 'Down Payment (IQD)',
    installmentMonths: ar ? 'مدة السداد' : 'Repayment Period',
    monthlyInstallment: ar ? 'القسط الشهري (د.ع)' : 'Monthly Installment (IQD)',
    months: ar ? 'أشهر' : 'months',
    useCalculatedInstallment: ar ? 'استخدم القسط المحسوب' : 'Use calculated installment',
    invalidPaymentSchedule: ar ? 'لازم تكون الدفعة الأولى أقل من السعر الكلي.' : 'The down payment must be less than the total price.',
    notes: ar ? 'ملاحظات ضمن العرض' : 'Quote notes',
    send: ar ? 'إرسال العرض' : 'Send quote',
    sent: ar ? 'تم حفظ العرض وإرساله للزبون.' : 'Quote saved and sent to the customer.',
    completionTitle: ar ? 'تسجيل اكتمال التركيب' : 'Record completed installation',
    installationTitle: ar ? 'اسم المشروع' : 'Project title',
    installationType: ar ? 'نوع التركيب المنفذ' : 'Installation type',
    installationDescription: ar ? 'ملخص التنفيذ' : 'Installation summary',
    completeInstallation: ar ? 'تأكيد اكتمال التركيب' : 'Mark installation completed',
    completionInvalid: ar
      ? 'أدخل اسم المشروع ونوع التركيب بحرفين على الأقل لكل حقل قبل التسجيل.'
      : 'Enter a project title and installation type with at least 2 characters each.',
    waitingForAcceptance: ar
      ? 'أرسلت العرض. انتظر موافقة الزبون على عرضك قبل تسجيل إكمال التركيب.'
      : 'Quote sent. Wait for the customer to accept your offer before recording the installation as complete.',
    installationCompleted: ar ? 'تم تسجيل التركيب المنجز. يمكن للزبون الآن تقييم المشروع.' : 'Installation recorded. The customer can now review the project.',
    projectCompleted: ar ? 'التركيب مكتمل' : 'Installation completed',
    switchLogin: ar ? 'عندك حساب؟ سجّل الدخول' : 'Already registered? Sign in',
    switchRegister: ar ? 'شركة جديدة؟ سجّل شركتك' : 'New company? Register here',
    loadQueue: ar ? 'عرض طلبات التسجيل' : 'Load applications',
    adminAccessNotice: ar
      ? 'أنت مسجل الدخول بحساب مسؤول. تُحمى إجراءات الإدارة بصلاحية حسابك ولا تحتاج إلى إدخال رمز سري منفصل.'
      : 'You are signed in with an administrator account. Admin actions use your account permissions; no separate secret token is needed.',
    portfolio: ar ? 'مشاريع المحفظة' : 'Portfolio projects',
    revenueTitle: ar ? 'حساب العمولة والمنصة' : 'Commission & Platform Revenue',
    noRevenue: ar ? 'لا توجد عروض مقبولة أو مشاريع منجزة مسجلة بعد.' : 'No accepted quotes or completed projects have been recorded yet.',
    agreedPrice: ar ? 'السعر المتفق عليه' : 'Total agreed price',
    commissionFee: ar ? 'عمولة المنصة (٥٪)' : 'Platform commission (5%)',
    revenueStatus: ar ? 'حالة الدفع والعمولة' : 'Payment & commission status',
    projectTitle: ar ? 'اسم المشروع' : 'Project title',
    acceptedRevenue: ar ? 'مقبول' : 'Accepted',
    completedRevenue: ar ? 'مكتمل' : 'Completed',
    paymentTracking: ar ? 'دفعة العربون' : 'Deposit payment',
    transactionId: ar ? 'رقم المعاملة' : 'Transaction ID',
    commissionCollected: ar ? 'عربون تجريبي — لم يُحصَّل أي مبلغ' : 'Demo deposit — nothing collected',
    commissionPending: ar ? 'بانتظار الدفع' : 'Awaiting deposit',
    refundedStatus: ar ? 'تم إرجاع العربون' : 'Refunded',
    refundDeposit: ar ? 'إرجاع العربون' : 'Refund deposit',
    refundComplete: ar ? 'تم تسجيل إرجاع العربون التجريبي.' : 'Mock deposit refund recorded.',
    refundFailed: ar ? 'تعذر تسجيل الإرجاع.' : 'Could not record the refund.',
    depositConfirmed: ar ? 'تم تأكيد العربون. بإمكانكم البدء بتنفيذ المشروع.' : 'The deposit is confirmed. You may begin the project.',
    depositValue: ar ? 'العربون' : 'Deposit',
    balanceValue: ar ? 'المتبقي' : 'Balance remaining',
    simulatedPaymentNote: ar ? 'الدفع محاكاة تجريبية ولا يتصل بمصرف أو مزود دفع.' : 'Payment is simulated and does not connect to a bank or payment provider.',
    reportsTitle: ar ? 'إدارة البلاغات والمخالفات' : 'Policy Reports & Chat Violations',
    noReports: ar ? 'لا توجد بلاغات أو مخالفات مسجلة.' : 'No policy reports or chat violations have been reported.',
    reportPending: ar ? 'قيد الانتظار' : 'Pending',
    reportResolved: ar ? 'تم الحل' : 'Resolved',
    reportDismissed: ar ? 'مرفوض' : 'Dismissed',
    resolveReport: ar ? 'حل البلاغ' : 'Resolve',
    dismissReport: ar ? 'استبعاد' : 'Dismiss',
    viewDocument: ar ? 'معاينة الوثيقة' : 'View Document',
    documentUnavailable: ar ? 'لم تُرفق وثيقة' : 'No document uploaded',
    uploadDocument: ar ? 'إرفاق ملف PDF أو صورة (حد أقصى 3 ميغابايت)' : 'Attach PDF or image (3 MB maximum)',
    closePreview: ar ? 'إغلاق المعاينة' : 'Close preview',
    projectStatus: ar ? 'حالة المشروع' : 'Project status',
    inProgressStatus: ar ? 'قيد التنفيذ' : 'In progress',
    completedStatus: ar ? 'منجز' : 'Completed',
    featuredStatus: ar ? 'مميز' : 'Featured',
    projectStatusHelp: ar
      ? 'قيد التنفيذ: العمل مستمر. منجز: اكتمل التركيب. مميز: إبراز المشروع في واجهة الموقع.'
      : 'In progress: work is ongoing. Completed: installation is finished. Featured: highlight this project on the site.',
    noPortfolioProjects: ar ? 'لا توجد مشاريع مسجلة.' : 'No projects have been recorded.',
    approve: ar ? 'موافقة' : 'Approve',
    reject: ar ? 'رفض' : 'Reject',
    noApplications: ar ? 'ماكو طلبات تسجيل معلّقة.' : 'No pending company applications.',
    panelCost: ar ? 'كلفة الألواح (د.ع)' : 'Solar panels cost (IQD)',
    inverterCost: ar ? 'كلفة الإنفرتر (د.ع)' : 'Inverter cost (IQD)',
    batteryCost: ar ? 'كلفة البطارية (د.ع)' : 'Battery cost (IQD)',
    installationCost: ar ? 'كلفة التنصيب والتشغيل (د.ع)' : 'Installation and commissioning cost (IQD)',
    itemizedTotal: ar ? 'مجموع البنود' : 'Itemized total',
    itemizedMismatch: ar ? 'لازم يساوي السعر الكلي مجموع بنود التسعير.' : 'The total price must equal the sum of the itemized costs.',
    verificationRequired: ar ? 'المستوى 0 لا يتيح إرسال العروض. ارفع وثيقة هوية أو مكتب وانتظر مراجعة الإدارة.' : 'Tier 0 cannot submit quotes. Upload an identity or office document and wait for admin review.',
    phoneAfterDeposit: ar ? 'رقم الزبون يظهر بعد دفع العربون' : 'Phone shown after the customer pays the deposit',
    quoteLocked: ar ? 'قبل الزبون عرضك، لذلك لا يمكن تعديل السعر أو الشروط.' : 'The customer accepted your quote, so the price and terms can no longer be changed.',
    pendingRequestPrompt: ar
      ? 'لقد استلمت طلب عرض سعر مباشر من زبون! يرجى رفع وثائق الإثبات لتفعيل حسابتك بالكامل وتوقيع العقود.'
      : 'You have received a direct quote request from a customer! Upload verification documents to fully activate your account and become eligible to sign contracts.',
    tier0: ar ? 'المستوى 0 — غير موثّق' : 'Tier 0 — Unverified',
    tier1: ar ? 'المستوى 1 — هوية / مكتب معتمد · شارة فضية' : 'Tier 1 — Identity / Office Verified · Silver Badge',
    tier2: ar ? 'المستوى 2 — شركة موثوقة رسمياً · شارة ذهبية' : 'Tier 2 — Officially Verified Company · Gold Badge',
    tier0Prompt: ar ? 'ارفع البطاقة الوطنية أو هوية نقابة المهندسين أو غرفة التجارة أو إجازة المكتب. تفعيل تقديم العروض يتطلب مراجعة الإدارة.' : 'Upload a National ID, Engineering Syndicate Card, Chamber of Commerce ID, or Office Permit. Admin review is required to unlock quoting.',
    tier1Prompt: ar ? 'تم اعتماد الهوية. يمكنك تقديم العروض. ارفع السجل التجاري الرسمي وإثبات المشاريع المنجزة للترقية إلى الشارة الذهبية.' : 'Identity approved. You can submit quotes. Upload the official business register and completed-project evidence to request Gold verification.',
    tier2Prompt: ar ? 'شركتك موثوقة رسمياً وتحمل الشارة الذهبية.' : 'Your company is officially verified with the Gold badge.',
    identityDocument: ar ? 'وثيقة الهوية أو المكتب' : 'Identity or office document',
    identityDocumentChecked: ar ? 'تمت مراجعة وثيقة الهوية / المكتب' : 'Identity / office document reviewed',
    businessRegister: ar ? 'السجل التجاري / إجازة رسمية' : 'Official Business Register / License',
    projectProof: ar ? 'إثبات المشاريع المنجزة' : 'Proof of completed projects',
    completedProjectsCount: ar ? 'مشاريع منجزة مسجلة' : 'Recorded completed projects',
    silverApprove: ar ? 'اعتماد الشارة الفضية' : 'Approve Silver Badge',
    goldApprove: ar ? 'اعتماد الشارة الذهبية' : 'Approve Gold Badge',
    noDocuments: ar ? 'لم تُرفع وثائق تحقق بعد.' : 'No verification documents have been uploaded.',
    identityReviewRequired: ar ? 'ارفع وثيقة هوية أو مكتب وراجعها لاعتماد المستوى الأول.' : 'Upload and review an identity or office document for Tier 1 approval.',
    goldReviewRequired: ar ? 'للمستوى الثاني: سجل تجاري، إثبات مشاريع، و3 مشاريع منجزة على الأقل.' : 'Tier 2 requires a business register, project evidence, and at least 3 completed projects.',
    identityFileRequired: ar ? 'اختر وثيقة هوية أو مكتب قبل إرسال الطلب.' : 'Choose an identity or office document before submitting.',
    goldFilesRequired: ar ? 'أرفق السجل التجاري وإثبات المشاريع الثلاثة على الأقل.' : 'Attach the business register and proof of at least 3 completed projects.',
    rejectedTier: ar ? 'رفض الطلب' : 'Reject application',
    searchRequests: ar ? 'ابحث برقم الطلب أو المحافظة أو المنطقة' : 'Search request, governorate, or district',
    filterRequests: ar ? 'حالة الطلب' : 'Request status',
    allRequests: ar ? 'كل الطلبات' : 'All requests',
    openRequests: ar ? 'بانتظار عرض' : 'Awaiting quote',
    quotedRequests: ar ? 'تم إرسال عرض' : 'Quote submitted',
    selectedRequests: ar ? 'تم اختيار الشركة' : 'Company selected',
    noMatchingRequests: ar ? 'ماكو طلبات تطابق البحث أو التصفية.' : 'No requests match these filters.',
    optional: ar ? 'اختياري' : 'Optional',
    forgotPassword: ar ? 'هل نسيت كلمة المرور؟' : 'Forgot password?',
    recoveryTitle: ar ? 'استعادة كلمة المرور' : 'Password recovery',
    newPassword: ar ? 'كلمة المرور الجديدة' : 'New password',
    confirmPassword: ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password',
    sendResetLink: ar ? 'إرسال رابط الاستعادة' : 'Send reset link',
    resetPassword: ar ? 'تغيير كلمة المرور' : 'Update password',
    backToSignIn: ar ? 'العودة لتسجيل الدخول' : 'Back to sign in',
    resetRequested: ar
      ? 'إذا كان البريد مرتبطاً بحساب شركة، راح توصلك رسالة برابط صالح لمدة 30 دقيقة.'
      : 'If this email belongs to a company account, a reset link will arrive and expire in 30 minutes.',
    passwordResetUnavailable: ar
      ? 'استعادة كلمة المرور غير مفعّلة حالياً لأن خدمة البريد غير مهيأة. عنوان بريدك مو سبب المشكلة.'
      : 'Password recovery is unavailable because the email service is not configured. Your email address is not the problem.',
    invalidCredentials: ar
      ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
      : 'Email or password is incorrect.',
    resetComplete: ar ? 'تم تغيير كلمة المرور. سجّل الدخول بكلمتك الجديدة.' : 'Password updated. Sign in with your new password.',
    passwordsMismatch: ar ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.',
    invalidResetLink: ar ? 'رابط الاستعادة غير صالح أو منتهي. اطلب رابطاً جديداً.' : 'This reset link is missing or expired. Request a new one.',
    projects: ar ? 'عدد المشاريع المنجزة' : 'Completed projects',
    verificationRule: ar
      ? 'التوثيق متدرج: المستوى الأول بهوية أو وثيقة مكتب لفتح تقديم العروض؛ المستوى الثاني يتطلب سجلاً تجارياً وإثبات 3 مشاريع منجزة.'
      : 'Verification has two tiers: Tier 1 accepts an identity or office document and unlocks quotes; Tier 2 requires an official business register and proof of 3 completed projects.',
    checkLicense: ar ? 'تم تدقيق الرخصة الأصلية' : 'Original license checked',
    checkTax: ar ? 'تم تدقيق السجل الضريبي الأصلي' : 'Original tax record checked',
    checkProjects: ar ? 'تم تدقيق إثبات 3 مشاريع منجزة أو أكثر' : 'Evidence for 3+ completed projects checked',
    needLicense: ar ? 'أدخل رقم رخصة النشاط.' : 'Enter the business license number.',
    needTax: ar ? 'أدخل رقم التسجيل الضريبي.' : 'Enter the tax registration number.',
    needThreeProjects: ar ? 'سجّل 3 مشاريع منجزة على الأقل.' : 'Record at least 3 completed projects.',
    verifyLicense: ar ? 'أكّد تدقيق الرخصة الأصلية.' : 'Confirm that the original license was checked.',
    verifyTax: ar ? 'أكّد تدقيق السجل الضريبي الأصلي.' : 'Confirm that the original tax record was checked.',
    verifyProjects: ar ? 'أكّد تدقيق إثبات المشاريع المنجزة.' : 'Confirm that evidence for completed projects was checked.',
    applicationSaved: ar ? 'تم إرسال بيانات التحقق للإدارة.' : 'Verification details sent for admin review.',
    saveApplication: ar ? 'إرسال بيانات التحقق' : 'Submit verification details',
    refreshFailed: ar ? 'تعذر تحديث الطلبات حالياً. حاول مرة ثانية بعد قليل.' : 'Could not refresh requests right now. Please try again shortly.',
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let pollingTimer: number | undefined;
    api.companyProfile(token)
      .then(async (profile) => {
        if (cancelled) return;
        setCompany(profile);
        setPrimaryPhone(profile.phone ?? '');
        setSupportPhone(profile.support_phone ?? '');
        setVerificationForm({
          projects: String(profile.projects_count ?? 0),
        });
        // Customer requests open only after identity verification (tier 1+).
        if (verificationTier(profile.verification_status) < 1) {
          setRequests([]);
          return;
        }
        const inbox = await api.companyInbox(token);
        if (cancelled) return;
        setRequests(inbox);
        pollingTimer = window.setInterval(() => {
          api.companyInbox(token)
            .then((updatedInbox) => {
              if (!cancelled) setRequests(updatedInbox);
            })
            .catch((cause) => {
              if (!cancelled) {
                console.warn('[utu] could not refresh company requests:', cause);
                setError(text.refreshFailed);
              }
            });
        }, 30_000);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 401) {
          clearCompanyToken();
          setToken('');
          if (user?.role === 'company' && token === authToken) logoutAuth();
          setError(ar ? 'انتهت الجلسة. سجّل الدخول مرة ثانية.' : 'Your session expired. Please sign in again.');
          return;
        }
        console.warn('[utu] could not load company portal data:', cause);
        setError(text.refreshFailed);
      });
    return () => {
      cancelled = true;
      if (pollingTimer !== undefined) window.clearInterval(pollingTimer);
    };
  }, [token, ar, authToken, logoutAuth, user?.role]);

  useEffect(() => {
    const navigateToNotificationTarget = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      if (params.get('verification') === '1') {
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLElement>('[data-notification-verification]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return;
      }

      const requestId = params.get('requestId');
      const projectId = params.get('projectId');
      const targetRequest = requests.find((request) => (
        (requestId && request.group_id === requestId)
        || (projectId && request.companies.some((assignment) =>
          assignment.completed_projects?.some((project) => String(project.id) === projectId),
        ))
      ));
      if (!targetRequest) return;
      if (requestSearch || requestStatusFilter !== 'all') {
        setRequestSearch('');
        setRequestStatusFilter('all');
        return;
      }

      window.requestAnimationFrame(() => {
        const target = params.get('payment') === '1'
          ? document.querySelector<HTMLElement>(`[data-notification-payment="${targetRequest.group_id}"]`)
          : Array.from(document.querySelectorAll<HTMLElement>('[data-notification-request-id]'))
            .find((element) => element.dataset.notificationRequestId === targetRequest.group_id);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    navigateToNotificationTarget();
    window.addEventListener('hashchange', navigateToNotificationTarget);
    return () => window.removeEventListener('hashchange', navigateToNotificationTarget);
  }, [requestSearch, requestStatusFilter, requests]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'forgot') {
        await api.requestCompanyPasswordReset(String(form.get('email')));
        setMode('login');
        setNotice(text.resetRequested);
      } else if (mode === 'reset') {
        const newPassword = String(form.get('new_password'));
        if (!resetToken) throw new Error(text.invalidResetLink);
        if (newPassword !== String(form.get('confirm_password'))) {
          throw new Error(text.passwordsMismatch);
        }
        await api.confirmCompanyPasswordReset(resetToken, newPassword);
        clearCompanyToken();
        setToken('');
        setResetToken('');
        window.location.hash = '#/company';
        setMode('login');
        setNotice(text.resetComplete);
      } else if (mode === 'register') {
        const foundedYear = String(form.get('founded_year') ?? '').trim();
        const phone = String(form.get('phone') ?? '').trim();
        const supportPhone = String(form.get('support_phone') ?? '').trim();
        if (!isValidIraqiMobile(phone)) {
          setError(text.phoneRequiredMessage);
          return;
        }
        if (!supportPhone) {
          setError(text.supportPhoneRequiredMessage);
          return;
        }
        if (!isValidSupportPhone(supportPhone)) {
          setError(text.supportPhoneInvalidMessage);
          return;
        }
        const address = String(form.get('address') ?? '').trim();
        const license = String(form.get('business_license_number') ?? '').trim();
        const taxNumber = String(form.get('tax_registration_number') ?? '').trim();
        const projects = String(form.get('projects_count') ?? '').trim();
        await api.registerCompany({
          name: String(form.get('name')),
          email: String(form.get('email')),
          password: String(form.get('password')),
          founded_year: foundedYear ? Number(foundedYear) : undefined,
          phone,
          support_phone: supportPhone,
          address: address || undefined,
          business_license_number: license || undefined,
          tax_registration_number: taxNumber || undefined,
          projects_count: projects ? Number(projects) : 0,
        });
        setMode('login');
        setNotice(text.pending);
      } else {
        const result = await api.loginCompany(String(form.get('email')), String(form.get('password')));
        try {
          localStorage.setItem(TOKEN_KEY, result.access_token);
        } catch {
          // The session remains active until this page is closed.
        }
        setCompany(result.company);
        setToken(result.access_token);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Request failed';
      setError(
        message === 'Company password recovery email is not configured'
          ? text.passwordResetUnavailable
          : message === 'Email or password is incorrect'
            ? text.invalidCredentials
            : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const setQuoteField = (groupId: string, key: keyof QuoteFields, value: string | boolean) => {
  setQuotes((current) => {
    const previous = current[groupId] ?? {};
    if (key === 'downPayment' || key === 'installmentMonths' || key === 'total') {
      return {
        ...current,
        [groupId]: {
          ...previous,
          [key]: value,
          monthlyInstallment: '',
          autoCalculateInstallment: true,
        },
      };
    }
    if (key === 'monthlyInstallment') {
      return {
        ...current,
        [groupId]: {
          ...previous,
          monthlyInstallment: String(value),
          autoCalculateInstallment: false,
        },
      };
    }
    return { ...current, [groupId]: { ...previous, [key]: value } };
  });
  };

  const submitQuote = async (event: FormEvent<HTMLFormElement>, request: CompanyPortalRequest) => {
    event.preventDefault();
    if (!company) return;
    const values = quotes[request.group_id] ?? {};
    const existingQuote = request.companies[0]?.quote;
    const totalIqd = Number(values.total ?? existingQuote?.total_iqd ?? 0);
    const financing = values.financing ?? existingQuote?.financing ?? false;
    const downPaymentIqd = Number(
      values.downPayment ?? existingQuote?.down_payment_iqd ?? 0,
    );
    const installmentMonths = Number(
      values.installmentMonths ?? existingQuote?.installment_months ?? 12,
    );
    const calculatedMonthlyInstallment = totalIqd > downPaymentIqd && installmentMonths > 0
      ? Math.max(1, Math.round((totalIqd - downPaymentIqd) / installmentMonths))
      : 0;
    const monthlyInstallmentIqd = values.autoCalculateInstallment === false
      ? Number(values.monthlyInstallment || existingQuote?.monthly_installment_iqd || calculatedMonthlyInstallment)
      : calculatedMonthlyInstallment;
    const itemized = {
      panel_iqd: Number(values.panelCost ?? existingQuote?.panel_iqd ?? 0),
      inverter_iqd: Number(values.inverterCost ?? existingQuote?.inverter_iqd ?? 0),
      battery_iqd: Number(values.batteryCost ?? existingQuote?.battery_iqd ?? 0),
      installation_iqd: Number(values.installationCost ?? existingQuote?.installation_iqd ?? 0),
    };
    const itemizedTotal = Object.values(itemized).reduce((total, amount) => total + amount, 0);
    if (itemizedTotal <= 0 || itemizedTotal !== totalIqd) {
      setError(text.itemizedMismatch);
      return;
    }
    if (financing && (downPaymentIqd < 0 || downPaymentIqd >= totalIqd)) {
      setError(text.invalidPaymentSchedule);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const quote = await api.submitCompanyQuote(token, request.group_id, company.id, {
        total_iqd: totalIqd,
        ...itemized,
        capacity_kwp: Number(values.capacity ?? existingQuote?.capacity_kwp ?? request.system_kwp),
        panel_brand: values.panel ?? existingQuote?.panel_brand ?? '',
        inverter_brand: values.inverter ?? existingQuote?.inverter_brand ?? '',
        battery_brand: values.battery ?? existingQuote?.battery_brand ?? '',
        warranty: values.warranty ?? existingQuote?.warranty ?? '',
        install_days: Number(values.days ?? existingQuote?.install_days ?? 0),
        valid_days: Number(values.valid ?? existingQuote?.valid_days ?? 14),
        financing,
        ...(financing ? {
          down_payment_iqd: downPaymentIqd,
          installment_months: installmentMonths,
          monthly_installment_iqd: monthlyInstallmentIqd,
        } : {}),
        green_initiative_supported: values.greenInitiativeSupported ?? existingQuote?.green_initiative_supported ?? false,
        notes: values.notes ?? existingQuote?.notes ?? '',
      });
      setRequests((current) => current.map((item) => item.group_id !== request.group_id ? item : {
        ...item,
        companies: item.companies.map((recipient) => ({ ...recipient, status: 'quoted', quote })),
      }));
      setNotice(text.sent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const setCompletionField = (groupId: string, key: keyof CompletionFields, value: string) => {
    setCompletionForms((current) => ({
      ...current,
      [groupId]: { ...current[groupId], [key]: value },
    }));
    setCompletionErrors((current) => ({ ...current, [groupId]: '' }));
  };

  const completeInstallation = async (
    event: FormEvent<HTMLFormElement>,
    request: CompanyPortalRequest,
  ) => {
    event.preventDefault();
    const values = completionForms[request.group_id] ?? {};
    if ((values.title ?? '').trim().length < 2 || (values.installationType ?? '').trim().length < 2) {
      setCompletionErrors((current) => ({
        ...current,
        [request.group_id]: text.completionInvalid,
      }));
      return;
    }
    setCompletionErrors((current) => ({ ...current, [request.group_id]: '' }));
    setBusy(true);
    setError('');
    try {
      const project = await api.completeCompanyInstallation(token, request.group_id, {
        title: values.title ?? '',
        description: values.description ?? '',
        installation_type: values.installationType ?? '',
      });
      setRequests((current) => current.map((item) => item.group_id !== request.group_id ? item : {
        ...item,
        companies: item.companies.map((assignment) => ({
          ...assignment,
          completed_projects: [...(assignment.completed_projects ?? []), {
            id: project.id,
            title: project.title,
            company_id: project.company_id,
            company_name: project.company.name,
            system_kwp: project.system_kwp,
            battery_kwh: project.battery_kwh,
            location_governorate: project.location_governorate,
            location_district: project.location_district,
            completed_at: project.completed_at,
            reviewed: false,
          }],
        })),
      }));
      setNotice(text.installationCompleted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const loadAdminQueue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const [companies, projects, revenue, reports] = await Promise.all([
        api.adminPendingCompanies(),
        api.listProjects(),
        api.adminRevenue(),
        api.adminPolicyReports(),
      ]);
      setPendingCompanies(companies);
      setAdminProjects(projects);
      setAdminRevenue(revenue);
      setPolicyReports(reports);
      setReviewChecks({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const openVerificationDocument = async (
    companyId: number,
    documentType: VerificationDocument['document_type'],
  ) => {
    setBusy(true);
    setError('');
    try {
      setPreviewDocument(await api.adminVerificationDocument(companyId, documentType));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load verification document');
    } finally {
      setBusy(false);
    }
  };

  const updateReportStatus = async (
    reportId: number,
    status: Exclude<PolicyReport['status'], 'pending'>,
  ) => {
    setBusy(true);
    setError('');
    try {
      const updatedReport = await api.updatePolicyReportStatus(reportId, status);
      setPolicyReports((reports) => reports.map((report) => (
        report.id === reportId ? updatedReport : report
      )));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update report status');
    } finally {
      setBusy(false);
    }
  };

  const refundAdminDeposit = async (entry: AdminRevenueEntry) => {
    if (entry.assignment_id == null || !isActiveDeposit(entry.payment_status)) return;
    setBusy(true);
    setError('');
    try {
      await api.refundDepositPayment(entry.assignment_id);
      setAdminRevenue((rows) => rows.map((row) => (
        row.assignment_id === entry.assignment_id
          ? { ...row, payment_status: 'refunded', commission_status: 'reversed' }
          : row
      )));
      setNotice(text.refundComplete);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.refundFailed);
    } finally {
      setBusy(false);
    }
  };

  const saveProjectStatus = async (projectId: number, status: ProjectStatus) => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateProjectStatus(projectId, status);
      setAdminProjects((current) => current.map((project) => project.id === projectId ? updated : project));
      setNotice(ar ? 'تم تحديث حالة المشروع.' : 'Project status updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const saveVerificationApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tier = verificationTier(company?.verification_status);
    if (tier === 0 && !verificationDocuments[identityDocumentType]) {
      setError(text.identityFileRequired);
      return;
    }
    if (tier === 1 && (
      !verificationDocuments.business_register
      || !verificationDocuments.project_proof
      || Number(verificationForm.projects) < 3
    )) {
      setError(text.goldFilesRequired);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.updateCompanyVerification(token, {
        projects_count: verificationForm.projects ? Number(verificationForm.projects) : undefined,
      });
      for (const [documentType, file] of Object.entries(verificationDocuments) as [VerificationDocumentType, File][]) {
        await api.uploadVerificationDocument(token, documentType, file);
      }
      setVerificationDocuments({});
      setCompany((current) => current
        ? { ...current, verification_status: verificationTier(current.verification_status) > 0 ? current.verification_status : 'pending' }
        : current);
      setNotice(text.applicationSaved);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const saveProfileContacts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await api.updateCompanyProfileContacts(token, {
        phone: primaryPhone.trim() || null,
        support_phone: supportPhone.trim() || null,
      });
      setPrimaryPhone(saved.phone ?? '');
      setSupportPhone(saved.support_phone ?? '');
      setCompany((current) => current ? {
        ...current,
        phone: saved.phone,
        support_phone: saved.support_phone,
      } : current);
      setNotice(text.supportPhoneSaved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
    if (user?.role === 'company' && token === authToken) logoutAuth();
    else await api.logoutCompany(token);
  } catch {
    // Clear the browser session even if the server is temporarily offline.
  } finally {
    clearCompanyToken();
    setToken('');
    setCompany(null);
    setRequests([]);
    setMode('login');
    setError('');
    setNotice('');
    setBusy(false);
  }
  };

  const reviewCompany = async (id: number, decision: 'identity_verified' | 'verified' | 'rejected') => {
    setBusy(true);
    setError('');
    try {
      const checks = reviewChecks[id] ?? {
        identity: false,
        business: false,
        projectProof: false,
        license: false,
        tax: false,
        projects: false,
      };
      await api.reviewCompany(id, {
        decision,
        identity_document_checked: checks.identity,
        business_document_checked: checks.business,
        project_evidence_checked: checks.projectProof,
        license_checked: checks.license,
        tax_record_checked: checks.tax,
        projects_checked: checks.projects,
      });
      setPendingCompanies((items) => items.filter((item) => item.id !== id));
      if (decision === 'verified') invalidateCompanies();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const visibleRequests = requests.filter((request) => {
    const companyStatus = request.companies[0]?.status ?? 'sent';
    const statusMatches = requestStatusFilter === 'all'
      || (requestStatusFilter === 'open' && (companyStatus === 'sent' || companyStatus === 'viewed'))
      || companyStatus === requestStatusFilter;
    const search = requestSearch.trim().toLocaleLowerCase();
    const location = [request.details.governorate, request.details.district].filter(Boolean).join(' ');
    const searchMatches = !search
      || `${request.group_id} ${request.customer_name} ${location}`.toLocaleLowerCase().includes(search);
    return statusMatches && searchMatches;
  });

  return (
    <>
      <FlowHeader />
      <main id="main" className="min-h-[70vh] bg-bg-page pb-20">
        <div className="container-page max-w-4xl">
          <header className="border-b border-line-subtle py-8">
            <h1 className="text-h2 text-content-primary">{text.title}</h1>
            <p className="mt-2 text-body text-content-secondary">{text.subtitle}</p>
          </header>

          {error && <p role="alert" className="mt-6 rounded-lg border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-body-sm text-[var(--status-danger)]">{error}</p>}
          {notice && <p role="status" className="mt-6 rounded-lg border border-[var(--status-success)] bg-[var(--status-success-bg)] px-4 py-3 text-body-sm text-[var(--status-success)]">{notice}</p>}

          {!token || mode === 'reset' ? (
            <section className="mt-8 max-w-2xl">
              {user?.role !== 'admin' && mode !== 'forgot' && mode !== 'reset' && (
                <div className="mb-6 flex flex-wrap gap-3 border-b border-line-subtle">
                  {(['login', 'register'] as const).map((tab) => (
                    <button key={tab} type="button" className={`border-b-2 px-3 py-3 text-label ${mode === tab ? 'border-line-brand text-content-primary' : 'border-transparent text-content-secondary'}`} onClick={() => setMode(tab)}>
                      {tab === 'login' ? text.login : text.register}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'admin' ? <>
                <p className="mb-5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">{text.adminAccessNotice}</p>
                <form className="flex flex-wrap items-end gap-4" onSubmit={loadAdminQueue}>
                  <Button type="submit" loading={busy}>{text.loadQueue}</Button>
                </form>
                <p className="mt-5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">{text.verificationRule}</p>
                {pendingCompanies.length === 0 ? <p className="mt-5 text-body-sm text-content-secondary">{text.noApplications}</p> : <ul className="mt-5 divide-y divide-line-subtle border-y border-line-subtle">
                  {pendingCompanies.map((item) => {
                    const checks = reviewChecks[item.id] ?? {
                      identity: false,
                      business: false,
                      projectProof: false,
                      license: false,
                      tax: false,
                      projects: false,
                    };
                    const documentTypes = item.verification_documents ?? [];
                    const hasIdentityDocument = IDENTITY_DOCUMENT_TYPES.some((type) => documentTypes.includes(type));
                    const hasBusinessDocument = documentTypes.includes('business_register') || documentTypes.includes('license');
                    const hasProjectProof = documentTypes.includes('project_proof');
                    const hasLegacyDocuments = Boolean(item.business_license_number?.trim() && item.tax_registration_number?.trim());
                    const canApproveSilver = hasIdentityDocument && checks.identity;
                    const canApproveGold = (
                      hasBusinessDocument
                      && hasProjectProof
                      && (item.completed_project_count ?? 0) >= 3
                      && item.projects_count >= 3
                      && checks.business
                      && checks.projectProof
                    ) || (
                      hasLegacyDocuments
                      && item.projects_count >= 3
                      && checks.license
                      && checks.tax
                      && checks.projects
                    );
                    const setCheck = (
                      key: 'identity' | 'business' | 'projectProof' | 'license' | 'tax' | 'projects',
                      value: boolean,
                    ) => setReviewChecks((current) => ({
                      ...current,
                      [item.id]: {
                        ...(current[item.id] ?? {
                          identity: false,
                          business: false,
                          projectProof: false,
                          license: false,
                          tax: false,
                          projects: false,
                        }),
                        [key]: value,
                      },
                    }));
                    return <li key={item.id} className="py-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="text-label text-content-primary">{item.name}</h2>
                          <p className="mt-1 text-body-sm text-content-secondary">{item.email} · {item.phone} · {item.address}</p>
                          <p className="mt-2 text-body-sm text-content-secondary">{text.completedProjectsCount}: {item.completed_project_count}</p>
                          <p className="mt-1 text-body-xs text-content-tertiary">{item.verification_status === 'identity_verified' ? text.tier1 : text.tier0}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="md" loading={busy} disabled={!canApproveSilver} onClick={() => reviewCompany(item.id, 'identity_verified')}>{text.silverApprove}</Button>
                          <Button size="md" loading={busy} disabled={!canApproveGold} onClick={() => reviewCompany(item.id, 'verified')}>{text.goldApprove}</Button>
                          <Button size="md" variant="secondary" loading={busy} onClick={() => reviewCompany(item.id, 'rejected')}>{text.rejectedTier}</Button>
                        </div>
                      </div>
                      <div className="mt-4 rounded-md border border-line-subtle bg-bg-subtle p-4">
                        <h3 className="text-label text-content-primary">{ar ? 'وثيقة التوثيق والإثبات' : 'Verification Document Review'}</h3>
                        {documentTypes.length === 0 ? (
                          <p className="mt-2 text-body-sm text-content-secondary">{text.noDocuments}</p>
                        ) : (
                          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {documentTypes.map((documentType) => (
                              <li key={documentType} className="flex items-center justify-between gap-3 text-body-sm">
                                <span className="text-content-primary">{DOCUMENT_LABELS[documentType]?.[ar ? 'ar' : 'en'] ?? documentType}</span>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void openVerificationDocument(item.id, documentType)}
                                  className="shrink-0 text-label-sm text-content-brand underline disabled:opacity-60"
                                >
                                  {text.viewDocument}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="mt-4 flex flex-col gap-2.5 text-body-sm text-content-secondary">
                        <label className="flex items-start gap-2"><input type="checkbox" checked={checks.identity} onChange={(event) => setCheck('identity', event.target.checked)} />{text.identityDocumentChecked}</label>
                        <label className="flex items-start gap-2"><input type="checkbox" checked={checks.business} onChange={(event) => setCheck('business', event.target.checked)} />{ar ? 'تمت مراجعة السجل التجاري الرسمي' : 'Official business register reviewed'}</label>
                        <label className="flex items-start gap-2"><input type="checkbox" checked={checks.projectProof} onChange={(event) => setCheck('projectProof', event.target.checked)} />{ar ? 'تمت مراجعة إثبات المشاريع المنجزة' : 'Completed-project evidence reviewed'}</label>
                        {hasLegacyDocuments && (
                          <>
                            <label className="flex items-start gap-2"><input type="checkbox" checked={checks.license} onChange={(event) => setCheck('license', event.target.checked)} />{text.checkLicense}</label>
                            <label className="flex items-start gap-2"><input type="checkbox" checked={checks.tax} onChange={(event) => setCheck('tax', event.target.checked)} />{text.checkTax}</label>
                            <label className="flex items-start gap-2"><input type="checkbox" checked={checks.projects} onChange={(event) => setCheck('projects', event.target.checked)} />{text.checkProjects}</label>
                          </>
                        )}
                      </div>
                      <p className="mt-3 rounded-md bg-bg-subtle px-3 py-2 text-body-sm text-content-secondary">
                        {!canApproveSilver && !canApproveGold
                          ? `${text.identityReviewRequired} ${text.goldReviewRequired}`
                          : !canApproveSilver ? text.identityReviewRequired : !canApproveGold ? text.goldReviewRequired : ''}
                      </p>
                    </li>;
                  })}
                </ul>}
                <section className="mt-10">
                  <h2 className="text-h3 text-content-primary">{text.portfolio}</h2>
                  {adminProjects.length === 0 ? (
                    <p className="mt-4 border-y border-line-subtle py-5 text-body-sm text-content-secondary">{text.noPortfolioProjects}</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-line-subtle border-y border-line-subtle">
                      {adminProjects.map((project) => (
                        <li key={project.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <h3 className="text-label text-content-primary">{project.title}</h3>
                            <p className="mt-1 text-body-sm text-content-secondary">
                              {project.company.name} · {project.location_governorate}, {project.location_district}
                            </p>
                          </div>
                          <label className="flex items-center gap-3 text-label-sm text-content-secondary">
                            <span className="grid gap-1">
                              <span>{text.projectStatus}</span>
                              <span className="max-w-md text-body-xs text-content-tertiary">{text.projectStatusHelp}</span>
                            </span>
                            <select
                              aria-label={`${project.title} ${text.projectStatus}`}
                              value={project.status}
                              disabled={busy}
                              onChange={(event) => void saveProjectStatus(project.id, event.target.value as ProjectStatus)}
                              className="platform-select sm:w-auto sm:min-w-[12rem]"
                            >
                              <option value="in_progress">{text.inProgressStatus}</option>
                              <option value="completed">{text.completedStatus}</option>
                              <option value="featured">{text.featuredStatus}</option>
                            </select>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="mt-10">
                  <h2 className="text-h3 text-content-primary">{text.revenueTitle}</h2>
                  {adminRevenue.length === 0 ? (
                    <p className="mt-4 border-y border-line-subtle py-5 text-body-sm text-content-secondary">{text.noRevenue}</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <p className="mb-3 text-label-sm text-content-tertiary">{text.simulatedPaymentNote}</p>
                      <table className="w-full min-w-[62rem] border-y border-line-subtle text-start text-body-sm">
                        <thead>
                          <tr className="border-b border-line-subtle text-content-secondary">
                            <th scope="col" className="py-3 pe-4 font-medium">{text.name}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{text.projectTitle}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{text.agreedPrice}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{text.commissionFee}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{text.paymentTracking}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{text.transactionId}</th>
                            <th scope="col" className="py-3 font-medium">{text.revenueStatus}</th>
                            <th scope="col" className="py-3 font-medium">{text.refundDeposit}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminRevenue.map((entry) => (
                            <tr key={entry.project_id > 0 ? `project-${entry.project_id}` : `quote-${entry.assignment_id}`} className="border-b border-line-subtle last:border-0">
                              <td className="py-3 pe-4 text-content-primary">{entry.company_name}</td>
                              <td className="py-3 pe-4 text-content-primary">{entry.project_title}</td>
                              <td className="numeric py-3 pe-4 text-content-primary">
                                {entry.total_agreed_price_iqd.toLocaleString('en-US')} IQD
                              </td>
                              <td className="numeric py-3 pe-4 text-content-primary">{entry.commission_fee_iqd.toLocaleString('en-US')} IQD</td>
                              <td className="numeric py-3 pe-4 text-content-primary">
                                {entry.deposit_iqd != null ? `${entry.deposit_iqd.toLocaleString('en-US')} IQD` : '—'}
                              </td>
                              <td className="py-3 pe-4 text-content-secondary">{entry.transaction_id ?? '—'}</td>
                              <td className="py-3 pe-4 text-content-secondary">
                                {isActiveDeposit(entry.payment_status)
                                  ? text.commissionCollected
                                  : entry.payment_status === 'refunded'
                                    ? text.refundedStatus
                                    : text.commissionPending}
                              </td>
                              <td className="py-3">
                                {isActiveDeposit(entry.payment_status) && entry.assignment_id != null ? (
                                  <Button variant="secondary" size="md" disabled={busy} onClick={() => { void refundAdminDeposit(entry); }}>
                                    {text.refundDeposit}
                                  </Button>
                                ) : entry.payment_status === 'refunded' ? text.refundedStatus : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section className="mt-10">
                  <h2 className="text-h3 text-content-primary">{text.reportsTitle}</h2>
                  {policyReports.length === 0 ? (
                    <p className="mt-4 border-y border-line-subtle py-5 text-body-sm text-content-secondary">{text.noReports}</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[42rem] border-y border-line-subtle text-start text-body-sm">
                        <thead>
                          <tr className="border-b border-line-subtle text-content-secondary">
                            <th scope="col" className="py-3 pe-4 font-medium">{ar ? 'البلاغ' : 'Report'}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{ar ? 'التفاصيل' : 'Details'}</th>
                            <th scope="col" className="py-3 pe-4 font-medium">{text.revenueStatus}</th>
                            <th scope="col" className="py-3 font-medium">{ar ? 'الإجراء' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {policyReports.map((report) => (
                            <tr key={report.id} className="border-b border-line-subtle last:border-0">
                              <td className="py-3 pe-4 align-top text-content-primary">
                                {report.subject}
                              </td>
                              <td className="max-w-sm whitespace-pre-wrap py-3 pe-4 align-top text-content-secondary">{report.description}</td>
                              <td className="py-3 pe-4 align-top">
                                <span className="rounded-full border border-line-subtle bg-bg-subtle px-2.5 py-1 text-body-xs text-content-secondary">
                                  {report.status === 'pending' ? text.reportPending : report.status === 'resolved' ? text.reportResolved : text.reportDismissed}
                                </span>
                              </td>
                              <td className="py-3 align-top">
                                {report.status === 'pending' && (
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="md" loading={busy} onClick={() => void updateReportStatus(report.id, 'resolved')}>{text.resolveReport}</Button>
                                    <Button size="md" variant="secondary" loading={busy} onClick={() => void updateReportStatus(report.id, 'dismissed')}>{text.dismissReport}</Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </> : mode === 'forgot' || mode === 'reset' ? <>
                <h2 className="mb-5 text-h3 text-content-primary">{text.recoveryTitle}</h2>
                {!resetToken && mode === 'reset' && (
                  <p role="alert" className="mb-4 text-body-sm text-[var(--status-danger)]">{text.invalidResetLink}</p>
                )}
                <form className="grid gap-5" onSubmit={handleAuth}>
                  {mode === 'forgot' ? (
                    <Input label={text.email} name="email" type="email" autoComplete="email" required />
                  ) : <>
                    <CompanyPasswordInput label={text.newPassword} name="new_password" autoComplete="new-password" minLength={10} />
                    <CompanyPasswordInput label={text.confirmPassword} name="confirm_password" autoComplete="new-password" minLength={10} />
                  </>}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" loading={busy} disabled={mode === 'reset' && !resetToken}>
                      {mode === 'forgot' ? text.sendResetLink : text.resetPassword}
                    </Button>
                    <button type="button" className="text-label-sm text-content-brand underline" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>
                      {text.backToSignIn}
                    </button>
                  </div>
                </form>
              </> : <>
              {mode === 'register' && <p className="mb-5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">{text.verificationRule}</p>}
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleAuth}>
                {mode === 'register' && <>
                  <Input label={text.name} name="name" autoComplete="organization" required minLength={2} />
                  <Input label={text.founded} name="founded_year" type="number" min="1900" max={new Date().getFullYear()} optional optionalLabel={text.optional} />
                  <Input label={ar ? 'رقم الموبايل العراقي' : 'Iraqi Mobile Phone'} name="phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} pattern={IRAQI_MOBILE_PATTERN} placeholder="077 / 078 / 075 XXXXXXXX" title={text.phoneRequiredMessage} required />
                  <Input label={text.supportPhone} name="support_phone" type="tel" inputMode="tel" autoComplete="off" maxLength={11} pattern={SUPPORT_PHONE_PATTERN} placeholder="07XXXXXXXXX or 6060" title={text.supportPhoneHelp} hint={text.supportPhoneHelp} required />
                  <Input label={text.address} name="address" autoComplete="street-address" minLength={2} optional optionalLabel={text.optional} />
                  <Input label={text.license} name="business_license_number" minLength={2} optional optionalLabel={text.optional} />
                  <Input label={text.tax} name="tax_registration_number" minLength={2} optional optionalLabel={text.optional} />
                  <Input label={text.projects} name="projects_count" type="number" min="0" max="100000" optional optionalLabel={text.optional} />
                </>}
                <Input label={text.email} name="email" type="email" autoComplete="email" required />
                <CompanyPasswordInput
                  label={text.password}
                  name="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'login' ? 1 : 10}
                />
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <Button type="submit" loading={busy}>{mode === 'login' ? text.loginAction : text.registerAction}</Button>
                  <button type="button" className="text-label-sm text-content-brand underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); }}>
                    {mode === 'login' ? text.switchRegister : text.switchLogin}
                  </button>
                  {mode === 'login' && (
                    <button type="button" className="text-label-sm text-content-brand underline" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>
                      {text.forgotPassword}
                    </button>
                  )}
                </div>
              </form>
              </>}
            </section>
          ) : (
            <section className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-subtle pb-5">
                <div>
                  <h2 className="text-h3 text-content-primary">{company?.name}</h2>
                  <p className="mt-1 text-body-sm text-content-secondary">
                    {verificationTier(company?.verification_status) === 2
                      ? text.tier2
                      : verificationTier(company?.verification_status) === 1
                        ? text.tier1
                        : text.tier0}
                  </p>
                </div>
                <Button variant="secondary" loading={busy} onClick={() => { void logout(); }}>{text.logout}</Button>
              </div>

              <form className="mt-6 grid gap-4 rounded-lg border border-line-subtle bg-bg-subtle p-4 sm:grid-cols-2" onSubmit={saveProfileContacts}>
                <div>
                  <Input
                    label={text.phone}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={11}
                    pattern="07[0-9]{9}"
                    placeholder="07XXXXXXXXX"
                    title={ar ? '11 رقم يبدأ بـ 07' : '11 digits starting with 07'}
                    value={primaryPhone}
                    onChange={(event) => setPrimaryPhone(event.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label={text.supportPhoneOptional}
                    name="support_phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={11}
                    pattern={SUPPORT_PHONE_PATTERN}
                    placeholder="e.g., 07XXXXXXXXX or 6060"
                    title={ar ? 'موبايل عراقي أو رقم دعم من 3 إلى 6 أرقام أو خط أرضي' : 'Iraqi mobile, 3–6 digit support code, or landline'}
                    value={supportPhone}
                    onChange={(event) => setSupportPhone(event.target.value)}
                  />
                  <p className="mt-1 text-body-xs text-content-tertiary">{text.supportPhoneHelpOptional}</p>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" loading={busy}>{text.saveContactPhones}</Button>
                </div>
              </form>

              {verificationTier(company?.verification_status) < 2 && (
                <p className="mt-5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">
                  {verificationTier(company?.verification_status) === 0 ? text.tier0Prompt : text.tier1Prompt}
                </p>
              )}
              <h2 className="mt-7 text-h3 text-content-primary">{text.inbox}</h2>
              {verificationTier(company?.verification_status) < 2 && <form data-notification-verification className="mt-5 grid gap-4 border-y border-line-subtle py-5 sm:grid-cols-2" onSubmit={saveVerificationApplication}>
                <p className="text-body-sm text-content-secondary sm:col-span-2">{text.verificationRule}</p>
                {verificationTier(company?.verification_status) === 0 && (
                  <>
                    <label className="grid gap-1.5 text-label-sm text-content-secondary">
                      <span>{text.identityDocument}</span>
                      <select
                        aria-label={text.identityDocument}
                        value={identityDocumentType}
                        onChange={(event) => setIdentityDocumentType(event.target.value as typeof identityDocumentType)}
                        className="platform-select"
                      >
                        {IDENTITY_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{DOCUMENT_LABELS[type][ar ? 'ar' : 'en']}</option>)}
                      </select>
                      <input aria-label={`${text.identityDocument} ${text.uploadDocument}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setVerificationDocuments((current) => ({ ...current, [identityDocumentType]: event.target.files?.[0] }))} className="min-h-11 rounded-md border border-line bg-bg-surface px-3 py-2 text-body-sm text-content-primary" />
                    </label>
                  </>
                )}
                {verificationTier(company?.verification_status) === 1 && (
                  <>
                    <label className="grid gap-1.5 text-label-sm text-content-secondary">
                      <span>{DOCUMENT_LABELS.business_register[ar ? 'ar' : 'en']}</span>
                      <input aria-label={`${text.businessRegister} ${text.uploadDocument}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setVerificationDocuments((current) => ({ ...current, business_register: event.target.files?.[0] }))} className="min-h-11 rounded-md border border-line bg-bg-surface px-3 py-2 text-body-sm text-content-primary" />
                    </label>
                    <label className="grid gap-1.5 text-label-sm text-content-secondary">
                      <span>{DOCUMENT_LABELS.project_proof[ar ? 'ar' : 'en']}</span>
                      <input aria-label={`${text.projectProof} ${text.uploadDocument}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setVerificationDocuments((current) => ({ ...current, project_proof: event.target.files?.[0] }))} className="min-h-11 rounded-md border border-line bg-bg-surface px-3 py-2 text-body-sm text-content-primary" />
                    </label>
                    <Input label={text.projects} name="projects_count" type="number" min="3" max="100000" required value={verificationForm.projects} onChange={(event) => setVerificationForm((current) => ({ ...current, projects: event.target.value }))} />
                  </>
                )}
                <div className="sm:col-span-2"><Button type="submit" loading={busy}>{text.saveApplication}</Button></div>
              </form>}
              {verificationTier(company?.verification_status) === 2 && (
                <p className="mt-5 rounded-lg border border-[var(--status-success)] bg-[var(--status-success-bg)] px-4 py-3 text-body-sm text-[var(--status-success)]">{text.tier2Prompt}</p>
              )}
              {requests.length > 0 && (
                <div className="mt-5 grid gap-4 rounded-lg border border-line-subtle bg-bg-subtle p-4 sm:grid-cols-2">
                  <Input
                    label={text.searchRequests}
                    name="request-search"
                    type="search"
                    value={requestSearch}
                    onChange={(event) => setRequestSearch(event.target.value)}
                  />
                  <label className="grid gap-1.5 text-label-sm text-content-secondary">
                    <span>{text.filterRequests}</span>
                    <select
                      value={requestStatusFilter}
                      onChange={(event) => setRequestStatusFilter(event.target.value as typeof requestStatusFilter)}
                      className="platform-select"
                    >
                      <option value="all">{text.allRequests}</option>
                      <option value="open">{text.openRequests}</option>
                      <option value="quoted">{text.quotedRequests}</option>
                      <option value="selected">{text.selectedRequests}</option>
                    </select>
                  </label>
                </div>
              )}
              {requests.length === 0 ? <p className="mt-4 border-y border-line-subtle py-8 text-body text-content-secondary">{text.empty}</p> : (
                visibleRequests.length === 0
                  ? <p role="status" className="mt-4 border-y border-line-subtle py-8 text-body text-content-secondary">{text.noMatchingRequests}</p>
                  : <ul className="mt-5 flex flex-col gap-6">
                  {visibleRequests.map((request) => {
                    const quote = request.companies[0]?.quote;
                    const assignmentStatus = request.companies[0]?.status ?? 'sent';
                    const depositPayment = request.companies[0]?.payment;
                    const values = quotes[request.group_id] ?? {};
                    const completedProject = request.companies[0]?.completed_projects?.[0];
                    const completionValues = completionForms[request.group_id] ?? {};
                    const quotedTotal = Number(values.total ?? quote?.total_iqd ?? 0);
                    const itemizedTotal = Number(values.panelCost ?? quote?.panel_iqd ?? 0)
                      + Number(values.inverterCost ?? quote?.inverter_iqd ?? 0)
                      + Number(values.batteryCost ?? quote?.battery_iqd ?? 0)
                      + Number(values.installationCost ?? quote?.installation_iqd ?? 0);
                    return <li
                      key={request.group_id}
                      data-notification-request-id={request.group_id}
                      className="border-y border-line-subtle py-6"
                    >
                      <MarkViewedOnScreen
                        enabled={assignmentStatus === 'sent' && Boolean(token)}
                        onViewed={() => {
                          void api.markRequestViewed(token, request.group_id).then(() => {
                            setRequests((current) => current.map((item) => (
                              item.group_id === request.group_id
                                ? { ...item, companies: item.companies.map((entry) => (entry.status === 'sent' ? { ...entry, status: 'viewed' } : entry)) }
                                : item
                            )));
                          }).catch(() => {
                            // Not critical: the request simply stays "sent" until the next view.
                          });
                        }}
                      />
                      <div className="flex flex-wrap justify-between gap-3">
                        <h3 className="text-h4 text-content-primary">{request.group_id}</h3>
                        <span className="text-label-sm text-content-tertiary">{request.companies[0]?.status}</span>
                      </div>
                      {request.is_green_initiative && (
                        <span className="mt-2 inline-flex rounded-full border border-line-brand bg-[var(--brand-subtle)] px-3 py-1 text-label-sm text-content-primary">
                          {text.greenBadge}
                        </span>
                      )}
                      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-body-sm">
                        <div><dt className="text-content-tertiary">{text.customer}</dt><dd className="text-content-primary">{request.customer_name} · {request.customer_phone ?? <span className="text-content-tertiary">{text.phoneAfterDeposit}</span>}</dd></div>
                        <div><dt className="text-content-tertiary">{text.system}</dt><dd className="numeric text-content-primary">{request.system_kwp} kWp · {request.battery_kwh} kWh · {request.panel_count} panels</dd></div>
                        {request.details.governorate && <div><dt className="text-content-tertiary">{text.requestLocation}</dt><dd className="text-content-primary">{[request.details.governorate, request.details.district].filter(Boolean).join(' · ')}</dd></div>}
                        {request.details.systemType && <div><dt className="text-content-tertiary">{text.requestSystemType}</dt><dd className="text-content-primary">{request.details.systemType}</dd></div>}
                        {request.details.budget && <div><dt className="text-content-tertiary">{text.requestBudget}</dt><dd className="numeric text-content-primary">{request.details.budget}</dd></div>}
                        {request.is_green_initiative && request.green_initiative_budget_iqd && (
                          <div>
                            <dt className="text-content-tertiary">{text.greenBudget}</dt>
                            <dd className="numeric text-content-primary">
                              {request.green_initiative_budget_iqd.toLocaleString('en-US')} IQD
                            </dd>
                          </div>
                        )}
                        {request.details.timeline && <div><dt className="text-content-tertiary">{text.requestTimeline}</dt><dd className="text-content-primary">{request.details.timeline}</dd></div>}
                        {request.details.financing !== undefined && <div><dt className="text-content-tertiary">{text.requestFinancing}</dt><dd className="text-content-primary">{request.details.financing ? text.yes : text.no}</dd></div>}
                      </dl>
                      {request.details.notes && <p className="mt-3 text-body-sm text-content-secondary"><strong>{text.requestNotes}: </strong>{request.details.notes}</p>}
                      {request.companies[0]?.company_id != null && (
                        <RequestChat
                          groupId={request.group_id}
                          companyId={request.companies[0].company_id}
                          companyName={request.companies[0].company_name ?? company?.name ?? (ar ? 'الشركة' : 'Company')}
                          requestSummary={`${request.system_kwp} kWp · ${request.battery_kwh} kWh`}
                          quoteTotal={quote?.total_iqd}
                          companyToken={token}
                        />
                      )}
                      {hasActiveDeposit(depositPayment) && (
                        <aside
                          role="status"
                          data-notification-payment={request.group_id}
                          className="mt-4 rounded-lg border border-[var(--status-success)] bg-[var(--status-success-bg)] px-4 py-3 text-body-sm text-content-primary"
                        >
                          <p className="font-medium">{text.depositConfirmed}</p>
                          <p className="mt-1">{text.transactionId}: {depositPayment.transaction_id}</p>
                          <p>{text.depositValue}: {depositPayment.deposit_iqd.toLocaleString('en-US')} IQD · {text.balanceValue}: {depositPayment.remaining_iqd.toLocaleString('en-US')} IQD</p>
                        </aside>
                      )}
                      {verificationTier(company?.verification_status) === 0 && (
                        <p role="note" className="mt-4 rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] px-4 py-3 text-body-sm text-content-secondary">
                          {text.pendingRequestPrompt}
                        </p>
                      )}
                      {assignmentStatus === 'selected' && !completedProject && !depositPayment && (
                        <p role="note" className="mt-4 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">{text.quoteLocked}</p>
                      )}
                      {verificationTier(company?.verification_status) >= 1 && !completedProject && !depositPayment && assignmentStatus !== 'selected' && <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => submitQuote(event, request)}>
                        <Input label={text.amount} name="amount" type="number" min="1" required value={values.total ?? quote?.total_iqd ?? ''} onChange={(event) => setQuoteField(request.group_id, 'total', event.target.value)} />
                        <Input label={text.capacity} name="capacity" type="number" min="0.1" step="0.1" required value={values.capacity ?? quote?.capacity_kwp ?? request.system_kwp} onChange={(event) => setQuoteField(request.group_id, 'capacity', event.target.value)} />
                        <Input label={text.panelCost} name="panel_cost" type="number" min="0" step="1" required value={values.panelCost ?? (quote?.panel_iqd ? String(quote.panel_iqd) : '')} onChange={(event) => setQuoteField(request.group_id, 'panelCost', event.target.value)} />
                        <Input label={text.inverterCost} name="inverter_cost" type="number" min="0" step="1" required value={values.inverterCost ?? (quote?.inverter_iqd ? String(quote.inverter_iqd) : '')} onChange={(event) => setQuoteField(request.group_id, 'inverterCost', event.target.value)} />
                        <Input label={text.batteryCost} name="battery_cost" type="number" min="0" step="1" required value={values.batteryCost ?? (quote?.battery_iqd ? String(quote.battery_iqd) : '')} onChange={(event) => setQuoteField(request.group_id, 'batteryCost', event.target.value)} />
                        <Input label={text.installationCost} name="installation_cost" type="number" min="0" step="1" required value={values.installationCost ?? (quote?.installation_iqd ? String(quote.installation_iqd) : '')} onChange={(event) => setQuoteField(request.group_id, 'installationCost', event.target.value)} />
                        <p className="text-body-sm text-content-secondary sm:col-span-2">{text.itemizedTotal}: <strong className="numeric text-content-primary">{itemizedTotal.toLocaleString('en-US')} IQD</strong>{quotedTotal > 0 && quotedTotal !== itemizedTotal && <span className="ms-2 text-[var(--status-danger)]">{text.itemizedMismatch}</span>}</p>
                        <Input label={text.panel} name="panel" required value={values.panel ?? quote?.panel_brand ?? ''} onChange={(event) => setQuoteField(request.group_id, 'panel', event.target.value)} />
                        <Input label={text.inverter} name="inverter" required value={values.inverter ?? quote?.inverter_brand ?? ''} onChange={(event) => setQuoteField(request.group_id, 'inverter', event.target.value)} />
                        <Input label={text.battery} name="battery" required value={values.battery ?? quote?.battery_brand ?? ''} onChange={(event) => setQuoteField(request.group_id, 'battery', event.target.value)} />
                        <Input label={text.warranty} name="warranty" required value={values.warranty ?? quote?.warranty ?? ''} onChange={(event) => setQuoteField(request.group_id, 'warranty', event.target.value)} />
                        <Input label={text.days} name="days" type="number" min="1" max="365" required value={values.days ?? quote?.install_days ?? ''} onChange={(event) => setQuoteField(request.group_id, 'days', event.target.value)} />
                        <Input label={text.valid} name="valid" type="number" min="1" max="90" required value={values.valid ?? quote?.valid_days ?? 14} onChange={(event) => setQuoteField(request.group_id, 'valid', event.target.value)} />
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2 text-label text-content-secondary"><input type="checkbox" checked={values.financing ?? quote?.financing ?? false} onChange={(event) => setQuoteField(request.group_id, 'financing', event.target.checked)} />{text.financing}</label>
                          <p className="mt-1 text-body-sm text-content-tertiary">{text.financingHelp}</p>
                        </div>
                        {(values.financing ?? quote?.financing ?? false) && (
                          <>
                            <Input
                              label={text.downPayment}
                              name="down_payment"
                              type="number"
                              min="0"
                              max={Math.max(0, Number(values.total ?? quote?.total_iqd ?? 0) - 1)}
                              step="1"
                              required
                              value={values.downPayment ?? quote?.down_payment_iqd ?? ''}
                              onChange={(event) => setQuoteField(request.group_id, 'downPayment', event.target.value)}
                            />
                            <label className="grid gap-1.5 text-label-sm text-content-secondary">
                              {text.installmentMonths}
                              <select
                                required
                                aria-label={text.installmentMonths}
                                value={values.installmentMonths ?? String(quote?.installment_months ?? 12)}
                                onChange={(event) => setQuoteField(request.group_id, 'installmentMonths', event.target.value)}
                                className="platform-select"
                              >
                                {[3, 6, 12, 24].map((months) => (
                                  <option key={months} value={months}>{months} {text.months}</option>
                                ))}
                              </select>
                            </label>
                            {(() => {
                              const total = Number(values.total ?? quote?.total_iqd ?? 0);
                              const downPayment = Number(values.downPayment ?? quote?.down_payment_iqd ?? 0);
                              const months = Number(values.installmentMonths ?? quote?.installment_months ?? 12);
                              const calculated = total > downPayment && months > 0
                                ? Math.max(1, Math.round((total - downPayment) / months))
                                : 0;
                              const displayed = values.autoCalculateInstallment
                                ? String(calculated)
                                : values.monthlyInstallment || (
                                  quote?.monthly_installment_iqd != null && !values.downPayment && !values.total && !values.installmentMonths
                                    ? String(quote.monthly_installment_iqd)
                                    : String(calculated)
                                );
                              return (
                                <div className="sm:col-span-2">
                                  <Input
                                    label={text.monthlyInstallment}
                                    name="monthly_installment"
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={displayed}
                                    onChange={(event) => setQuoteField(request.group_id, 'monthlyInstallment', event.target.value)}
                                  />
                                  {!values.autoCalculateInstallment && (values.monthlyInstallment || quote?.monthly_installment_iqd) && (
                                    <button
                                      type="button"
                                      className="mt-1 text-label-sm text-content-secondary underline"
                                      onClick={() => setQuotes((current) => ({
                                        ...current,
                                        [request.group_id]: {
                                          ...current[request.group_id],
                                          monthlyInstallment: '',
                                          autoCalculateInstallment: true,
                                        },
                                      }))}
                                    >
                                      {text.useCalculatedInstallment}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        )}
                        {request.is_green_initiative && (
                          <div className="sm:col-span-2">
                            <label className="flex items-center gap-2 text-label text-content-secondary">
                              <input
                                type="checkbox"
                                checked={values.greenInitiativeSupported ?? quote?.green_initiative_supported ?? false}
                                onChange={(event) => setQuoteField(request.group_id, 'greenInitiativeSupported', event.target.checked)}
                              />
                              {text.greenSupport}
                            </label>
                            <p className="mt-1 text-body-sm text-content-tertiary">{text.greenSupportHelp}</p>
                          </div>
                        )}
                        <Textarea label={text.notes} rows={3} maxLength={2000} value={values.notes ?? quote?.notes ?? ''} onChange={(event) => setQuoteField(request.group_id, 'notes', event.target.value)} />
                        <div className="sm:col-span-2"><Button type="submit" loading={busy}>{text.send}</Button></div>
                      </form>}
                      {verificationTier(company?.verification_status) === 0 && !quote && <p className="mt-5 rounded-md border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">{text.verificationRequired}</p>}
                      {completedProject ? (
                        <p role="status" className="mt-5 rounded-lg border border-[var(--status-success)] bg-[var(--status-success-bg)] px-4 py-3 text-body-sm text-[var(--status-success)]">
                          {text.projectCompleted}: {completedProject.title}
                        </p>
                      ) : quote && assignmentStatus !== 'selected' ? (
                        <p role="status" className="mt-5 rounded-md border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">
                          {text.waitingForAcceptance}
                        </p>
                      ) : quote && verificationTier(company?.verification_status) >= 1 ? (
                        <form noValidate className="mt-6 grid gap-4 border-t border-line-subtle pt-5 sm:grid-cols-2" onSubmit={(event) => completeInstallation(event, request)}>
                          <h3 className="text-label text-content-primary sm:col-span-2">{text.completionTitle}</h3>
                          <Input label={text.installationTitle} name={`project_title_${request.group_id}`} required minLength={2} value={completionValues.title ?? ''} onChange={(event) => setCompletionField(request.group_id, 'title', event.target.value)} />
                          <Input label={text.installationType} name={`installation_type_${request.group_id}`} required minLength={2} value={completionValues.installationType ?? ''} onChange={(event) => setCompletionField(request.group_id, 'installationType', event.target.value)} />
                          <Textarea label={text.installationDescription} rows={3} maxLength={2000} className="sm:col-span-2" value={completionValues.description ?? ''} onChange={(event) => setCompletionField(request.group_id, 'description', event.target.value)} />
                          {completionErrors[request.group_id] && (
                            <p role="alert" className="rounded-md border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-body-sm text-[var(--status-danger)] sm:col-span-2">
                              {completionErrors[request.group_id]}
                            </p>
                          )}
                          <div className="sm:col-span-2"><Button type="submit" loading={busy}>{text.completeInstallation}</Button></div>
                        </form>
                      ) : null}
                    </li>;
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
        {previewDocument && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setPreviewDocument(null)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-label={previewDocument.file_name}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-bg-surface p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="truncate text-label text-content-primary">{previewDocument.file_name}</h2>
                <Button type="button" variant="secondary" size="md" onClick={() => setPreviewDocument(null)}>{text.closePreview}</Button>
              </div>
              {previewDocument.content_type.startsWith('image/') ? (
                <img
                  src={`data:${previewDocument.content_type};base64,${previewDocument.data_base64}`}
                  alt={previewDocument.file_name}
                  className="max-h-[75vh] max-w-full self-center object-contain"
                />
              ) : previewDocument.content_type === 'application/pdf' ? (
                <iframe
                  title={previewDocument.file_name}
                  src={`data:application/pdf;base64,${previewDocument.data_base64}`}
                  sandbox=""
                  className="h-[75vh] w-full border-0"
                />
              ) : (
                <p role="alert" className="text-body-sm text-[var(--status-danger)]">{text.documentUnavailable}</p>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
