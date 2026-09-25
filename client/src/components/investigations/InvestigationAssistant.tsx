// ============================================================
// InvestigationAssistant — Phase 7
// Conversational AI panel rendered inside the Intelligence page.
// Forwards messages to the TraceX backend; never calls OpenAI directly.
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { BrainCircuit, Send, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { investigationsApi } from '../../services/api';
import type {
  ChatMessage,
  InvestigationAnalysis,
  TraceResponse,
} from '../../types';

const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 5_000;

interface InvestigationAssistantProps {
  investigationId: string;
  analysis: InvestigationAnalysis;
  trace: TraceResponse;
}

const STARTER_QUESTIONS = [
  'Why is the risk score this value?',
  'Which addresses are most significant?',
  'Explain the detected patterns.',
  'What should I investigate next?',
  'What limitations should I consider?',
];

export function InvestigationAssistant({
  investigationId,
  analysis,
  trace,
}: InvestigationAssistantProps) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const sendMessage = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextHistory = [...history, userMsg].slice(-MAX_HISTORY);

    setHistory(nextHistory);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const { reply } = await investigationsApi.askAssistant(investigationId, {
        message: trimmed,
        history: nextHistory.slice(0, -1),
        analysis,
        limitReached: trace.limitReached,
      });

      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setHistory(prev => [...prev, assistantMsg].slice(-MAX_HISTORY));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed. Please try again.');
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [history, loading, investigationId, analysis, trace]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  const charCount = input.length;
  const overLimit = charCount > MAX_MESSAGE_CHARS;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 520,
      minHeight: 520,
      flexShrink: 0,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrainCircuit size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            AI Investigation Assistant
          </span>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'rgba(124,92,252,0.15)',
            color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.05em',
          }}>
            BETA
          </span>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            title="Clear conversation"
            onClick={() => { setHistory([]); setError(''); }}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '7px 16px',
        background: 'rgba(245,158,11,0.07)',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
        flexShrink: 0,
        lineHeight: 1.5,
      }}>
        <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        Responses interpret the supplied evidence only. They do not establish fraud, ownership, or criminal intent.
      </div>

      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {history.length === 0 && !loading && (
          <EmptyAssistantState
            onSelectQuestion={(q) => { setInput(q); textareaRef.current?.focus(); }}
          />
        )}

        {history.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--danger-muted)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--r-md)',
            fontSize: 13,
            color: 'var(--danger)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask about this investigation… (Enter to send, Shift+Enter for new line)"
            style={{
              flex: 1,
              resize: 'none',
              background: 'var(--bg-app)',
              border: `1px solid ${overLimit ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              padding: '8px 10px',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <Button
            variant="primary"
            size="sm"
            iconOnly
            disabled={loading || !input.trim() || overLimit}
            onClick={() => void sendMessage(input)}
            title="Send message"
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Send size={14} />}
          </Button>
        </div>
        <div style={{
          fontSize: 11,
          color: overLimit ? 'var(--danger)' : 'var(--text-muted)',
          textAlign: 'right',
        }}>
          {charCount.toLocaleString()} / {MAX_MESSAGE_CHARS.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: isUser ? 'var(--accent)' : 'var(--bg-app)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#fff' : 'var(--text-primary)',
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        padding: '12px 16px',
        borderRadius: '12px 12px 12px 4px',
        background: 'var(--bg-app)',
        border: '1px solid var(--border)',
        display: 'flex',
        gap: 5,
        alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--text-muted)',
            opacity: 0.7,
            animation: `typingPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function EmptyAssistantState({ onSelectQuestion }: { onSelectQuestion: (q: string) => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      paddingTop: 12,
      paddingBottom: 8,
      textAlign: 'center',
    }}>
      <BrainCircuit size={28} style={{ color: 'var(--accent)', opacity: 0.5 }} />
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          Ask about this investigation
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 340 }}>
          The assistant interprets the analysis above. It will only reference the supplied evidence and will not fabricate facts.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 380 }}>
        {STARTER_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onSelectQuestion(q)}
            style={{
              textAlign: 'left',
              padding: '8px 14px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
