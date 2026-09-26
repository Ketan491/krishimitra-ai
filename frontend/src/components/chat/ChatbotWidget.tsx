import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Input } from '../ui/Input';
import type { ChatResponse } from '../../lib/types';

interface ChatMsg {
  id: number;
  from: 'user' | 'bot';
  text: string;
  at: Date;
}

let msgId = 1;

const SUGGESTION_KEYS = [
  'chat.suggestion-crop',
  'chat.suggestion-pest',
  'chat.suggestion-price',
  'chat.suggestion-scheme',
  'chat.suggestionMarketplace',
  'chat.suggestionOrders',
];

const PANEL_MOTION = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.97 },
};

/**
 * Floating assistant available on every customer- and farmer-facing screen.
 * It talks to the same /api/advisory/chatbot endpoint as the full chatbot page,
 * so rules, marketplace answers and order lookups stay in one place.
 */
export function ChatbotWidget() {
  const { translate } = useI18n();
  const { role } = useAuth();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Greeting is built lazily so it always follows the active language.
  useEffect(() => {
    if (messages.length) return;
    setMessages([{ id: msgId++, from: 'bot', text: translate('chat.greeting'), at: new Date() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim();
      if (!message || sending) return;
      setInput('');
      setError(null);
      setMessages((m) => [...m, { id: msgId++, from: 'user', text: message, at: new Date() }]);
      setSending(true);
      try {
        const res: ChatResponse = await api.chat(message);
        setMessages((m) => [...m, { id: msgId++, from: 'bot', text: res.reply, at: new Date() }]);
        if (!open) setUnread(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : translate('chat.unreachable'));
      } finally {
        setSending(false);
      }
    },
    [input, sending, open, translate],
  );

  const toggle = () => {
    setOpen((v) => {
      if (!v) setUnread(false);
      return !v;
    });
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open ? (
          <motion.section
            key="panel"
            role="dialog"
            aria-label={translate('chat.widgetTitle')}
            variants={PANEL_MOTION}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto flex h-[min(70vh,30rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl"
          >
            <header className="flex items-center gap-3 bg-crop-700 px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg" aria-hidden="true">
                🤖
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{translate('chat.widgetTitle')}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-crop-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-crop-300" />
                  {translate('chat.online')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {role === 'customer' || role === 'farmer' ? (
                  <Link
                    to={`/${role}/chatbot`}
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-crop-100 hover:bg-white/15 hover:text-white"
                    aria-label={translate('chat.widgetOpenFull')}
                  >
                    ⤢
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-crop-100 hover:bg-white/15 hover:text-white"
                  aria-label={translate('chat.widgetClose')}
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-2.5 overflow-y-auto bg-ink-50/60 p-3.5">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={[
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm',
                      m.from === 'user'
                        ? 'rounded-br-sm bg-crop-700 text-white'
                        : 'rounded-bl-sm border border-ink-100 bg-white text-ink-800',
                    ].join(' ')}
                  >
                    {m.text}
                    <span
                      className={`mt-1 block text-[10px] ${m.from === 'user' ? 'text-crop-100' : 'text-ink-400'}`}
                    >
                      {m.at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {sending ? (
                <div className="flex items-center gap-1.5 px-1 text-ink-500" aria-live="polite">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
                  <span className="sr-only">{translate('chat.typing')}</span>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            {error ? (
              <p className="border-t border-red-100 bg-red-50 px-3.5 py-2 text-[11px] text-red-700">{error}</p>
            ) : null}

            <div className="border-t border-ink-200 bg-white p-3">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {SUGGESTION_KEYS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(translate(s))}
                    disabled={sending}
                    className="rounded-full border border-crop-200 bg-crop-50 px-2.5 py-1 text-[11px] font-medium text-crop-800 transition-colors hover:bg-crop-100 disabled:opacity-50"
                  >
                    {translate(s)}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2"
              >
                <Input
                  aria-label={translate('chat.inputPlaceholder')}
                  placeholder={translate('chat.inputPlaceholder')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label={translate('chat.send')}
                  className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-crop-700 text-white transition-colors hover:bg-crop-800 disabled:opacity-40"
                >
                  ➤
                </button>
              </form>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? translate('chat.widgetClose') : translate('chat.widgetOpen')}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-crop-700 text-2xl text-white shadow-xl shadow-crop-900/25 transition-colors hover:bg-crop-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-crop-500 focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={reduced ? false : { rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={reduced ? undefined : { rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-hidden="true"
          >
            {open ? '✕' : '🤖'}
          </motion.span>
        </AnimatePresence>
        {!open && unread ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            1
          </span>
        ) : null}
      </motion.button>
    </div>
  );
}
