import { useState, useEffect, useRef } from 'react'
import { askDoctorAIChat, getDoctorAISummary } from '../../api'

export default function DoctorAIChatbot({ patientId, patientName, medicardId, onClose }) {
  const [messages, setMessages] = useState([])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    'Summarize patient history',
    'Check active medications & interactions',
    'Review recent laboratory reports',
    'Are there any recorded allergies?',
  ])

  const chatBottomRef = useRef(null)

  useEffect(() => {
    async function loadSummary() {
      try {
        setInitialLoading(true)
        const res = await getDoctorAISummary(patientId)
        if (res.success && res.data) {
          setMessages([
            {
              role: 'assistant',
              text: res.data.summary,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])
        } else {
          setMessages([
            {
              role: 'assistant',
              text: `Hello Doctor. I am your MediCard Clinical Assistant for **${patientName || 'this patient'}**. How can I help you analyze their medical history?`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])
        }
      } catch (err) {
        setMessages([
          {
            role: 'assistant',
            text: `Hello Doctor. I am ready to answer any questions regarding **${patientName}**'s records, active medications, and lab reports.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      } finally {
        setInitialLoading(false)
      }
    }

    if (patientId) {
      loadSummary()
    }
  }, [patientId, patientName])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(queryText) {
    const text = (queryText || inputQuery).trim()
    if (!text || loading) return

    const userMsg = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputQuery('')
    setLoading(true)

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.text,
      }))

      const res = await askDoctorAIChat(patientId, text, historyPayload)
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        if (res.data.suggestedQuestions?.length > 0) {
          setSuggestedQuestions(res.data.suggestedQuestions)
        }
      } else {
        throw new Error(res.message || 'Failed to get answer')
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ **Clinical Assistant Error:** ${err.message || 'Unable to retrieve clinical synthesis. Please try again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Format simple markdown into HTML elements
  function renderFormattedText(txt) {
    if (!txt) return null
    return (
      <div className="ai-markdown-content">
        {txt.split('\n\n').map((para, pIdx) => {
          if (para.startsWith('### ')) {
            return <h4 key={pIdx} className="ai-h3">{para.replace('### ', '')}</h4>
          }
          if (para.startsWith('#### ')) {
            return <h5 key={pIdx} className="ai-h4">{para.replace('#### ', '')}</h5>
          }
          return (
            <p key={pIdx} className="ai-para">
              {para.split('\n').map((line, lIdx) => (
                <span key={lIdx}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="doctor-ai-drawer" aria-label="Clinical AI Assistant">
      <div className="doctor-ai-header">
        <div className="doctor-ai-title-wrap">
          <div className="doctor-ai-badge">Gemini Clinical AI</div>
          <h3 className="doctor-ai-title">{patientName}</h3>
          <span className="doctor-ai-sub">ID: {medicardId || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px' }}>
            ⚡ RAG + Multi-turn
          </span>
          <button
            type="button"
            className="doctor-ai-close-btn"
            onClick={onClose}
            aria-label="Close AI Assistant"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="doctor-ai-quick-bar">
        <div className="doctor-ai-quick-label">⚡ Quick Clinical Prompts:</div>
        <div className="doctor-ai-pills">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="doctor-ai-pill"
              disabled={loading}
              onClick={() => handleSend(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="doctor-ai-messages">
        {initialLoading && (
          <div className="doctor-ai-loading-box">
            <span className="doctor-ai-spinner"></span>
            <span>Synthesizing patient records & clinical history...</span>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`doctor-ai-msg ${m.role === 'user' ? 'doctor-ai-msg-user' : 'doctor-ai-msg-assistant'}`}>
            <div className="doctor-ai-msg-avatar">
              {m.role === 'user' ? '👨‍⚕️' : '🤖'}
            </div>
            <div className="doctor-ai-msg-bubble">
              <div className="doctor-ai-msg-header">
                <span className="doctor-ai-sender">{m.role === 'user' ? 'Dr. Anita Rao' : 'MediCard AI'}</span>
                <span className="doctor-ai-time">{m.timestamp}</span>
              </div>
              <div className="doctor-ai-msg-body">{renderFormattedText(m.text)}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="doctor-ai-msg doctor-ai-msg-assistant">
            <div className="doctor-ai-msg-avatar">🤖</div>
            <div className="doctor-ai-msg-bubble doctor-ai-typing">
              <span>Thinking & cross-referencing PostgreSQL records...</span>
              <span className="doctor-ai-dots">...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      <form
        className="doctor-ai-input-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <input
          type="text"
          className="doctor-ai-input"
          placeholder={`Ask anything about ${patientName || 'this patient'}...`}
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="doctor-ai-send-btn"
          disabled={loading || !inputQuery.trim()}
        >
          Send
        </button>
      </form>
    </aside>
  )
}
