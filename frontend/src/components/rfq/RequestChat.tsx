import { useEffect, useState, type FormEvent } from 'react';
import { api, type ChatMessage } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageProvider';

type RequestChatProps = {
  groupId: string;
  companyId: number;
  companyName: string;
  requestSummary: string;
  quoteTotal?: number;
  accessToken?: string;
  companyToken?: string;
};

const FILTERED_MESSAGE = '[تم حجب معلومات التواصل المباشر لحماية الاتفاقية]';

export function RequestChat({
  groupId,
  companyId,
  companyName,
  requestSummary,
  quoteTotal,
  accessToken,
  companyToken,
}: RequestChatProps) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [expanded, setExpanded] = useState(() => {
    const query = window.location.hash.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    return params.get('chat') === '1'
      && params.get('requestId') === groupId
      && params.get('companyId') === String(companyId);
  });

  useEffect(() => {
    const openLinkedConversation = () => {
      const query = window.location.hash.split('?')[1] ?? '';
      const params = new URLSearchParams(query);
      if (
        params.get('chat') === '1'
        && params.get('requestId') === groupId
        && params.get('companyId') === String(companyId)
      ) {
        setExpanded(true);
      }
    };
    window.addEventListener('hashchange', openLinkedConversation);
    return () => window.removeEventListener('hashchange', openLinkedConversation);
  }, [companyId, groupId]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const labels = ar
    ? {
      open: 'فتح المحادثة',
      close: 'إغلاق المحادثة',
      title: 'محادثة الطلب',
      customer: 'العميل',
      company: 'الشركة',
      placeholder: 'اكتب رسالتك...',
      send: 'إرسال',
      loading: 'جارٍ تحميل المحادثة...',
      noMessages: 'ابدأ المحادثة برسالة آمنة داخل المنصة.',
      blocked: 'تم حجب معلومات التواصل المباشر لحماية الاتفاقية. يرجى متابعة التفاوض هنا حتى قبول العرض ودفع العربون.',
      request: 'الطلب',
      quote: 'قيمة العرض',
      genericError: 'تعذر تحميل المحادثة أو إرسال الرسالة.',
    }
    : {
      open: 'Open conversation',
      close: 'Close conversation',
      title: 'Request conversation',
      customer: 'Client',
      company: 'Company',
      placeholder: 'Write a message...',
      send: 'Send',
      loading: 'Loading conversation...',
      noMessages: 'Start the conversation with a safe in-platform message.',
      blocked: 'Direct contact information was blocked to protect the agreement. Please continue negotiating here until the quote is accepted and the deposit is paid.',
      request: 'Request',
      quote: 'Quote total',
      genericError: 'Could not load the conversation or send the message.',
    };

  useEffect(() => {
    if (!expanded) return undefined;
    let active = true;
    const loadMessages = async () => {
      try {
        const result = await api.chatMessages(groupId, companyId, accessToken, companyToken);
        if (active) {
          setMessages(result);
          setError('');
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : labels.genericError);
      }
    };
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [accessToken, companyId, companyToken, expanded, groupId, labels.genericError]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    setError('');
    setWarning('');
    try {
      const sent = await api.sendChatMessage(
        groupId,
        companyId,
        content,
        accessToken,
        companyToken,
      );
      setMessages((current) => current.some((message) => message.id === sent.id)
        ? current
        : [...current, sent].sort((left, right) => left.id - right.id));
      setDraft('');
      if (sent.violation_type) setWarning(labels.blocked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-line-subtle bg-bg-surface">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-label text-content-primary"
      >
        <span>{expanded ? labels.close : labels.open}</span>
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="border-t border-line-subtle p-4">
          <header className="rounded-lg bg-bg-subtle px-4 py-3">
            <h4 className="text-label text-content-primary">{labels.title} · {companyName}</h4>
            <p className="mt-1 text-label-sm text-content-secondary">
              {labels.request}: {groupId} · {requestSummary}
              {quoteTotal !== undefined && ` · ${labels.quote}: ${quoteTotal.toLocaleString('en-US')} IQD`}
            </p>
          </header>
          <div
            role="log"
            aria-label={labels.title}
            aria-live="polite"
            className="mt-3 flex max-h-80 min-h-24 flex-col gap-3 overflow-y-auto rounded-lg border border-line-subtle p-3"
          >
            {messages.length === 0 ? (
              <p className="m-auto text-center text-body-sm text-content-tertiary">{labels.noMessages}</p>
            ) : messages.map((message) => (
              <article key={message.id} className="max-w-[90%] rounded-lg bg-bg-subtle px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-label-sm font-semibold text-content-primary">
                    {message.sender_role === 'client' ? labels.customer : labels.company}: {message.sender_name}
                  </span>
                  <time className="text-body-xs text-content-tertiary" dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString(ar ? 'ar-IQ' : 'en-US')}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-body-sm text-content-secondary">
                  {message.violation_type ? FILTERED_MESSAGE : message.content}
                </p>
              </article>
            ))}
          </div>
          {warning && (
            <p role="alert" className="mt-3 rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] px-3 py-2 text-body-sm text-content-secondary">
              {warning}
            </p>
          )}
          {error && <p role="alert" className="mt-3 text-body-sm text-[var(--status-danger)]">{error}</p>}
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submitMessage}>
            <label className="sr-only" htmlFor={`chat-${groupId}-${companyId}`}>{labels.placeholder}</label>
            <input
              id={`chat-${groupId}-${companyId}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              placeholder={labels.placeholder}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg-page px-3 py-2 text-body-sm text-content-primary"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="min-h-11 rounded-md bg-bg-brand px-5 py-2 text-label text-content-on-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? labels.loading : labels.send}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
