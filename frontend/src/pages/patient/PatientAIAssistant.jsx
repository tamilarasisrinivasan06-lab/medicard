import { useState, useEffect, useRef } from 'react'
import {
  askPatientAIAssistant,
  generatePatientAISummary,
  submitPatientAIIntake,
  getPatientAIIntakes,
  getPatientPortalDoctors,
  getMyProfile,
} from '../../api'
import {
  Card,
  Alert,
  EmptyState,
  StatusBadge,
  Modal,
  PageHeader,
  formatDateTime,
} from '../../components/doctor/ui'
import {
  BotIcon,
  MicIcon,
  SpeakerIcon,
  SendIcon,
  StethoscopeIcon,
  AlertIcon,
  ClockIcon,
  CheckIcon,
  HeartIcon,
} from '../../components/doctor/icons'

const QUICK_CHIPS = [
  'Headache & Fever',
  'Chest tightness / Cough',
  'Stomach ache & Nausea',
  'Skin allergy or rash',
  'Routine medication check-up',
]

export default function PatientAIAssistant() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [patientName, setPatientName] = useState('there')
  const [suggestedChips, setSuggestedChips] = useState(QUICK_CHIPS)
  const [redFlags, setRedFlags] = useState([])
  const [readyToSummarize, setReadyToSummarize] = useState(false)

  // Voice recognition & speech synthesis
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef(null)

  // Intake Report & Submission Modal
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [doctorsList, setDoctorsList] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [patientVitals, setPatientVitals] = useState({
    painScale: '5',
    temperature: '',
    bloodPressure: '',
    heartRate: '',
  })
  const [submittingIntake, setSubmittingIntake] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Tab: Assistant vs Past Intake History
  const [activeTab, setActiveTab] = useState('chat')
  const [historyList, setHistoryList] = useState([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  const chatBottomRef = useRef(null)

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recog = new SpeechRecognition()
      recog.continuous = false
      recog.interimResults = false
      recog.lang = 'en-US'

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
        setIsListening(false)
      }

      recog.onerror = () => {
        setIsListening(false)
      }

      recog.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recog
    }
  }, [])

  // Load patient profile & doctors
  useEffect(() => {
    getMyProfile()
      .then((res) => {
        if (res.success && res.data?.name) {
          setPatientName(res.data.name)
          setMessages([
            {
              role: 'assistant',
              text: `Hello ${res.data.name}! 👋 I am your MediCard AI Virtual Health Assistant.\n\nI can ask you a few targeted questions about how you are feeling, check your symptoms, and compile a structured clinical report to send directly to your doctor.\n\nWhat brings you in or how are you feeling today?`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])
        }
      })
      .catch(() => {
        setMessages([
          {
            role: 'assistant',
            text: `Hello! 👋 I am your MediCard AI Virtual Health Assistant. What symptoms or health concerns would you like to discuss today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      })

    getPatientPortalDoctors()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDoctorsList(res.data)
          if (res.data.length > 0) {
            setSelectedDoctorId(String(res.data[0].doctorId || res.data[0].id))
          }
        }
      })
      .catch(() => {})

    loadIntakeHistory()
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function loadIntakeHistory() {
    getPatientAIIntakes()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setHistoryList(res.data)
        }
      })
      .catch(() => {})
  }

  function speakText(text) {
    if (!voiceEnabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[*#_`]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  function toggleListening() {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        setIsListening(false)
      }
    }
  }

  async function handleSendMessage(customText) {
    const textToSend = (customText || inputText).trim()
    if (!textToSend || loading) return

    const userMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setLoading(true)

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }))

      const res = await askPatientAIAssistant(textToSend, historyPayload)
      if (res.success && res.data) {
        const replyText = res.data.reply
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])

        if (res.data.suggestedResponses?.length > 0) {
          setSuggestedChips(res.data.suggestedResponses)
        }

        if (res.data.redFlags?.length > 0) {
          setRedFlags(res.data.redFlags)
        }

        if (res.data.readyToSummarize) {
          setReadyToSummarize(true)
        }

        speakText(replyText)
      } else {
        throw new Error(res.message || 'Error getting response')
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I've noted that. Could you provide a bit more detail regarding how severe it feels or when it started?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenSummary() {
    setSummaryModalOpen(true)
    setGeneratingSummary(true)
    setSubmitSuccess(false)

    try {
      const res = await generatePatientAISummary({
        conversation: messages,
        chiefComplaint: messages.find((m) => m.role === 'user')?.text || 'Clinical Consultation Intake',
        vitals: patientVitals,
      })

      if (res.success && res.data) {
        setSummaryData(res.data)
      }
    } catch (err) {
      // Fallback
    } finally {
      setGeneratingSummary(false)
    }
  }

  async function handleConfirmSubmitIntake() {
    if (!summaryData?.clinicalSummary) return
    setSubmittingIntake(true)

    try {
      const res = await submitPatientAIIntake({
        doctorId: selectedDoctorId || null,
        chiefComplaint: summaryData.chiefComplaint || 'Virtual Intake',
        symptoms: messages.filter((m) => m.role === 'user').map((m) => m.text).join('; '),
        duration: 'Reported in intake note',
        severity: summaryData.severity || 'moderate',
        vitals: patientVitals,
        transcript: messages,
        clinicalSummary: summaryData.clinicalSummary,
      })

      if (res.success) {
        setSubmitSuccess(true)
        loadIntakeHistory()
      }
    } catch (err) {
      alert('Failed to dispatch intake report. Please try again.')
    } finally {
      setSubmittingIntake(false)
    }
  }

  return (
    <div className="patient-ai-page" style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <PageHeader
        title="AI Virtual Health Assistant"
        subtitle="Conversational symptom triage, medical history intake, and instant clinical report generation for your doctor"
        badge={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 600,
              }}
            >
              <BotIcon size={14} /> AI Triage Active
            </span>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'chat' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'chat' ? '#0284c7' : '#64748b',
          }}
        >
          💬 Virtual Intake Assistant
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'history' ? '#0284c7' : '#64748b',
          }}
        >
          📋 Submitted Reports ({historyList.length})
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem' }}>
          {/* Main Chat Area */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              height: '620px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Header controls inside chat */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <BotIcon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>MediCare Virtual Assistant</div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    Online & Ready
                  </div>
                </div>
              </div>

              {/* Voice playback toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceEnabled) window.speechSynthesis?.cancel()
                    setVoiceEnabled(!voiceEnabled)
                  }}
                  title={voiceEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: voiceEnabled ? '#f0fdf4' : '#f8fafc',
                    color: voiceEnabled ? '#166534' : '#64748b',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  <SpeakerIcon size={14} />
                  {voiceEnabled ? 'Voice On' : 'Voice Off'}
                </button>
              </div>
            </div>

            {/* Red Flag Emergency Banner */}
            {redFlags.length > 0 && (
              <div
                style={{
                  background: '#fef2f2',
                  borderBottom: '1px solid #fee2e2',
                  padding: '0.75rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                }}
              >
                <AlertIcon size={18} />
                <div>
                  <strong>Urgent Attention:</strong> High-risk symptoms noted ({redFlags.join(', ')}). If you are experiencing emergency distress, call emergency services immediately.
                </div>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '0.85rem 1.1rem',
                      borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      background: m.role === 'user' ? '#0284c7' : '#f1f5f9',
                      color: m.role === 'user' ? '#fff' : '#1e293b',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    {m.text}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', padding: '0 4px' }}>
                    {m.timestamp}
                  </span>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#0284c7', borderRadius: '50%' }} />
                  MediCare Assistant is reviewing your symptoms…
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Answer Suggestion Chips */}
            {suggestedChips.length > 0 && (
              <div
                style={{
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  gap: '0.4rem',
                  overflowX: 'auto',
                  borderTop: '1px solid #f1f5f9',
                  background: '#fafafa',
                }}
              >
                {suggestedChips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (chip.includes('Generate') || chip.includes('Report')) {
                        handleOpenSummary()
                      } else {
                        handleSendMessage(chip)
                      }
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: '0.8rem',
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#0284c7'
                      e.currentTarget.style.color = '#0284c7'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1'
                      e.currentTarget.style.color = '#334155'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar with Mic & Send Buttons */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#fff',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Listening… Click to stop' : 'Click to speak your symptoms'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isListening ? '#ef4444' : '#f1f5f9',
                  color: isListening ? '#fff' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                  flexShrink: 0,
                }}
              >
                <MicIcon size={18} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? 'Listening to your voice…' : 'Describe your symptoms or answer the questions…'}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.95rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  border: 'none',
                  background: inputText.trim() && !loading ? '#0284c7' : '#e2e8f0',
                  color: inputText.trim() && !loading ? '#fff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputText.trim() && !loading ? 'pointer' : 'default',
                  flexShrink: 0,
                }}
              >
                <SendIcon size={18} />
              </button>
            </form>
          </div>

          {/* Right Sidebar: Quick Summary & Doctor Handover action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <StethoscopeIcon size={18} style={{ color: '#0284c7' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Doctor Intake Handover</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                When you've finished answering questions, generate your <strong>SBAR Clinical Intake Note</strong> to send to your physician.
              </p>

              <button
                type="button"
                onClick={handleOpenSummary}
                disabled={messages.filter((m) => m.role === 'user').length === 0}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: messages.filter((m) => m.role === 'user').length === 0 ? 'not-allowed' : 'pointer',
                  opacity: messages.filter((m) => m.role === 'user').length === 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)',
                }}
              >
                📄 Generate Doctor Report
              </button>
            </Card>

            <Card>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#334155' }}>Voice Assistant Tips:</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
                <li>Click the <strong>Microphone</strong> icon to speak hands-free.</li>
                <li>Describe when symptoms began and their pain level (1 to 10).</li>
                <li>Your speech is converted instantly on your device with zero audio uploads.</li>
              </ul>
            </Card>

            <Card>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#334155' }}>Patient Safety Notice:</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                This virtual intake assistant organizes pre-consultation information for your licensed physician. It does not replace emergency medical care or clinical diagnoses.
              </p>
            </Card>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div>
          {historyList.length === 0 ? (
            <EmptyState
              title="No past intake reports"
              description="When you complete an intake chat and submit it to your doctor, your clinical summaries will appear here."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {historyList.map((item) => (
                <Card key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>
                      {item.chief_complaint || 'Symptom Review'}
                    </div>
                    <StatusBadge
                      status={item.status === 'submitted' ? 'pending' : 'completed'}
                      label={item.status.toUpperCase()}
                    />
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <div>Doctor: {item.doctor_name ? `Dr. ${item.doctor_name}` : 'General Clinic Dispatch'}</div>
                    <div>Date: {formatDateTime(item.created_at)}</div>
                    <div>Severity: <strong style={{ textTransform: 'capitalize' }}>{item.severity}</strong></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedHistoryItem(item)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0284c7',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    View Clinical SBAR Summary
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Review & Submit Modal */}
      {summaryModalOpen && (
        <Modal
          title="Review & Send Intake Report to Doctor"
          onClose={() => setSummaryModalOpen(false)}
        >
          {generatingSummary ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#0284c7', borderRadius: '50%' }} />
              Synthesizing conversation into clinical SBAR report…
            </div>
          ) : submitSuccess ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <CheckIcon size={24} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>Report Sent Successfully!</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>
                Your clinical intake summary and symptom notes have been securely dispatched to your physician.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSummaryModalOpen(false)
                  setActiveTab('history')
                }}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View in Intake History
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    Select Attending Doctor
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  >
                    {doctorsList.length === 0 ? (
                      <option value="">General Clinic Intake (Any Available Doctor)</option>
                    ) : (
                      doctorsList.map((doc) => (
                        <option key={doc.doctorId || doc.id} value={doc.doctorId || doc.id}>
                          Dr. {doc.name || doc.fullName} ({doc.specialization || 'Physician'})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ width: '130px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    Pain Scale (1-10)
                  </label>
                  <select
                    value={patientVitals.painScale}
                    onChange={(e) => setPatientVitals({ ...patientVitals, painScale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} - {n < 4 ? 'Mild' : n < 7 ? 'Moderate' : 'Severe'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clinical SBAR Preview */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Generated SBAR Clinical Summary
                </label>
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    fontFamily: 'monospace',
                  }}
                >
                  {summaryData?.clinicalSummary}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSummaryModalOpen(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmitIntake}
                  disabled={submittingIntake}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: submittingIntake ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {submittingIntake ? 'Sending…' : '🚀 Dispatch to Doctor'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <Modal
          title={`Intake Report: ${selectedHistoryItem.chief_complaint}`}
          onClose={() => setSelectedHistoryItem(null)}
        >
          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
            <div><strong>Attending Doctor:</strong> {selectedHistoryItem.doctor_name ? `Dr. ${selectedHistoryItem.doctor_name}` : 'General Clinic'}</div>
            <div><strong>Submitted:</strong> {formatDateTime(selectedHistoryItem.created_at)}</div>
            <div><strong>Status:</strong> {selectedHistoryItem.status.toUpperCase()}</div>
          </div>

          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
              fontFamily: 'monospace',
            }}
          >
            {selectedHistoryItem.clinical_summary}
          </div>
        </Modal>
      )}
    </div>
  )
}
