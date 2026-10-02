import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import type { ChatMessage, ChatModelTier, ChatPersona, ChatResponse } from '../../lib/types';

let nextMsgId = 1;

interface PersonaOption {
  id: ChatPersona;
  labelKey: string;
  icon: string;
  description: string;
  suggestions: string[];
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'agronomist',
    labelKey: 'chat.personaAgronomist',
    icon: '🌾',
    description: 'Crop health, NPK dosage, pest control & irrigation',
    suggestions: [
      'chat.suggestion-crop',
      'chat.suggestion-pest',
      'What is the ideal NPK ratio for onion in Maharashtra?',
      'How to manage blight disease organically using neem?',
    ],
  },
  {
    id: 'market',
    labelKey: 'chat.personaMarket',
    icon: '📊',
    description: 'APMC mandi prices, selling strategy & profit margins',
    suggestions: [
      'chat.suggestion-price',
      'chat.suggestionMarketplace',
      'When is the best time to sell stored garlic for max profit?',
      'How can I grade and pack tomatoes for direct city delivery?',
    ],
  },
  {
    id: 'schemes',
    labelKey: 'chat.personaSchemes',
    icon: '🏛️',
    description: 'PM-KISAN, PMFBY insurance & state subsidies',
    suggestions: [
      'chat.suggestion-scheme',
      'How to apply for 80% solar water pump subsidy under PM-KUSUM?',
      'What documents do I need for Kisan Credit Card (KCC) 4% loan?',
      'How do I claim crop damage compensation under PMFBY?',
    ],
  },
];

const MODEL_TIERS: Array<{ id: ChatModelTier; labelKey: string; icon: string; name: string }> = [
  { id: 'fast', labelKey: 'chat.modelFast', icon: '⚡', name: 'gemini-3.1-flash-lite' },
  { id: 'general', labelKey: 'chat.modelGeneral', icon: '🧠', name: 'gemini-3.5-flash' },
  { id: 'complex', labelKey: 'chat.modelComplex', icon: '🔬', name: 'gemini-3.1-pro-preview' },
];

export function ChatbotPage() {
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();

  const [persona, setPersona] = useState<ChatPersona>('agronomist');
  const [modelTier, setModelTier] = useState<ChatModelTier>('general');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: nextMsgId++,
      role: 'model',
      text: translate('chat.greeting'),
      at: new Date(),
      modelUsed: 'gemini-3.5-flash',
      persona: 'Crop Doctor & Agronomist',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const activePersonaConfig = PERSONAS.find((p) => p.id === persona) || PERSONAS[0];

  const clearChat = () => {
    setMessages([
      {
        id: nextMsgId++,
        role: 'model',
        text: translate('chat.greeting'),
        at: new Date(),
        modelUsed: MODEL_TIERS.find((m) => m.id === modelTier)?.name,
        persona: translate(activePersonaConfig.labelKey),
      },
    ]);
  };

  const handleCopy = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const send = async (textToSend?: string) => {
    const prompt = (textToSend ?? input).trim();
    if (!prompt || sending) return;

    setInput('');
    const userMessage: ChatMessage = {
      id: nextMsgId++,
      role: 'user',
      text: prompt,
      at: new Date(),
    };

    // Keep history of previous turns (excluding greeting if it's the only one)
    const historyPayload = messages
      .filter((m) => m.id !== 1 || m.role === 'user')
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      const res: ChatResponse = await api.chat(prompt, {
        history: historyPayload,
        persona,
        modelType: modelTier,
      });

      const modelMessage: ChatMessage = {
        id: nextMsgId++,
        role: 'model',
        text: res.reply,
        at: new Date(),
        modelUsed: res.modelUsed,
        persona: res.persona,
      };

      setMessages((prev) => [...prev, modelMessage]);
      successToast(translate('chat.replyReceived'));
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('chat.unreachable'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={translate('nav.chat')} subtitle={translate('chat.subtitle')} icon="🤖" />

      {/* Control Header: Persona Selector & Model Tier Selector */}
      <div className="mb-4 grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {/* Persona Roles */}
        <div className="rounded-xl border border-earth-200 bg-white p-3 shadow-xs">
          <label className="mb-2 block text-xs font-semibold tracking-wide text-ink-600 uppercase">
            {translate('chat.personaLabel')}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PERSONAS.map((p) => {
              const active = persona === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`flex flex-col items-center justify-center rounded-lg p-2 text-center transition-all ${
                    active
                      ? 'border border-crop-600 bg-crop-50 font-semibold text-crop-900 shadow-xs ring-2 ring-crop-500/20'
                      : 'border border-ink-100 bg-ink-50/50 text-ink-700 hover:bg-ink-100/60'
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="mt-1 line-clamp-1 text-xs">{translate(p.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Intelligence Tier */}
        <div className="rounded-xl border border-earth-200 bg-white p-3 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-semibold tracking-wide text-ink-600 uppercase">
              {translate('chat.modelTierLabel')}
            </label>
            <button
              type="button"
              onClick={clearChat}
              className="text-xs text-ink-500 hover:text-red-600"
              title="Reset conversation"
            >
              🔄 {translate('chat.clearThread')}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MODEL_TIERS.map((m) => {
              const active = modelTier === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModelTier(m.id)}
                  className={`flex flex-col items-center justify-center rounded-lg p-2 text-center transition-all ${
                    active
                      ? 'border border-amber-600 bg-amber-50 font-semibold text-amber-900 shadow-xs ring-2 ring-amber-500/20'
                      : 'border border-ink-100 bg-ink-50/50 text-ink-700 hover:bg-ink-100/60'
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="mt-1 line-clamp-1 text-xs">{translate(m.labelKey).split('·')[0].trim()}</span>
                  <span className="text-[10px] text-ink-400">{m.name.split('-')[1]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Thread Container */}
      <Card padded={false} className="flex h-[62vh] flex-col overflow-hidden border-earth-300 shadow-sm">
        {/* Message Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const atDate = m.at instanceof Date ? m.at : new Date(m.at);

            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar
                  name={isUser ? translate('chat.you') : 'KrishiMitra'}
                  size="sm"
                  className={isUser ? 'bg-crop-700 text-white' : 'bg-amber-600 text-white'}
                />

                <div className={`group relative max-w-[85%] md:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Persona / Model Banner for Assistant messages */}
                  {!isUser && (m.persona || m.modelUsed) && (
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] text-ink-500">
                      <span className="font-semibold text-crop-800">{m.persona || 'KrishiMitra AI'}</span>
                      {m.modelUsed && (
                        <span className="rounded-full bg-earth-100 px-1.5 py-0.2 font-mono text-[9px] text-ink-600">
                          {m.modelUsed}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'rounded-tr-xs bg-crop-700 text-white'
                        : 'rounded-tl-xs border border-earth-200 bg-white text-ink-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Timestamp & Copy action */}
                    <div
                      className={`mt-2 flex items-center justify-between gap-4 border-t pt-1.5 text-[10px] ${
                        isUser ? 'border-crop-600 text-crop-100' : 'border-earth-100 text-ink-400'
                      }`}
                    >
                      <span>{atDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>

                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.text)}
                          className="text-[10px] text-ink-500 hover:text-crop-700"
                        >
                          {copiedId === m.id ? `✓ ${translate('chat.copied')}` : `📋 ${translate('chat.copy')}`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-crop-800">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-crop-300 border-t-crop-700" />
              <span className="font-medium text-xs">
                {MODEL_TIERS.find((m) => m.id === modelTier)?.name} is thinking…
              </span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Footer Area with Suggestions & Input */}
        <div className="border-t border-earth-200 bg-cream/50 p-3 md:p-4">
          {/* Quick Suggestions Chips */}
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {activePersonaConfig.suggestions.map((s) => {
              const label = s.startsWith('chat.') ? translate(s) : s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(label)}
                  disabled={sending}
                  className="rounded-full border border-crop-300/80 bg-white px-2.5 py-1 text-xs text-crop-900 shadow-2xs hover:border-crop-500 hover:bg-crop-50 disabled:opacity-50"
                >
                  💡 {label}
                </button>
              );
            })}
          </div>

          {/* Prompt Form */}
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
              className="bg-white"
            />
            <Button type="submit" disabled={sending || !input.trim()} className="shrink-0 font-medium">
              {translate('chat.send')} ➤
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
