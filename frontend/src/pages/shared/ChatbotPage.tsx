import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import type { ChatResponse } from '../../lib/types';

interface ChatMsg {
  id: number;
  from: 'user' | 'bot';
  text: string;
  at: Date;
}

let msgId = 1;

const SUGGESTIONS = ['chat.suggestion-crop', 'chat.suggestion-pest', 'chat.suggestion-price', 'chat.suggestion-scheme'];

export function ChatbotPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: msgId++,
      from: 'bot',
      text: translate('chat.greeting'),
      at: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages((m) => [...m, { id: msgId++, from: 'user', text: message, at: new Date() }]);
    setSending(true);
    try {
      const res: ChatResponse = await api.chat(message);
      setMessages((m) => [...m, { id: msgId++, from: 'bot', text: res.reply, at: new Date() }]);
      successToast(translate('chat.replyReceived'));
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('chat.unreachable'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={translate('nav.chat')} subtitle={translate('chat.subtitle')} icon="🤖" />

      <Card padded={false} className="flex h-[65vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
              <Avatar name={m.from === 'bot' ? 'KrishiMitra' : translate('chat.you')} size="sm" />
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  m.from === 'user' ? 'rounded-tr-sm bg-crop-700 text-white' : 'rounded-tl-sm bg-ink-50 text-ink-800'
                }`}
              >
                {m.text}
                <p className={`mt-1 text-[10px] ${m.from === 'user' ? 'text-crop-100' : 'text-ink-400'}`}>
                  {m.at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-crop-700" />
              {translate('chat.typing')}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="border-t border-ink-200 p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(translate(s))}
                disabled={sending}
                className="rounded-full border border-crop-200 bg-crop-50 px-3 py-1 text-xs text-crop-800 hover:bg-crop-100 disabled:opacity-50"
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
              placeholder={translate('chat.inputPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              {translate('chat.send')} ➤
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
