import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useChat } from '../hooks/useChat';
import { ResourceCard } from './ResourceCard';
import type { ChatMessage } from '../hooks/useChat';

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1.5 px-3 py-2.5 max-w-[78%]">
      <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">🤖</span>
      <div className="flex gap-1 bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2.5">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: '1.2s' }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] bg-indigo-600 text-white text-sm px-3 py-2.5 rounded-2xl rounded-br-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.mode === 'tasks') {
    return (
      <div className="flex items-end gap-1.5">
        <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">🤖</span>
        <div className="max-w-[78%] bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm px-3 py-2.5 rounded-2xl rounded-bl-sm leading-relaxed">
          ✅ Created <span className="font-semibold">{msg.taskCount}</span> task{msg.taskCount !== 1 ? 's' : ''} — check your list!
        </div>
      </div>
    );
  }

  if (msg.mode === 'error') {
    return (
      <div className="flex items-end gap-1.5">
        <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">🤖</span>
        <div className="max-w-[78%] bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2.5 rounded-2xl rounded-bl-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  // wellbeing
  return (
    <div className="flex items-end gap-1.5">
      <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">🤖</span>
      <div className="max-w-[78%]">
        <div className="bg-gray-800 text-gray-200 text-sm px-3 py-2.5 rounded-2xl rounded-bl-sm leading-relaxed">
          {msg.content}
        </div>
        {msg.resourceCategory && <ResourceCard category={msg.resourceCategory} />}
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const { messages, sending, sendMessage, clearChat, lastMessagePreview } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, expanded]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    await sendMessage(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header — always visible, 48px */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2.5 px-4 h-12 shrink-0 w-full text-left hover:bg-gray-800/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-base">🤖</span>
        <span className="text-sm font-semibold text-white">StudyBuddy AI</span>
        {!expanded && lastMessagePreview && (
          <span className="flex-1 text-xs text-gray-500 truncate min-w-0">{lastMessagePreview}</span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {expanded && messages.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); clearChat(); }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-700"
            >
              Clear
            </button>
          )}
          <span
            className={`text-gray-500 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      <div
        className={`flex flex-col flex-1 min-h-0 transition-all duration-200 ease-in-out overflow-hidden ${
          expanded ? 'opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* Message area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-xl">
                💬
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">What are you working on?</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Describe an assignment to create tasks, or just talk about how you're feeling.
                </p>
              </div>
            </div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
          )}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="px-3 pb-3 pt-2 border-t border-gray-800">
          <div className="flex items-end gap-2 bg-gray-800 rounded-xl border border-gray-700 focus-within:border-indigo-500/50 transition-colors px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              rows={1}
              placeholder="Ask anything…"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none resize-none max-h-24 leading-relaxed disabled:opacity-50"
              style={{ minHeight: '1.5rem' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="shrink-0 w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white text-sm mb-0.5"
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
