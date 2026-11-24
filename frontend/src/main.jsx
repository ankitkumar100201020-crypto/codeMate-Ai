import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

const tools = [
  { id: 'chat', icon: '◉', label: 'AI Chat', prompt: '' },
  { id: 'generate', icon: '⌘', label: 'Generate Code', prompt: 'Generate code for: ' },
  { id: 'debug', icon: '⌁', label: 'Debug Code', prompt: 'Find and fix the errors in this code:\n' },
  { id: 'explain', icon: '▤', label: 'Explain Code', prompt: 'Explain this code in beginner-friendly steps:\n' },
  { id: 'convert', icon: '⇄', label: 'Convert Code', prompt: 'Convert this code to the language I specify:\n' },
]
const starters = [
  { icon: '⌘', title: 'Generate code', detail: 'Create a program from an idea', text: 'Write a Python program to check if a number is prime.' },
  { icon: '⌁', title: 'Debug my code', detail: 'Help find and fix a bug', text: 'Help me debug this code and explain the fix: ' },
  { icon: '▤', title: 'Explain code', detail: 'Understand code step by step', text: 'Explain recursion in C++ with a simple example.' },
  { icon: '⇄', title: 'Convert language', detail: 'Translate code between languages', text: 'Convert this Python program to C++: ' },
]

function renderText(text) {
  // Lightweight markdown-ish renderer: code fences and plain text paragraphs.
  const parts = text.split(/```([\w+#.-]*)\n([\s\S]*?)```/g)
  return parts.map((part, i) => {
    if (i % 3 === 1) return null
    if (i % 3 === 2) return <CodeBlock key={i} lang={parts[i - 1] || 'code'} code={part} />
    return part.split('\n').map((line, j) => line ? <p key={`${i}-${j}`}>{line}</p> : <div key={`${i}-${j}`} className="spacer-line" />)
  })
}
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(code.trim()); setCopied(true); setTimeout(() => setCopied(false), 1400) }
  return <div className="code-block"><div className="code-head"><span>{lang || 'code'}</span><button onClick={copy}>{copied ? 'Copied ✓' : 'Copy code'}</button></div><pre><code>{code.trim()}</code></pre></div>
}
function App() {
  const [mode, setMode] = useState('chat')
  const [input, setInput] = useState('')
  const [chats, setChats] = useState([])
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const currentTool = tools.find(t => t.id === mode) || tools[0]
  const isWelcome = chats.length === 0
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chats, busy])

  const newChat = () => { setChats([]); setInput(''); setMode('chat'); inputRef.current?.focus() }
  const submit = async (raw = input) => {
    const text = raw.trim()
    if (!text || busy) return
    const userText = mode === 'chat' ? text : `${currentTool.label}\n\n${text}`
    const updated = [...chats, { role: 'user', content: userText }]
    setChats(updated); setInput(''); setBusy(true)
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode, history: chats.slice(-8).map(m => ({ role: m.role, content: m.content })) })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.detail || payload.reply || 'Request failed')
      setChats(prev => [...prev, { role: 'assistant', content: payload.reply || 'No response returned.' }])
      setHistory(prev => [text.slice(0, 42), ...prev].slice(0, 7))
    } catch (err) {
      setChats(prev => [...prev, { role: 'assistant', content: `Connection error: ${err.message}\n\nPlease check that the Python backend is running and your API key is configured.` }])
    } finally { setBusy(false) }
  }
  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">✦</div><div><b>CodeMate</b><span>AI coding workspace</span></div></div>
      <button className="new-chat" onClick={newChat}><span>＋</span> New chat</button>
      <div className="nav-caption">WORKSPACE</div>
      {tools.map(tool => <button key={tool.id} className={`nav-item ${mode === tool.id ? 'active' : ''}`} onClick={() => { setMode(tool.id); if (tool.prompt && input === '') setInput('') }}><span className="nav-icon">{tool.icon}</span>{tool.label}</button>)}
      <div className="history-area"><div className="nav-caption">RECENT PROMPTS</div>{history.map((h, i) => <div key={i} className="history-item" title={h}>◷ {h}</div>)}</div>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">C</div><div><b>CodeMate User</b><small>Personal workspace</small></div><span className="dots">···</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="top-title">{currentTool.label}<span className="chevron">⌄</span></div><div className="top-right"><span className="status-dot"/> <span>AI connected when configured</span><button className="share" onClick={() => navigator.clipboard.writeText(window.location.href)}>↗ Share</button></div></header>
      <section className={`conversation ${isWelcome ? 'welcome' : ''}`}>
        {isWelcome ? <div className="hero"><div className="hero-symbol">✦</div><div className="eyebrow">YOUR AI DEVELOPMENT PARTNER</div><h1>What are we <span>building</span> today?</h1><p>Ask questions, explore ideas, or get unstuck on your code.</p><div className="starter-grid">{starters.map((s, i) => <button className="starter" key={i} onClick={() => { setMode(tools[i + 1]?.id || 'chat'); setInput(s.text); inputRef.current?.focus() }}><div className="starter-icon">{s.icon}</div><div><b>{s.title}</b><small>{s.detail}</small></div><span className="starter-arrow">↗</span></button>)}</div></div>
        : <div className="message-list">{chats.map((m, i) => <div className={`message-row ${m.role}`} key={i}><div className={`message-avatar ${m.role}`}>{m.role === 'user' ? 'U' : '✦'}</div><div className="message-content"><div className="message-name">{m.role === 'user' ? 'You' : 'CodeMate AI'}</div><div className="message-text">{m.role === 'assistant' ? renderText(m.content) : <p>{m.content}</p>}</div></div></div>)}{busy && <div className="message-row assistant"><div className="message-avatar assistant">✦</div><div className="message-content"><div className="message-name">CodeMate AI</div><div className="thinking"><i/><i/><i/> <span>Thinking through your question…</span></div></div></div>}<div ref={endRef}/></div>}
      </section>
      <div className="composer-wrap"><div className="composer"><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'chat' ? 'Ask CodeMate anything about coding…' : `${currentTool.label}: paste code or describe what you need…`} rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} /><div className="composer-tools"><div className="left-tools"><span className="mode-pill">⌘ <span>{currentTool.label}</span></span><span className="hint">Shift + Enter for new line</span></div><button className="send" disabled={!input.trim() || busy} onClick={() => submit()}>{busy ? '…' : '↑'}</button></div></div><div className="footnote">CodeMate can make mistakes. Review generated code before running it.</div></div>
    </main>
  </div>
}


createRoot(document.getElementById('root')).render(<App />)
