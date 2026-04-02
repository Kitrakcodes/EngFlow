import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, MicOff, Send, Award, Phone, MessageSquare, Book, X, RotateCcw, Zap, ChevronDown, ChevronUp, RefreshCw, Search, Sun, Moon, ArrowLeft, Headphones, Mail, Heart, ShieldCheck } from 'lucide-react';

const API = "https://cognivo-backend-5czj.onrender.com/api";
const CATEGORIES = ["Competitive Mastery", "Current Affairs", "Roleplay Scenarios", "Abstract Logic", "Situational", "Global Custom"];
const CONV_TYPES = ["Discussion", "Debate", "Interview", "Casual"];

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [step, setStep] = useState('setup');
  const [category, setCategory] = useState('Competitive Mastery');
  const [topicList, setTopicList] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [localCustomContext, setLocalCustomContext] = useState('');
  const [globalCustomTopic, setGlobalCustomTopic] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [level, setLevel] = useState('Medium');
  const [aiLength, setAiLength] = useState('Balanced');
  const [mode, setMode] = useState('Discussion');
  const [interfaceMode, setInterfaceMode] = useState('Chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // DRAGGABLE DICTIONARY
  const [dictOpen, setDictOpen] = useState(false);
  const [dictPos, setDictPos] = useState({ x: 50, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dictData, setDictData] = useState(null);

  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(0);

  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const isSessionActive = useRef(false);

  const colors = isDark ? {
    bg: '#000', card: '#080808', primary: '#ff0000', text: '#fff', border: 'rgba(255,255,255,0.1)'
  } : {
    bg: '#fff', card: '#fcfcfc', primary: '#ff0000', text: '#000', border: 'rgba(0,0,0,0.1)'
  };

  useEffect(() => {
    fetchTopics('Competitive Mastery');
    const loadV = () => setVoices(window.speechSynthesis.getVoices().filter(v => v.lang.includes('en')));
    loadV(); window.speechSynthesis.onvoiceschanged = loadV;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onstart = () => { if (window.speechSynthesis.speaking) window.speechSynthesis.cancel(); setIsListening(true); };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchTopics = async (cat, context = "") => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/suggest-topics`, { category: cat, customContext: context });
      setTopicList(res.data.topics || res.data);
    } catch (e) { }
    setLoading(false);
  };

  const speak = (text, onEnd) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voices[selectedVoice]) utterance.voice = voices[selectedVoice];
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => { setIsAiSpeaking(false); if (onEnd && isSessionActive.current) onEnd(); };
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceSystem = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript) { setTimeout(() => handleSendMessage(transcript), 2500); }
    };
    recognitionRef.current.start();
    if (interfaceMode === 'Call') initVisualizer();
  };

  // --- FIGURE 1 & 2 DYNAMIC ANIMATIONS ---
  const initVisualizer = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    let time = 0;
    const draw = () => {
      if (!isSessionActive.current) return;
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (isAiSpeaking) {
        // FIGURE 1: Glowing Blue/Red Concentric Orb
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 2;
        for (let i = 0; i < 500; i++) {
          const angle = i * 0.2;
          const r = (30 + Math.sin(time + i * 0.05) * 10) + i * 0.1;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          ctx.fillStyle = i % 2 === 0 ? colors.primary : '#00D1FF';
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      } else {
        // FIGURE 2: Seismograph Multi-Frequency Waves
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.strokeStyle = j === 0 ? colors.primary : (j === 1 ? '#fff' : '#444');
          ctx.globalAlpha = isListening ? 1 - j * 0.3 : 0.1;
          for (let x = 0; x < canvasRef.current.width; x++) {
            const noise = isListening ? Math.random() * 20 : 0;
            const y = 75 + Math.sin(x * 0.03 + time + j) * (isListening ? 30 : 2) + noise;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      time += 0.1;
    };
    draw();
  };

  const handleStart = () => {
    const finalTopic = category === "Global Custom" ? globalCustomTopic : selectedTopic?.title;
    if (!finalTopic) return alert("Select a topic!");
    isSessionActive.current = true;
    setStep('session');
    const welcome = `Cognivo Initiated. Topic: ${finalTopic}. I am listening.`;
    setMessages([{ role: 'model', parts: [{ text: welcome }] }]);
    speak(welcome, () => { if (interfaceMode === 'Call') startVoiceSystem(); });
  };

  const handleSendMessage = async (val) => {
    const text = val || input;
    if (!text.trim() || !isSessionActive.current) return;
    setMessages(prev => [...prev, { role: 'user', parts: [{ text }] }]);
    setInput('');
    try {
      const res = await axios.post(`${API}/chat`, {
        topic: selectedTopic?.title || globalCustomTopic, message: text, history: messages, level, aiLength, mode
      });
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: res.data.text }] }]);
      speak(res.data.text);
    } catch (e) { }
  };

  const handleGetFeedback = async () => {
    isSessionActive.current = false;
    window.speechSynthesis.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/feedback`, { history: messages });
      setFeedback(res.data);
      setStep('feedback');
    } catch (e) { alert("System busy."); window.location.reload(); }
    setLoading(false);
  };

  return (
    <div style={{ background: colors.bg, color: colors.text, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>

      {/* BRANDING */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0 40px 0' }}>
        <div onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
          <div style={{ width: '55px', height: '55px', background: colors.primary, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 40px ${colors.primary}55` }}>
            <Zap size={32} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: '900', letterSpacing: '-2.5px', margin: 0 }}>Cognivo</h1>
        </div>
        <p style={{ color: colors.primary, letterSpacing: '6px', fontWeight: '700', textTransform: 'uppercase', fontSize: '13px', marginTop: '12px' }}>Learn smart. Speak smarter.</p>

        <div style={{ position: 'absolute', right: 40, top: 40, display: 'flex', gap: '15px' }}>
          <button onClick={() => setDictOpen(true)} style={{ background: 'none', border: `1px solid ${colors.border}`, padding: '12px', borderRadius: '50%', color: colors.text, cursor: 'pointer' }}><Book size={20} /></button>
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: `1px solid ${colors.border}`, padding: '12px', borderRadius: '50%', color: colors.text, cursor: 'pointer' }}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
        </div>
      </div>

      {/* DRAGGABLE DICTIONARY */}
      {dictOpen && (
        <div
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={(e) => { if (isDragging) setDictPos({ x: e.clientX - 150, y: e.clientY - 20 }); }}
          style={{ position: 'fixed', left: dictPos.x, top: dictPos.y, width: '320px', background: colors.card, border: `2px solid ${colors.primary}`, zIndex: 3000, borderRadius: '24px', padding: '25px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', cursor: isDragging ? 'grabbing' : 'grab' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ color: colors.primary, margin: 0 }}>Dictionary</h4>
            <X onClick={() => setDictOpen(false)} style={{ cursor: 'pointer' }} size={18} />
          </div>
          <input onKeyPress={(e) => e.key === 'Enter' && axios.post(`${API}/dict`, { word: e.target.value }).then(res => setDictData(res.data))} placeholder="Word..." style={{ width: '100%', padding: '12px', background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '12px', marginTop: '15px', cursor: 'text' }} />
          {dictData && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', color: colors.primary }}>Meaning</p>
              <p style={{ fontSize: '14px', marginBottom: '15px' }}>{dictData.english}</p>
              <p style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', color: colors.primary }}>Hinglish</p>
              <p style={{ fontSize: '14px' }}>{dictData.hinglish}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: '950px', margin: 'auto', padding: '20px 20px 100px 20px' }}>

        {step === 'setup' && (
          <div style={{ animation: 'slideUp 0.6s ease' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '25px', paddingBottom: '10px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => { setCategory(cat); fetchTopics(cat); }} style={{ padding: '12px 25px', borderRadius: '30px', background: category === cat ? colors.primary : 'transparent', border: `1px solid ${category === cat ? colors.primary : colors.border}`, color: colors.text, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600' }}>{cat}</button>
              ))}
            </div>

            <div style={{ background: colors.card, padding: '40px', borderRadius: '40px', border: `1px solid ${colors.border}` }}>
              {category === "Global Custom" ? (
                <input value={globalCustomTopic} onChange={e => setGlobalCustomTopic(e.target.value)} placeholder="Type custom topic..." style={{ width: '100%', padding: '20px', background: 'transparent', borderBottom: `2px solid ${colors.primary}`, color: colors.text, fontSize: '24px', outline: 'none' }} />
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                    <h3 style={{ margin: 0, opacity: 0.9 }}>{category} Specials</h3>
                    <RefreshCw onClick={() => fetchTopics(category, localCustomContext)} style={{ cursor: 'pointer', color: colors.primary }} size={20} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                    {topicList.map((t, i) => (
                      <div key={i} onClick={() => setSelectedTopic(t)} style={{ padding: '20px', background: selectedTopic?.title === t.title ? colors.primary + '15' : colors.bg, border: selectedTopic?.title === t.title ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, borderRadius: '20px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <b style={{ fontSize: '15px' }}>{t.title}</b>
                          <div onClick={(e) => { e.stopPropagation(); setShowDetail(showDetail === i ? null : i); }} style={{ cursor: 'pointer' }}>
                            {showDetail === i ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
                          </div>
                        </div>
                        {showDetail === i && <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '10px' }}>{t.details}</p>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '15px', background: colors.bg, padding: '10px', borderRadius: '18px', border: `1px solid ${colors.border}` }}>
                    <Search size={20} style={{ margin: '10px', opacity: 0.4 }} />
                    <input value={localCustomContext} onChange={e => setLocalCustomContext(e.target.value)} placeholder={`Search within ${category}...`} style={{ flex: 1, background: 'transparent', border: 'none', color: colors.text, outline: 'none' }} />
                    <button onClick={() => fetchTopics(category, localCustomContext)} style={{ background: colors.primary, border: 'none', color: '#fff', borderRadius: '12px', padding: '0 25px', fontWeight: 'bold' }}>Refine</button>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '30px' }}>
              <div style={{ background: colors.card, padding: '15px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase' }}>Mode</label>
                <select onChange={e => setMode(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: colors.text, fontSize: '14px', fontWeight: '700', marginTop: '5px', outline: 'none' }}>
                  {CONV_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ background: colors.card, padding: '15px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase' }}>AI Length</label>
                <select onChange={e => setAiLength(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: colors.text, fontSize: '14px', fontWeight: '700', marginTop: '5px', outline: 'none' }}>
                  <option value="Concise">Concise</option><option value="Balanced" selected>Balanced</option><option value="Detailed">Detailed</option>
                </select>
              </div>
              <div style={{ background: colors.card, padding: '15px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase' }}>Level</label>
                <select onChange={e => setLevel(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: colors.text, fontSize: '14px', fontWeight: '700', marginTop: '5px', outline: 'none' }}>
                  <option value="Low">Basic</option><option value="Medium" selected>Mid</option><option value="High">Expert</option>
                </select>
              </div>
              <div style={{ background: colors.card, padding: '15px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase' }}>Voice</label>
                <select onChange={e => setSelectedVoice(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: colors.text, fontSize: '14px', fontWeight: '700', marginTop: '5px', outline: 'none' }}>
                  {voices.map((v, i) => <option key={i} value={i}>{v.name.substring(0, 10)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
              <button onClick={() => setInterfaceMode('Chat')} style={{ flex: 1, padding: '30px', borderRadius: '25px', background: interfaceMode === 'Chat' ? colors.primary : colors.card, border: `1px solid ${colors.border}`, color: '#fff' }}>Chat Interface</button>
              <button onClick={() => setInterfaceMode('Call')} style={{ flex: 1, padding: '30px', borderRadius: '25px', background: interfaceMode === 'Call' ? colors.primary : colors.card, border: `1px solid ${colors.border}`, color: '#fff' }}>Voice Call</button>
            </div>

            <button onClick={handleStart} style={{ width: '100%', marginTop: '30px', padding: '25px', background: colors.text, color: colors.bg, borderRadius: '25px', fontWeight: '900', fontSize: '20px', border: 'none', cursor: 'pointer' }}>START THE SESSION</button>
          </div>
        )}

        {step === 'session' && (
          <div style={{ background: colors.card, padding: '40px', borderRadius: '40px', border: `1px solid ${colors.border}`, minHeight: '550px', display: 'flex', flexDirection: 'column' }}>
            {interfaceMode === 'Chat' ? (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '15px' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left', margin: '24px 0' }}>
                    <div style={{ display: 'inline-block', padding: '18px 25px', borderRadius: '25px', background: m.role === 'user' ? colors.primary : colors.bg, color: '#fff', maxWidth: '75%', lineHeight: '1.6', fontSize: '17px', border: `1px solid ${colors.border}` }}>{m.parts[0].text}</div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <canvas ref={canvasRef} width="600" height="200" style={{ width: '100%', borderRadius: '30px' }} />
                <h2 style={{ color: isAiSpeaking ? colors.primary : colors.text, letterSpacing: '4px', marginTop: '40px', fontWeight: '900' }}>{isAiSpeaking ? 'COGNIVO SPEAKING' : isListening ? 'LISTENING' : 'READY'}</h2>
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px', paddingTop: '30px', borderTop: `1px solid ${colors.border}` }}>
              <button onClick={startVoiceSystem} style={{ padding: '22px', borderRadius: '50%', background: isListening ? '#00ff00' : colors.bg, border: `1px solid ${colors.border}`, color: isListening ? '#000' : colors.text, cursor: 'pointer' }}><Mic size={24} /></button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, padding: '20px', background: colors.bg, border: 'none', borderRadius: '25px', color: colors.text, fontSize: '18px', outline: 'none' }} placeholder="Speak..." />
              <button onClick={handleGetFeedback} style={{ padding: '0 40px', borderRadius: '25px', background: colors.text, color: colors.bg, fontWeight: '900', border: 'none', cursor: 'pointer' }}>FINISH AUDIT</button>
            </div>
          </div>
        )}

        {step === 'feedback' && feedback && (
          <div style={{ animation: 'slideUp 0.6s ease' }}>
            <div style={{ background: colors.card, padding: '50px', borderRadius: '40px', border: `1px solid ${colors.border}` }}>
              <h2 style={{ textAlign: 'center', color: colors.primary, fontSize: '36px', fontWeight: '900' }}>VOCAL AUDIT</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', margin: '40px 0' }}>
                {Object.entries(feedback.scores).map(([k, v]) => (
                  <div key={k} style={{ background: colors.bg, padding: '18px', textAlign: 'center', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                    <small style={{ opacity: 0.5, textTransform: 'uppercase', fontWeight: 'bold', fontSize: '9px' }}>{k}</small><br /><b style={{ fontSize: '20px' }}>{v}/10</b>
                  </div>
                ))}
              </div>
              <h3>Corrections</h3>
              {feedback.grammarMistakes.map((m, i) => (
                <div key={i} style={{ marginBottom: '25px', padding: '30px', background: colors.bg, borderRadius: '25px', borderLeft: `6px solid ${colors.primary}` }}>
                  <p style={{ color: '#ff4d4d', textDecoration: 'line-through' }}>{m.original}</p>
                  <p style={{ color: '#00ff7f', fontWeight: 'bold', fontSize: '20px', margin: '10px 0' }}>{m.corrected}</p>
                  <p style={{ fontSize: '14px', opacity: 0.8 }}><b>Logic:</b> {m.why}</p>
                  <p style={{ fontSize: '14px', color: colors.primary, marginTop: '8px' }}><b>Hinglish:</b> {m.hinglishWhy}</p>
                </div>
              ))}
              <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '25px', background: colors.primary, borderRadius: '20px', color: '#fff', fontWeight: '900', fontSize: '20px', border: 'none' }}>NEW SESSION</button>
            </div>
          </div>
        )}

        <footer style={{ marginTop: '150px', padding: '80px 0', borderTop: `2px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: '900', fontSize: '18px', letterSpacing: '1px' }}>Made with <Heart size={14} fill={colors.primary} color={colors.primary} style={{ display: 'inline' }} /> by Kartik Dogra</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', opacity: 0.7, fontSize: '14px' }}>
            <span style={{ fontWeight: 'bold' }}>Contact Us:</span>
            <span style={{ color: colors.primary }}>kartikcu2006@gmail.com</span>
            <span>+91 9618630326</span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.4, letterSpacing: '2px' }}>
            © 2025 COGNIVO ELITE • ALL RIGHTS RESERVED
          </div>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${colors.primary}; border-radius: 10px; }
        select option { background: ${colors.card}; color: ${colors.text}; }
      `}</style>
    </div>
  );
}