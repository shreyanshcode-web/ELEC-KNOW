import { BrainCircuit, Send, Sparkles } from 'lucide-react';
import { type FormEvent, startTransition, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface ChatMessage {
  content: string;
  id: string;
  role: 'assistant' | 'user';
}

const promptSuggestions = [
  'Explain voter ID rules simply',
  'What happens during vote counting?',
  'How should I read election results?',
] as const;

function renderMessageContent(content: string) {
  return content.split('\n').filter(Boolean).map((line, lineIndex) => (
    <p key={`${lineIndex}-${line.slice(0, 24)}`} className="leading-7">
      {line.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((segment, segmentIndex) => {
        const isStrong = segment.startsWith('**') && segment.endsWith('**');
        const value = isStrong ? segment.slice(2, -2) : segment;

        return isStrong ? (
          <strong key={`${lineIndex}-${segmentIndex}`} className="font-semibold text-slate-950">
            {value}
          </strong>
        ) : (
          <span key={`${lineIndex}-${segmentIndex}`}>{value}</span>
        );
      })}
    </p>
  ));
}

export default function CopilotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'I can explain election rules, timelines, results, and booth lookup steps in a neutral, learner-friendly way. What would you like to understand first?',
    },
  ]);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!query.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/education', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock_jwt_for_development',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMsg.content, knowledgeLevel: 'Intermediate' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      startTransition(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.data,
          },
        ]);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch an answer right now.';
      startTransition(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `**Error:** ${message}`,
          },
        ]);
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <aside id="copilot-panel" className="px-4 pb-16 pt-14 sm:px-6 lg:px-8 xl:px-0 xl:pb-0 xl:pt-6">
      <div className="xl:sticky xl:top-6">
        <section className="panel relative flex min-h-[640px] flex-col overflow-hidden rounded-[32px]">
          <div className="copilot-mesh absolute inset-0 opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,118,110,0.08),_transparent_32%)]" />

          <div className="relative border-b border-slate-200/70 px-6 py-6">
            <div className="flex items-start gap-4">
              <img
                alt=""
                className="h-14 w-14 rounded-2xl shadow-[0_14px_28px_rgba(15,23,42,0.1)]"
                loading="eager"
                src="/illustrations/assistant-avatar.svg"
              />
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                  <Sparkles size={13} />
                  AI civic guide
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Ask for context, not just answers.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The assistant is tuned for election education, so it explains processes, not just headlines.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {promptSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div ref={chatRef} aria-live="polite" className="relative flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`max-w-[88%] rounded-[24px] p-4 ${
                    message.role === 'user'
                      ? 'rounded-tr-sm bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.15)]'
                      : 'rounded-tl-sm border border-slate-200/80 bg-white/92 text-slate-700 shadow-[0_12px_25px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                      <BrainCircuit size={14} />
                      Assistant
                    </div>
                  ) : null}

                  <div className={`space-y-2 text-sm ${message.role === 'user' ? 'text-white/90' : 'text-slate-700'}`}>
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              </motion.div>
            ))}

            {isTyping ? (
              <div className="flex justify-start">
                <div className="rounded-[22px] rounded-tl-sm border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-primary/80 animate-bounce [animation-delay:120ms]" />
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:240ms]" />
                    <span className="ml-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Analyzing
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="relative border-t border-slate-200/70 px-6 py-5">
            <label htmlFor="assistant-query" className="sr-only">
              Ask the election assistant a question
            </label>
            <div className="relative">
              <input
                id="assistant-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask about voter ID, counting, timelines, or candidate information"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white/92 pl-4 pr-14 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              />
              <button
                type="submit"
                disabled={isTyping || !query.trim()}
                className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Use the copilot for neutral explanations, step summaries, and plain-language results reading.
            </p>
          </form>
        </section>
      </div>
    </aside>
  );
}
