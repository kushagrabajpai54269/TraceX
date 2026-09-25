// ============================================================
// AssistantPanel — Phase 7
// Conversational AI panel embedded inside IntelligencePage.
// Only usable when analysis + trace data are available.
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { investigationsApi } from '../../services/api';
import type { ChatMessage, InvestigationAnalysis, TraceResponse } from '../../types';

interface AssistantPanelProps {
  investigationId: string;
  analysis: InvestigationAnalysis;
  trace: TraceResponse;
}

const MAX_MESSAGES    = 20;
const MAX_INPUT_CHARS = 5_000;

// Example prompts shown in the empty state
const EXAMPLE_PROMPTS = [
  'Why is the risk score this high?',
  'Explain the detected patterns.',
  'Which addresses are most important?',
  'What transactions contributed to the risk?',
  'What limitations should I consider?',
  'What should I investigate next?',
];

export function AssistantPanel({ investigationId, analysis, trace }: AssistantPanelProps) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || loading) return;

    setError('');
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg].slice(-MAX_MESSAGES);
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await investigationsApi.askAssistant(investigationId, {
        message: trimmed,
        history: nextMessages.slice(0, -1), // prior history without the new user turn
        analysis,
        limitReached: trace.limitReached,
      });

      setMessages(prev => {
        const updated = [...prev, { role: 'assistant' as const, content: result.reply }];
        return updated.slice(-MAX_MESSAGES);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assistant request failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      // Re-focus input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, loading, investigationId, analysis, trace]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleReset() {
    setMessages([]);
    setError('');
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const charsRemaining = MAX_INPUT_CHARS - input.length;
  const overLimit = charsRemaining < 0;

  return (
    <div style={{
      background:   'var(--surface-2)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      display:      'flex',
      flexDirection:'column',
      overflow:     'hidden',
      minHeight:    480,
    }}>
      {/* Header */}
      <div style={{
        padding:      '14px 20px',
        borderBottom: '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        background:   'var(--surface-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            AI Investigation Assistant
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            title="Clear conversation"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 'var(--r-sm)',
            }}
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '8px 20px',
        fontSize: 11,
        color: 'var(--text-muted)',
        background: 'var(--bg-app)',
        borderBottom: '1px solid var(--border)',
      }}>
        AI responses interpret the supplied investigation evidence only. They do not establish fraud, ownership, or criminal intent. Verify all findings independently.
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <EmptyState onPromptClick={sendMessage} />
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
            <span>Analysing investigation context…</span>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--danger-muted)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--r-md)',
            color: 'var(--danger)',
            fontSize: 13,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              id="assistant-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask about this investigation… (Enter to send, Shift+Enter for new line)"
              maxLength={MAX_INPUT_CHARS + 100} // soft cap; overLimit handled visually
              rows={2}
              style={{
                width: '100%',
                resize: 'none',
                background: 'var(--bg-app)',
                border: `1px solid ${overLimit ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)',
                color: 'var(--text-primary)',
                fontSize: 13,
                padding: '10px 12px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />
            {input.length > MAX_INPUT_CHARS * 0.8 && (
              <span style={{
                position: 'absolute',
                bottom: 6,
                right: 10,
                fontSize: 10,
                color: overLimit ? 'var(--danger)' : 'var(--text-muted)',
              }}>
                {charsRemaining}
              </span>
            )}
          </div>
          <button
            type="submit"
            id="assistant-send"
            disabled={loading || !input.trim() || overLimit}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--r-md)',
              color: '#fff',
              cursor: loading || !input.trim() || overLimit ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() || overLimit ? 0.5 : 1,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Send"
          >
            {loading
              ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Send size={16} />
            }
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          Context: {analysis.traceStatistics.uniqueTransactions} transactions · {analysis.traceStatistics.uniqueAddresses} addresses · Risk {analysis.riskScore}/100
        </p>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function EmptyState({ onPromptClick }: { onPromptClick: (p: string) => void }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 16 }}>
      <Bot size={28} style={{ color: 'var(--accent)', marginBottom: 12, opacity: 0.7 }} />
      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8 }}>
        Ask the AI about this investigation
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        The assistant uses the analysis data above as its only context.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPromptClick(p)}
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '6px 12px',
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? 'var(--r-lg) var(--r-lg) var(--r-sm) var(--r-lg)' : 'var(--r-lg) var(--r-lg) var(--r-lg) var(--r-sm)',
        background: isUser ? 'var(--accent)' : 'var(--surface-3)',
        color: isUser ? '#fff' : 'var(--text-primary)',
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: isUser ? 'none' : '1px solid var(--border)',
      }}>
        {!isUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.7 }}>
            <Bot size={12} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TraceX AI
            </span>
          </div>
        )}
        {msg.content}
      </div>
    </div>
  );
}
