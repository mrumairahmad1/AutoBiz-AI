import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar.jsx'

const HISTORY_KEY = 'autobiz_manager_history'
const loadHistory = () => { try { const r = sessionStorage.getItem(HISTORY_KEY); if (r) return JSON.parse(r) } catch {} return null }
const saveHistory = msgs => { try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(msgs)) } catch {} }

const cleanResponse = text => {
  if (!text) return text
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/(?<![0-9\s])\*(?!\s*[0-9])(.+?)(?<![0-9])\*(?![0-9])/gs, '$1')
    .replace(/^[*\-]\s+/gm, '')
    .replace(/^(-{3,}|\*{3,})$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const buildHistory = messages =>
  messages.filter(m => m.content?.trim()).slice(1).slice(-20)
    .map(m => ({ role: m.role, content: m.content }))

const WELCOME = {
  role: 'assistant',
  content: 'Hello. I am your Manager Agent. Ask me anything about your sales, inventory, or purchase orders. I maintain full context of our conversation.',
  ts: Date.now(),
}

const SendIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const AgentIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z"/></svg>
const UserIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>

const SUGGESTIONS = [
  'What is our total revenue this month?',
  'Which products are running low on stock?',
  'Show our best selling products.',
  'Which items need to be reordered?',
  'Show revenue breakdown by category.',
]

const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

/**
 * Returns true if the message content looks like an error/API-failure response.
 * We suppress the accuracy badge for these cases.
 */
function isErrorResponse(content) {
  if (!content) return true
  const lower = content.toLowerCase()
  return (
    lower.startsWith('error:') ||
    lower.includes('rate limit') ||
    lower.includes('api limit') ||
    lower.includes('too many requests') ||
    lower.includes('something went wrong') ||
    lower.includes('stream failed') ||
    lower.includes('service unavailable') ||
    lower.includes('timed out') ||
    lower.includes('overloaded') ||
    lower.includes('quota exceeded')
  )
}

function AccuracyBadge({ accuracy, responseTime, intent, content, streaming }) {
  // Never show while still streaming
  if (streaming) return null

  // Never show on error or API-limit responses
  if (isErrorResponse(content)) return null

  // Only show for business intents that actually went through an agent
  const businessIntents = ['sales', 'inventory', 'sales_action', 'inventory_action']
  if (!businessIntents.includes(intent)) return null

  // Only show once accuracy is available (a real number, not null/undefined)
  if (accuracy === null || accuracy === undefined || typeof accuracy !== 'number') return null

  const color = accuracy >= 95 ? 'var(--green)' : accuracy >= 90 ? 'var(--amber)' : 'var(--red)'
  const label = (intent === 'inventory_action' || intent === 'sales_action') ? 'Action'
    : intent === 'inventory' ? 'Inventory' : 'Sales'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 100, padding: '2px 8px' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }}/>
        <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{accuracy}%</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</span>
      </div>
      {responseTime > 0 && (
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {responseTime > 1000 ? `${(responseTime / 1000).toFixed(1)}s` : `${responseTime}ms`}
        </span>
      )}
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState(() => loadHistory() || [WELCOME])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { token } = useAuth()
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { saveHistory(messages) }, [messages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const clearHistory = useCallback(() => {
    sessionStorage.removeItem(HISTORY_KEY)
    setMessages([{ ...WELCOME, ts: Date.now() }])
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const currentInput   = input.trim()
    const historyPayload = buildHistory(messages)
    const userMsg = { role: 'user', content: currentInput, ts: Date.now() }

    // Add user message + placeholder assistant message
    setMessages(p => [
      ...p,
      userMsg,
      {
        role: 'assistant', content: '', ts: Date.now(),
        accuracy: null, responseTime: null, intent: null,
        streaming: true, isError: false,
      },
    ])
    setInput('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/stream/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: currentInput, history: historyPayload }),
      })
      if (!res.ok) throw new Error(`Stream failed: ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token && !data.done) {
              setMessages(p => {
                const u = [...p]
                u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + data.token }
                return u
              })
            }
            if (data.done) {
              setMessages(p => {
                const u    = [...p]
                const last = u[u.length - 1]
                const acc  = data.accuracy || {}
                const finalContent = cleanResponse(last.content)
                const hasError = isErrorResponse(finalContent)

                u[u.length - 1] = {
                  ...last,
                  content:      finalContent,
                  // Only store accuracy metadata if this is NOT an error response
                  accuracy:     hasError ? null : (acc.accuracy     ?? null),
                  responseTime: hasError ? null : (acc.response_time_ms ?? null),
                  intent:       hasError ? null : (acc.intent        ?? null),
                  streaming:    false,
                  isError:      hasError,
                }
                return u
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      // Network/stream error — mark as error so badge is suppressed
      setMessages(p => {
        const u = [...p]
        u[u.length - 1] = {
          ...u[u.length - 1],
          content:   'Error: ' + (err.message || 'Something went wrong.'),
          streaming: false,
          isError:   true,
          accuracy:  null,
          intent:    null,
        }
        return u
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const handleChange  = e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }

  return (
    <div style={{ background: 'var(--void)', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .msg-enter { animation: fade-up 0.28s var(--ease) both; }
        .cursor-blink { animation: cursor-blink 1s ease-in-out infinite; display:inline-block; width:2px; height:14px; background:var(--blue-light); vertical-align:text-bottom; margin-left:2px; border-radius:1px; }
        .sugg-chip { background:var(--elevated); border:1px solid var(--border); border-radius:var(--r-md); padding:8px 14px; font-size:13px; color:var(--text-muted); cursor:pointer; transition:var(--t); white-space:nowrap; font-family:var(--font-body); }
        .sugg-chip:hover { border-color:var(--border-hi); color:var(--text); background:rgba(29,111,255,0.06); }
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
      <div className="grid-bg" style={{ position: 'fixed' }}/>
      <Navbar/>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 860, width: '100%', margin: '0 auto', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(29,111,255,0.1)', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-light)' }}><AgentIcon/></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Manager Agent</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s ease-in-out infinite' }}/>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Online · Context-aware · Sales and Inventory</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{messages.length - 1} messages</span>
            <button onClick={clearHistory} className="btn btn-ghost btn-sm" style={{ padding: '5px 8px', gap: 5, fontSize: 12 }}>
              <TrashIcon/> Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} className="msg-enter" style={{ display: 'flex', gap: 11, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'rgba(29,111,255,0.1)', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-light)', flexShrink: 0 }}><AgentIcon/></div>
              )}
              <div>
                <div style={{ maxWidth: 640, padding: msg.role === 'user' ? '11px 16px' : '13px 17px', borderRadius: msg.role === 'user' ? 'var(--r-lg) var(--r-lg) 4px var(--r-lg)' : 'var(--r-lg) var(--r-lg) var(--r-lg) 4px', background: msg.role === 'user' ? 'var(--blue)' : 'var(--card)', color: msg.role === 'user' ? '#fff' : 'var(--text)', border: msg.role === 'user' ? 'none' : '1px solid var(--border)', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: msg.role === 'user' ? '0 4px 14px rgba(29,111,255,0.25)' : 'var(--shadow)' }}>
                  {msg.content}
                  {loading && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && <span className="cursor-blink"/>}
                  {loading && i === messages.length - 1 && msg.role === 'assistant' && msg.content  && <span className="cursor-blink"/>}
                </div>
                {/* Timestamp + accuracy — accuracy hidden on errors */}
                {msg.ts && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12, paddingLeft: msg.role === 'assistant' ? 2 : 0, paddingRight: msg.role === 'user' ? 2 : 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{fmtTime(msg.ts)}</span>
                    {msg.role === 'assistant' && (
                      <AccuracyBadge
                        accuracy={msg.accuracy}
                        responseTime={msg.responseTime}
                        intent={msg.intent}
                        content={msg.content}
                        streaming={msg.streaming}
                      />
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'rgba(29,111,255,0.08)', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-light)', flexShrink: 0 }}><UserIcon/></div>
              )}
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ padding: '0 20px 14px', overflowX: 'auto', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
              {SUGGESTIONS.map((s, i) => <button key={i} className="sugg-chip" onClick={() => setInput(s)}>{s}</button>)}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', background: 'rgba(12,15,24,0.7)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-md)', borderRadius: 'var(--r-lg)', padding: '10px 10px 10px 16px', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <textarea ref={textareaRef} style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-body)', background: 'transparent', color: 'var(--text)', minHeight: 36, maxHeight: 120, overflow: 'auto' }}
              value={input} onChange={handleChange} onKeyDown={handleKeyDown}
              placeholder="Ask the Manager Agent about sales, inventory, or operations..." rows={1}/>
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: loading || !input.trim() ? 'var(--elevated)' : 'var(--blue)', border: `1px solid ${loading || !input.trim() ? 'var(--border)' : 'transparent'}`, color: loading || !input.trim() ? 'var(--text-dim)' : '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'var(--t)', boxShadow: loading || !input.trim() ? 'none' : '0 4px 12px rgba(29,111,255,0.3)' }}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}/> : <SendIcon/>}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 7 }}>
            Enter to send &nbsp;·&nbsp; Shift+Enter for new line &nbsp;·&nbsp; Business queries only
          </p>
        </div>
      </div>
    </div>
  )
}