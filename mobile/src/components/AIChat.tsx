import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2, Send, PlusCircle, FileText, Percent, History,
  CheckCheck, Package, TrendingUp, Bot,
} from 'lucide-react';
import { Screen, ChatMessage } from '../types';
import { BottomNav } from './Dashboard';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

interface AIChatProps { onNavigate: (screen: Screen) => void; }

const SUGGESTIONS = [
  'What is our total revenue?',
  'Which products are low on stock?',
  'Show me the best-selling product.',
  'Which items need reordering?',
  'Revenue by category?',
];

// Strip markdown asterisks and list dashes from AI output
function cleanResponse(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^-\s+/gm, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .trim();
}

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0070f3" />
    <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
    <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
  </svg>
);

export default function AIChat({ onNavigate }: AIChatProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello. I am your AI Business Assistant powered by LangGraph. Ask me anything about your sales, inventory, or purchase orders.',
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userContent = input.trim();
    setInput('');
    setStreaming(true);

    setMessages(prev => [...prev, { role: 'user', content: userContent }]);
    // Add empty assistant message — cursor will blink while streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/stream/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userContent }),
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token && !data.done) {
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = {
                    role: 'assistant',
                    content: u[u.length - 1].content + data.token,
                  };
                  return u;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = {
          role: 'assistant',
          content: 'Error: ' + (err.message || 'Something went wrong.'),
        };
        return u;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearConversation = () => {
    setMessages([{ role: 'assistant', content: 'Conversation cleared. How can I help you?' }]);
  };

  return (
    <motion.div
      className="bg-background text-on-surface font-sans min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header — no bell */}
      <header className="bg-surface flex justify-between items-center px-6 py-4 w-full fixed top-0 z-[60]">
        <div className="flex items-center gap-3">
          <LogoMark />
          <h1 className="text-xl font-extrabold tracking-tighter text-white font-headline">AutoBiz AI</h1>
        </div>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-bright transition-colors text-primary"
          onClick={clearConversation}
        >
          <Trash2 size={18} />
        </button>
      </header>

      {/* Messages */}
      <main className="pt-20 pb-44 min-h-screen px-4">
        <div className="space-y-6 flex flex-col max-w-2xl mx-auto">
          <div className="flex justify-center mt-4">
            <span className="font-mono text-[10px] text-outline uppercase tracking-widest bg-surface-container-low px-3 py-1 rounded-full">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isStreaming = streaming && isLast && msg.role === 'assistant';
              const displayContent = msg.role === 'assistant' ? cleanResponse(msg.content) : msg.content;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end self-end max-w-[85%]' : 'items-start max-w-[85%]'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(0,112,243,0.3)]">
                        <Bot size={13} className="text-white" />
                      </div>
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">AutoBiz Manager</span>
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl shadow-xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-container text-white rounded-tr-none shadow-[0_4px_20px_rgba(0,112,243,0.25)]'
                      : 'bg-surface-container-high text-on-surface rounded-tl-none'
                  }`}>
                    {displayContent}
                    {/* Blinking cursor while streaming — no loading indicator */}
                    {isStreaming && (
                      <motion.span
                        className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-bottom"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex items-center gap-1 mt-1 mr-1">
                      <span className="font-mono text-[9px] text-outline">Sent</span>
                      <CheckCheck size={11} className="text-primary" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input area */}
      <div className="fixed bottom-20 left-0 w-full z-40 px-4">
        <div className="max-w-2xl mx-auto">
          {messages.length <= 1 && (
            <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/10 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-bright transition-colors flex-shrink-0"
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="glass-panel p-2 rounded-[20px] shadow-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high text-outline transition-all flex-shrink-0">
                <PlusCircle size={22} />
              </button>
              <textarea
                className="flex-1 bg-surface-container-lowest rounded-[14px] px-4 py-3 border border-transparent focus:border-primary-container/30 transition-all text-sm placeholder:text-outline/50 text-white outline-none resize-none"
                disabled={streaming}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about sales, inventory or trends..."
                rows={1}
                value={input}
              />
              <button
                className={`w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0 ${
                  input.trim() && !streaming
                    ? 'bg-primary-container text-white shadow-[0_0_20px_rgba(0,112,243,0.4)]'
                    : 'bg-surface-container-high text-outline cursor-not-allowed'
                }`}
                disabled={!input.trim() || streaming}
                onClick={sendMessage}
              >
                <Send size={18} fill={input.trim() && !streaming ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="flex gap-2 mt-2 px-1 overflow-x-auto no-scrollbar pb-1">
              {[
                { Icon: FileText, label: 'Generate Report', msg: 'Generate a sales report' },
                { Icon: Percent,  label: 'Check Margins',   msg: 'What are our profit margins?' },
                { Icon: History,  label: 'Past Orders',     msg: 'Show recent purchase orders' },
              ].map(({ Icon, label, msg }, i) => (
                <button
                  key={i}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/10 text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5 hover:bg-surface-bright transition-colors"
                  onClick={() => setInput(msg)}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav activeScreen={Screen.AIChat} onNavigate={onNavigate} />
    </motion.div>
  );
}