'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function JarvisVoice() {
  const [orbState, setOrbState] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState('Wake word "Hey Jarvis" is active.');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Initialize Web Audio API for Jarvis chimes
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Futurist chime sound synthesiser
  const playJarvisChime = (type = 'wakeup') => {
    try {
      initAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'wakeup') {
        // High-tech ascending dual-tone chime
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } else if (type === 'sleep') {
        // Futuristic descending tone
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1000, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.2);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc1.start(now);
        osc1.stop(now + 0.3);
      } else if (type === 'thinking') {
        // Dynamic computer click sound
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc1.start(now);
        osc1.stop(now + 0.05);
      }
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  // Initialize Speech Recognition & Synthesis APIs
  useEffect(() => {
    // Check browser compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;

    if (!SpeechRecognition || !SpeechSynthesis) {
      setIsSupported(false);
      setFeedback('Speech Recognition or Synthesis is not supported in this browser.');
      return;
    }

    synthRef.current = SpeechSynthesis;

    const initRecognition = () => {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentSpeech = (finalTranscript + ' ' + interimTranscript).toLowerCase().trim();
        console.log(`🎤 [Jarvis Voice] Speech captured: "${currentSpeech}"`);

        // WAKE WORD STATE check
        if (orbState === 'idle') {
          if (currentSpeech.includes('hey jarvis') || currentSpeech.includes('jarvis')) {
            console.log('🤖 [Jarvis] Wake word detected!');
            setOrbState('listening');
            setTranscript('');
            setReply('');
            playJarvisChime('wakeup');
            setFeedback('Yes, Sir? How can I assist you today?');
            
            // Wait for user query
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
              handleQuerySubmit(currentSpeech.replace(/.*(hey jarvis|jarvis)/gi, '').trim());
            }, 3000);
          }
        } else if (orbState === 'listening') {
          // Reset silence timeout
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          
          const cleanQuery = currentSpeech.replace(/.*(hey jarvis|jarvis)/gi, '').trim();
          if (cleanQuery) {
            setTranscript(cleanQuery);
            setFeedback('I am listening, Sir...');
            silenceTimeoutRef.current = setTimeout(() => {
              handleQuerySubmit(cleanQuery);
            }, 2500); // 2.5s silence triggers submit
          }
        }
      };

      rec.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          setFeedback('Microphone permission denied. Enable microphone access, Sir.');
        }
      };

      rec.onend = () => {
        // Keep speech recognition continuously alive
        if (isActive) {
          console.log('🔄 Restarting speech recognition...');
          try {
            rec.start();
          } catch {}
        }
      };

      recognitionRef.current = rec;
    };

    initRecognition();

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, [orbState, isActive]);

  // Activate Jarvis Assistant
  const toggleJarvis = () => {
    initAudioContext();
    if (isActive) {
      setIsActive(false);
      setOrbState('idle');
      playJarvisChime('sleep');
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
      setFeedback('Jarvis is offline.');
    } else {
      setIsActive(true);
      setOrbState('idle');
      playJarvisChime('wakeup');
      setFeedback('Jarvis is active. Say "Hey Jarvis" to wake me up.');
      try {
        if (recognitionRef.current) recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start recognition:', err);
      }
    }
  };

  // Submit Query to Server API
  const handleQuerySubmit = async (queryText) => {
    if (!queryText || queryText.trim().length < 2) {
      console.warn('Empty query, returning to idle.');
      setOrbState('idle');
      setFeedback('Wake word "Hey Jarvis" is active.');
      return;
    }

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    setOrbState('thinking');
    setFeedback('Consulting Claude neural networks, Sir...');
    playJarvisChime('thinking');

    try {
      const response = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText }),
      });

      if (!response.ok) throw new Error('API server returned error');

      const data = await response.json();
      const answer = data.reply || "Sir, I encountered a communication error.";
      
      setReply(answer);
      speakResponse(answer);

    } catch (err) {
      console.error(err);
      const errReply = "Sir, I had difficulty communicating with my main processor.";
      setReply(errReply);
      speakResponse(errReply);
    }
  };

  // Speak Response Out Loud using Natural Male Voice
  const speakResponse = (text) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel(); // Stop any currently speaking voice
    setOrbState('speaking');
    setFeedback('Speaking...');

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to locate a high-quality male voice
    const voices = synthRef.current.getVoices();
    let selectedVoice = voices.find(v => 
      v.name.includes('Google US English Male') || 
      v.name.includes('Microsoft David') ||
      v.name.includes('Male') ||
      v.name.includes('en-GB') || // Elegant British
      v.name.includes('en-US')
    );

    if (selectedVoice) utterance.voice = selectedVoice;
    
    // Set natural Jarvis-like cadence
    utterance.pitch = 0.92; // Slightly deeper, sophisticated calm tone
    utterance.rate = 1.02; // Elegant speech pacing

    utterance.onend = () => {
      console.log('🤖 [Jarvis] Speech ended.');
      setOrbState('idle');
      setFeedback('Standby mode. Say "Hey Jarvis".');
      playJarvisChime('sleep');
    };

    utterance.onerror = (err) => {
      console.error('Speech Synthesis Error:', err);
      setOrbState('idle');
      setFeedback('Standby mode. Say "Hey Jarvis".');
    };

    speechUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans select-none">
        
        {/* Futuristic Transcript HUD Overlay */}
        {(isActive && (transcript || reply)) && (
          <div className="w-80 md:w-96 p-4 rounded-3xl border border-blue-500/20 bg-slate-950/80 backdrop-blur-md shadow-2xl text-xs flex flex-col gap-3 font-semibold text-slate-300 animate-slide-up"
            style={{ 
              boxShadow: '0 8px 32px 0 rgba(0, 191, 255, 0.15)',
              textShadow: '0 0 8px rgba(0, 191, 255, 0.2)' 
            }}>
            
            {/* User Capture */}
            {transcript && (
              <div className="flex flex-col gap-1 border-l-2 border-orange-500 pl-3">
                <span className="text-[10px] text-orange-400 uppercase tracking-widest font-extrabold">You Spoke</span>
                <p className="italic leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Jarvis Reply */}
            {reply && (
              <div className="flex flex-col gap-1 border-l-2 border-cyan-500 pl-3 bg-cyan-950/10 p-2 rounded-r-xl">
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-extrabold flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block animate-ping" />
                  Jarvis Response
                </span>
                <p className="leading-relaxed text-slate-100">{reply}</p>
              </div>
            )}
          </div>
        )}

        {/* Feedback Bar */}
        {isActive && (
          <div className="px-3.5 py-1.5 rounded-full bg-blue-950/40 border border-blue-500/10 text-[10px] uppercase font-bold tracking-wider text-cyan-400 shadow-sm backdrop-blur-sm">
            {feedback}
          </div>
        )}

        {/* Jarvis Core Trigger / Animated Orb */}
        <button 
          onClick={toggleJarvis}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500 focus:outline-none group active:scale-95
            ${isActive 
              ? 'bg-slate-950 border-cyan-500/40 shadow-[0_0_25px_rgba(0,191,255,0.4)]' 
              : 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-blue-500/40 shadow-lg'}`}
        >
          {/* Inner Quantum Orb Rings */}
          <div className={`absolute inset-0.5 rounded-full border border-dashed transition-all duration-1000
            ${isActive ? 'border-cyan-500/20 animate-spin' : 'border-transparent'}`} 
            style={{ animationDuration: '8s' }} 
          />
          
          <div className={`absolute inset-1.5 rounded-full border border-dotted transition-all duration-1000
            ${isActive ? 'border-cyan-500/10 animate-spin' : 'border-transparent'}`} 
            style={{ animationDuration: '5s', animationDirection: 'reverse' }} 
          />

          {/* Core Glowing Orb */}
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
            ${!isActive && 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300'}
            ${isActive && orbState === 'idle' && 'bg-blue-500/20 text-cyan-400 animate-pulse'}
            ${isActive && orbState === 'listening' && 'bg-amber-500/20 text-amber-400 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)]'}
            ${isActive && orbState === 'thinking' && 'bg-purple-500/20 text-purple-400'}
            ${isActive && orbState === 'speaking' && 'bg-emerald-500/25 text-emerald-400 scale-105 shadow-[0_0_18px_rgba(16,185,129,0.55)]'}`}
          >
            {/* Visual Wave pulses inside core */}
            {isActive && (
              <span className={`absolute inset-0 rounded-full border opacity-40 animate-ping
                ${orbState === 'idle' && 'border-cyan-400/40'}
                ${orbState === 'listening' && 'border-amber-400/50'}
                ${orbState === 'thinking' && 'border-purple-400/40'}
                ${orbState === 'speaking' && 'border-emerald-400/50'}`} 
                style={{ animationDuration: orbState === 'listening' ? '0.8s' : '1.8s' }}
              />
            )}

            {/* Core Vector Icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </button>
      </div>

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}
