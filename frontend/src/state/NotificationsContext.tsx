import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, hasActiveDeposit } from '../api/client';
import { useLanguage } from '../i18n/LanguageProvider';
import { useAuth } from './AuthContext';

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  href: string;
};

type NotificationValue = {
  notifications: InAppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

type Snapshot = Record<string, string>;

const NotificationContext = createContext<NotificationValue | null>(null);
const STORAGE_KEY_PREFIX = 'utu-notifications-v1';
const SNAPSHOT_KEY_PREFIX = 'utu-notification-snapshot-v1';
/**
 * Background check for new activity. Every poll runs several API calls (and
 * one per open request for chat), so it runs every 45 s and pauses while the
 * tab is hidden. An open chat polls on its own, faster (see RequestChat).
 */
export const POLL_INTERVAL_MS = 45_000;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Notifications remain available in memory when storage is unavailable.
  }
}

function notificationStorageKey(userId: number, role: string) {
  return `${STORAGE_KEY_PREFIX}:${role}:${userId}`;
}

function snapshotStorageKey(userId: number, role: string) {
  return `${SNAPSHOT_KEY_PREFIX}:${role}:${userId}`;
}

function destination(
  role: 'client' | 'company',
  groupId: string,
  companyId: number,
  view?: 'chat' | 'payment',
) {
  const route = role === 'client' ? '#/requests' : '#/company';
  const query = new URLSearchParams({
    requestId: groupId,
    companyId: String(companyId),
    ...(view === 'chat' ? { chat: '1' } : {}),
    ...(view === 'payment' ? { payment: '1' } : {}),
  });
  return `${route}?${query.toString()}`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const { lang } = useLanguage();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const snapshotRef = useRef<Snapshot>({});
  const pollingRef = useRef(false);
  const loadedIdentityRef = useRef('');
  const identity = user && (user.role === 'client' || user.role === 'company')
    ? `${user.role}:${user.id}`
    : '';
  const role = user?.role === 'client' || user?.role === 'company' ? user.role : null;
  const storageKey = user && role ? notificationStorageKey(user.id, role) : '';
  const snapshotKey = user && role ? snapshotStorageKey(user.id, role) : '';

  const addNotification = useCallback((notification: InAppNotification) => {
    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      const next = [notification, ...current].slice(0, 100);
      safeWrite(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const markRead = useCallback((id: string) => {
    setNotifications((current) => {
      const next = current.map((item) => item.id === id ? { ...item, read: true } : item);
      safeWrite(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const markAllRead = useCallback(() => {
    setNotifications((current) => {
      const next = current.map((item) => ({ ...item, read: true }));
      safeWrite(storageKey, next);
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    if (loadedIdentityRef.current === identity) return;
    loadedIdentityRef.current = identity;
    setNotifications(storageKey ? safeRead<InAppNotification[]>(storageKey, []) : []);
    snapshotRef.current = snapshotKey ? safeRead<Snapshot>(snapshotKey, {}) : {};
  }, [identity, snapshotKey, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setNotifications(safeRead<InAppNotification[]>(storageKey, []));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  useEffect(() => {
    if (!user || !role || !token || isLoading || !snapshotKey || !storageKey) return undefined;
    let active = true;

    const makeNotification = (
      key: string,
      title: string,
      body: string,
      href: string,
      occurredAt?: string,
    ): InAppNotification => {
      const createdAt = occurredAt ?? new Date().toISOString();
      return { id: key, title, body, created_at: createdAt, read: false, href };
    };

    const notifyClient = async () => {
      const groups = await api.myQuoteRequests();
      const nextSnapshot = { ...snapshotRef.current };
      for (const group of groups) {
        for (const assignment of group.companies) {
          const href = destination('client', group.group_id, assignment.company_id);
          const quote = assignment.quote;
          const quoteSignature = quote
            ? `${quote.created_at ?? ''}:${quote.total_iqd}`
            : '';
          const quoteKey = `quote:${group.group_id}:${assignment.company_id}`;
          if (quoteSignature && nextSnapshot[quoteKey] !== undefined && nextSnapshot[quoteKey] !== quoteSignature) {
            addNotification(makeNotification(
              `${quoteKey}:${quoteSignature}`,
              lang === 'ar' ? 'عرض سعر جديد' : 'New quote received',
              lang === 'ar'
                ? `قدّمت ${assignment.company_name ?? 'الشركة'} عرض سعر لطلبك ${group.group_id}.`
                : `${assignment.company_name ?? 'A company'} submitted a quote for request ${group.group_id}.`,
              href,
              quote?.created_at,
            ));
          }
          nextSnapshot[quoteKey] = quoteSignature;

          const paymentSignature = hasActiveDeposit(assignment.payment)
            ? assignment.payment.transaction_id
            : '';
          const paymentKey = `payment:${group.group_id}:${assignment.company_id}`;
          const previousPaymentSignature = nextSnapshot[paymentKey];
          if (paymentSignature && previousPaymentSignature !== undefined
            && previousPaymentSignature !== paymentSignature) {
            addNotification(makeNotification(
              `${paymentKey}:${paymentSignature}`,
              lang === 'ar' ? 'تم تأكيد دفع العربون' : 'Deposit payment confirmed',
              lang === 'ar'
                ? `تم تأكيد عربون المشروع ${group.group_id}.`
                : `The deposit for project ${group.group_id} has been confirmed.`,
              destination('client', group.group_id, assignment.company_id, 'payment'),
              assignment.payment?.created_at,
            ));
          }
          nextSnapshot[paymentKey] = paymentSignature;

          const verification = assignment.company_verification_status ?? '';
          const verificationKey = `verification:${group.group_id}:${assignment.company_id}`;
          if (verification && nextSnapshot[verificationKey] !== undefined && nextSnapshot[verificationKey] !== verification) {
            addNotification(makeNotification(
              `${verificationKey}:${verification}`,
              lang === 'ar' ? 'تحديث حالة توثيق الشركة' : 'Company verification updated',
              lang === 'ar'
                ? `تم تحديث حالة توثيق ${assignment.company_name ?? 'الشركة'}.`
                : `Verification status for ${assignment.company_name ?? 'the company'} has changed.`,
              href,
            ));
          }
          if (verification) nextSnapshot[verificationKey] = verification;

          const completed = assignment.completed_projects ?? [];
          for (const project of completed) {
            if (project.review?.is_verified) {
              const reviewKey = `review:${project.id}`;
              const reviewSignature = `${project.review.rating}:${project.review.comment}:${project.review.client_name}`;
              if (nextSnapshot[reviewKey] !== reviewSignature) {
                if (nextSnapshot[reviewKey] !== undefined) {
                  addNotification(makeNotification(
                    `${reviewKey}:${reviewSignature}`,
                    lang === 'ar' ? 'تقييم موثق جديد' : 'New verified review',
                    lang === 'ar'
                      ? `تمت إضافة تقييم موثق لمشروع ${project.title}.`
                      : `A verified review was published for ${project.title}.`,
                    href,
                  ));
                }
                nextSnapshot[reviewKey] = reviewSignature;
              }
            }
          }

          try {
            const messages = await api.chatMessages(group.group_id, assignment.company_id);
            const messageKey = `chat:${group.group_id}:${assignment.company_id}`;
            const hasMessageBaseline = nextSnapshot[messageKey] !== undefined;
            const priorMessageId = Number(nextSnapshot[messageKey] ?? 0);
            if (hasMessageBaseline) {
              for (const message of messages) {
                if (message.id > priorMessageId && message.sender_role === 'company') {
                  addNotification(makeNotification(
                    `chat:${group.group_id}:${assignment.company_id}:${message.id}`,
                    lang === 'ar' ? 'رسالة جديدة في المحادثة' : 'New chat message',
                    lang === 'ar'
                      ? `وصلتك رسالة جديدة بخصوص الطلب ${group.group_id}.`
                      : `You received a message about request ${group.group_id}.`,
                    destination('client', group.group_id, assignment.company_id, 'chat'),
                    message.created_at,
                  ));
                }
              }
            }
            const latestId = messages.reduce((latest, message) => Math.max(latest, message.id), priorMessageId);
            nextSnapshot[messageKey] = String(latestId);
          } catch {
            // Continue polling other assigned requests when one conversation is unavailable.
          }
        }
      }
      return nextSnapshot;
    };

    const notifyCompany = async () => {
      const profile = await api.companyProfile(token);
      // Unverified companies cannot read requests; still report their
      // verification changes instead of failing the whole poll.
      const canReadInbox = profile.verification_status === 'identity_verified'
        || profile.verification_status === 'verified';
      const inbox = canReadInbox ? await api.companyInbox(token) : [];
      const nextSnapshot = { ...snapshotRef.current };
      const verificationKey = `verification:${profile.id}`;
      if (nextSnapshot[verificationKey] !== undefined
        && nextSnapshot[verificationKey] !== profile.verification_status) {
        const tier = profile.verification_status === 'verified'
          ? (lang === 'ar' ? 'Gold' : 'Gold')
          : profile.verification_status === 'identity_verified'
            ? (lang === 'ar' ? 'Silver' : 'Silver')
            : profile.verification_status;
        addNotification(makeNotification(
          `${verificationKey}:${profile.verification_status}`,
          lang === 'ar' ? 'تم تحديث حالة التوثيق' : 'Verification status updated',
          lang === 'ar'
            ? `تم تحديث حالة توثيق شركتك إلى ${tier}.`
            : `Your company verification tier is now ${tier}.`,
          '#/company?verification=1',
        ));
      }
      nextSnapshot[verificationKey] = profile.verification_status;

      for (const request of inbox) {
        const assignment = request.companies[0];
        if (!assignment) continue;
        const requestHref = destination('company', request.group_id, assignment.company_id);
        const statusKey = `acceptance:${request.group_id}`;
        if (assignment.status === 'selected'
          && nextSnapshot[statusKey] !== undefined
          && nextSnapshot[statusKey] !== 'selected') {
          addNotification(makeNotification(
            `${statusKey}:selected`,
            lang === 'ar' ? 'تم قبول عرضك' : 'Your quote was accepted',
            lang === 'ar'
              ? `قبل العميل عرض السعر للطلب ${request.group_id}.`
              : `The client accepted your quote for request ${request.group_id}.`,
            requestHref,
          ));
        }
        nextSnapshot[statusKey] = assignment.status;

        const paymentSignature = hasActiveDeposit(assignment.payment)
          ? assignment.payment.transaction_id
          : '';
        const paymentKey = `payment:${request.group_id}`;
        const previousPaymentSignature = nextSnapshot[paymentKey];
        if (paymentSignature && previousPaymentSignature !== undefined
          && previousPaymentSignature !== paymentSignature) {
          addNotification(makeNotification(
            `${paymentKey}:${paymentSignature}`,
            lang === 'ar' ? 'تم تأكيد دفع العربون للمشروع' : 'Project deposit confirmed',
            lang === 'ar'
              ? `تم استلام عربون المشروع ${request.group_id} ويمكنك البدء بالتنفيذ.`
              : `The deposit for ${request.group_id} is confirmed; work can begin.`,
            requestHref,
            assignment.payment?.created_at,
          ));
        }
        nextSnapshot[paymentKey] = paymentSignature;

        try {
          const messages = await api.chatMessages(request.group_id, assignment.company_id, undefined, token);
          const messageKey = `chat:${request.group_id}:${assignment.company_id}`;
          const hasMessageBaseline = nextSnapshot[messageKey] !== undefined;
          const priorMessageId = Number(nextSnapshot[messageKey] ?? 0);
          if (hasMessageBaseline) {
            for (const message of messages) {
              if (message.id > priorMessageId && message.sender_role === 'client') {
                addNotification(makeNotification(
                  `chat:${request.group_id}:${assignment.company_id}:${message.id}`,
                  lang === 'ar' ? 'رسالة جديدة في المحادثة' : 'New chat message',
                  lang === 'ar'
                    ? `وصلتك رسالة جديدة من العميل بخصوص الطلب ${request.group_id}.`
                    : `You received a new client message about request ${request.group_id}.`,
                  destination('company', request.group_id, assignment.company_id, 'chat'),
                  message.created_at,
                ));
              }
            }
          }
          const latestId = messages.reduce((latest, message) => Math.max(latest, message.id), priorMessageId);
          nextSnapshot[messageKey] = String(latestId);
        } catch {
          // A later poll retries unavailable conversations.
        }
      }

      const reviews = await api.companyReviews(profile.id);
      const reviewIds = new Set(reviews.map((review) => String(review.id)));
      const previousReviewIds = new Set((nextSnapshot[`reviews:${profile.id}`] ?? '').split(',').filter(Boolean));
      for (const review of reviews) {
        const reviewId = String(review.id);
        if (review.is_verified && previousReviewIds.has('__initialized__') && !previousReviewIds.has(reviewId)) {
          addNotification(makeNotification(
            `verified-review:${review.id}`,
            lang === 'ar' ? 'تمت إضافة تقييم موثق جديد لمشروعك' : 'New verified project review',
            lang === 'ar'
              ? `نشر العميل تقييماً موثقاً لمشروع ${review.project_title}.`
              : `A client published a verified review for ${review.project_title}.`,
            (() => {
              const relatedRequest = inbox.find((item) =>
                item.companies.some((assignment) =>
                  assignment.completed_projects?.some((project) => project.id === review.project_id),
                ),
              );
              if (relatedRequest) {
                return destination('company', relatedRequest.group_id, profile.id);
              }
              const query = new URLSearchParams({
                projectId: String(review.project_id),
                review: '1',
              });
              return `#/company?${query.toString()}`;
            })(),
            review.created_at,
          ));
        }
      }
      nextSnapshot[`reviews:${profile.id}`] = ['__initialized__', ...reviewIds].join(',');
      return nextSnapshot;
    };

    const poll = async () => {
      if (pollingRef.current || !active) return;
      pollingRef.current = true;
      try {
        const nextSnapshot = role === 'client'
          ? await notifyClient()
          : await notifyCompany();
        if (active) {
          snapshotRef.current = nextSnapshot;
          safeWrite(snapshotKey, nextSnapshot);
        }
      } catch {
        // Keep the last successful snapshot; the next interval retries API failures.
      } finally {
        pollingRef.current = false;
      }
    };

    const pollIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void poll();
    };
    void poll();
    const timer = window.setInterval(pollIfVisible, POLL_INTERVAL_MS);
    // Catch up as soon as the person returns to the tab.
    document.addEventListener('visibilitychange', pollIfVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pollIfVisible);
    };
  }, [addNotification, lang, role, snapshotKey, storageKey, token, user, isLoading]);

  const value = useMemo<NotificationValue>(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    markRead,
    markAllRead,
  }), [markAllRead, markRead, notifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return value;
}
