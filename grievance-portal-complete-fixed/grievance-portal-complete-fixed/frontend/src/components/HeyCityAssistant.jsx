/**
 * HeyCityAssistant.jsx
 * Clay-morphism global floating voice assistant widget.
 * Upgraded to utilize high-accuracy native Web Speech API with Telugu + English mixed accents
 * and real-time Root Mean Square (RMS) continuous speech listening.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { commandRouter } from '../services/commandRouter';
import { actionExecutor } from '../services/actionExecutor';
import api from '../utils/api';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';

export default function HeyCityAssistant() {
  const navigate = useNavigate();
  const { language } = useThemeStore();

  const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [announcerText, setAnnouncerText] = useState('');

  const recognitionRef = useRef(null);
  const lastExecutedCommandRef = useRef({ text: '', time: 0 });
  const lastExecutedIntentRef = useRef('');
  const utteranceRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const updateProcessing = (val) => {
    setIsProcessing(val);
    isProcessingRef.current = val;
  };

  // Keep a status ref to avoid stale closures in event listeners
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [isContinuous, setIsContinuous] = useState(true);
  const isContinuousRef = useRef(true);

  const updateContinuous = (val) => {
    setIsContinuous(val);
    isContinuousRef.current = val;
  };

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN'; // Optimized for Indian accent (English + Telugu mixed)
      rec.continuous = false;
      rec.interimResults = false; // Only finalize full transcript for accuracy

      rec.onstart = () => {
        console.log("🎙️ [JarvisSpeech] Started listening...");
        setStatus('listening');
        setErrorMsg('');
      };

      rec.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const rawTranscript = result[0].transcript;
        const confidence = result[0].confidence;
        
        console.log(`🎙️ [JarvisSpeech] Raw Result: "${rawTranscript}" (confidence: ${confidence})`);
        
        if (rawTranscript) {
          handleFinalSpeechInput(rawTranscript, confidence);
        }
      };

      rec.onerror = (e) => {
        console.warn("⚠️ [JarvisSpeech] Recognition error:", e.error);
        if (e.error === 'no-speech') {
          setStatus('idle');
          restartListeningIfContinuous();
        } else {
          setErrorMsg("Speech recognition error.");
          setStatus('error');
          updateContinuous(false);
        }
      };

      rec.onend = () => {
        console.log("🎙️ [JarvisSpeech] Stopped.");
        if (statusRef.current === 'listening') {
          setStatus('idle');
          restartListeningIfContinuous();
        }
      };

      recognitionRef.current = rec;
    } else {
      console.warn("⚠️ Web Speech API is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
      }
    };
  }, []);

  // Handle TTS Speaking
  const speak = (text) => {
    if (!('speechSynthesis' in window)) {
      console.warn("⚠️ Speech synthesis not supported in this browser.");
      return;
    }
    
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; // Strong reference to prevent GC!
      
      const voices = window.speechSynthesis.getVoices();
      let preferredVoice;
      if (language === 'te') {
        preferredVoice = voices.find(v => v.lang.startsWith('te-IN') || v.lang.includes('Telugu') || v.lang.includes('telugu'));
      }
      if (!preferredVoice) {
        preferredVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.includes('India') || v.lang.includes('india'));
      }
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.95;
      
      utterance.onstart = () => {
        setStatus('speaking');
      };
      
      const handleSpeechComplete = () => {
        setStatus('idle');
        if (isContinuousRef.current) {
          console.log("🎙️ [HeyCityAssistant] Speech completed. Automatically restarting listener...");
          setTimeout(() => {
            if (isContinuousRef.current && statusRef.current !== 'listening' && statusRef.current !== 'thinking') {
              startRecording();
            }
          }, 500);
        }
      };

      utterance.onend = handleSpeechComplete;
      
      utterance.onerror = (e) => {
        console.error("📢 [HeyCityAssistant] Speech error:", e);
        handleSpeechComplete();
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("📢 [HeyCityAssistant] Speak failed:", err);
      setStatus('idle');
    }
  };

  const restartListeningIfContinuous = () => {
    if (isContinuousRef.current) {
      console.log("🎙️ [HeyCityAssistant] Restarting listening...");
      setTimeout(() => {
        if (isContinuousRef.current && statusRef.current !== 'listening' && statusRef.current !== 'thinking') {
          startRecording();
        }
      }, 500);
    }
  };

  // Keyboard shortcut listener: Alt + V to toggle mic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Primary trigger to toggle listening
  const toggleMic = () => {
    if (statusRef.current === 'listening') {
      updateContinuous(false);
      stopRecordingEarly();
    } else {
      updateContinuous(true);
      startRecording();
    }
  };

  const stopRecordingEarly = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("⚠️ Failed to stop speech recognition:", err);
      }
    }
  };

  const startRecording = () => {
    if (!recognitionRef.current) {
      setErrorMsg("Speech recognition not supported in this browser.");
      setStatus('error');
      return;
    }
    setErrorMsg('');
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn("⚠️ SpeechRecognition already running or blocked:", err);
    }
  };

  // Clean transcript before sending to AI
  const cleanAndValidateTranscript = (rawText, confidence) => {
    if (!rawText) return '';
    
    // 1. Lowercase text
    let text = rawText.toLowerCase().trim();
    
    // 2. Remove extra conversational filler words
    const fillerWords = [
      /\bhey jarvis\b/gi, 
      /\bjarvis\b/gi, 
      /\bhey city\b/gi, 
      /\bplease\b/gi, 
      /\bcan you\b/gi, 
      /\bcould you\b/gi,
      /\bplease click\b/gi
    ];
    for (const pattern of fillerWords) {
      text = text.replace(pattern, '');
    }
    
    // 3. Remove repeated words
    const words = text.split(/\s+/);
    const uniqueWords = [];
    for (const word of words) {
      if (uniqueWords.length === 0 || uniqueWords[uniqueWords.length - 1] !== word) {
        uniqueWords.push(word);
      }
    }
    text = uniqueWords.join(' ').trim();
    
    console.log(`🧹 [Speech Clean] Raw: "${rawText}" | Cleaned: "${text}" (confidence: ${confidence})`);
    return text;
  };

  // Processing voice command transcript via Jarvis Brain API
  const handleFinalSpeechInput = async (rawTranscript, confidence) => {
    if (isProcessingRef.current) return;
    updateProcessing(true);

    const cleaned = cleanAndValidateTranscript(rawTranscript, confidence);

    // Safety checks: Low speech recognition confidence
    if (!cleaned || (confidence !== undefined && confidence > 0 && confidence < 0.35)) {
      console.warn(`⚠️ [JarvisSpeech] Low speech confidence (${confidence}). Rejecting.`);
      updateProcessing(false);
      setStatus('error');
      speak("Sorry, please repeat once.");
      return;
    }

    setStatus('thinking');

    try {
      const getVisibleElements = () => {
        try {
          const interactive = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"], label'));
          const visible = interactive.filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          });
          return visible.map(el => {
            const type = el.tagName.toLowerCase();
            const text = (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
            if (type === 'input' || type === 'textarea' || type === 'select') {
              const labelText = el.labels && el.labels.length > 0 ? el.labels[0].textContent.trim() : '';
              return `${type.toUpperCase()} Field: name="${el.name || ''}" placeholder="${el.placeholder || ''}" id="${el.id || ''}" ${labelText ? 'label="' + labelText + '"' : ''}`;
            }
            return `${type.toUpperCase()}: "${text.substring(0, 35)}"`;
          }).filter(val => val && val.trim().length > 3).slice(0, 30);
        } catch (err) {
          console.warn("⚠️ Failed to gather elements context:", err);
          return [];
        }
      };

      const getFormFields = () => {
        try {
          const fields = Array.from(document.querySelectorAll('input, textarea, select'));
          return fields.map(el => ({
            id: el.id || '',
            name: el.name || '',
            type: el.type || '',
            placeholder: el.placeholder || '',
            value: el.value || '',
            required: el.required || false,
            labelText: el.labels && el.labels.length > 0 ? el.labels[0].textContent.trim() : ''
          }));
        } catch (e) { return []; }
      };

      const getPageText = () => {
        try {
          return document.body.innerText.substring(0, 1500).replace(/\s+/g, ' ');
        } catch (e) { return ''; }
      };

      const getSelectedComplaint = () => {
        try {
          const match = window.location.pathname.match(/\/complaints\/([A-Za-z0-9-]+)/);
          if (match) return match[1];
          const bodyText = document.body.innerText;
          const idMatch = bodyText.match(/COMP-[A-Za-z0-9]+/);
          return idMatch ? idMatch[0] : '';
        } catch (e) { return ''; }
      };

      const currentPath = window.location.pathname;
      const availableElements = getVisibleElements();
      const formFields = getFormFields();
      const pageText = getPageText();
      const selectedComplaint = getSelectedComplaint();
      const auth = useAuthStore.getState();
      const userRole = auth.user?.role || 'guest';
      const lastCommand = lastExecutedCommandRef.current.text || '';
      const lastIntent = lastExecutedIntentRef.current || '';

      console.log(`🧠 [HeyCityAssistant] Querying backend Jarvis Brain for command: "${cleaned}"`);
      
      const agentRes = await api.post('/voice/understand-command', {
        transcript: cleaned,
        currentPath,
        availableElements,
        formFields,
        userRole,
        selectedComplaint,
        pageText,
        lastCommand,
        lastIntent
      });

      let aiAgentSuccess = false;
      let aiResponseSpeech = "";

      if (agentRes.data.success && agentRes.data.actionObj) {
        const actionObj = agentRes.data.actionObj;
        const { action, target, value, reply, confidence: actionConfidence } = actionObj;
        
        console.log(`🧠 [HeyCityAssistant] Jarvis structured JSON response:`, actionObj);
        
        if (actionConfidence < 0.65) {
          console.warn(`⚠️ [HeyCityAssistant] Action confidence too low (${actionConfidence}). Halted.`);
          aiResponseSpeech = "Sorry, I am not confident about this action. Please repeat or clarify.";
          setStatus('error');
          updateProcessing(false);
          speak(aiResponseSpeech);
          return;
        }

        aiResponseSpeech = reply;
        lastExecutedIntentRef.current = action;
        lastExecutedCommandRef.current = { text: cleaned, time: Date.now() };

        if (action && action !== 'CHAT' && action !== 'ASK_CLARIFICATION') {
          try {
            const isLogout = action === 'LOGOUT' || 
                             (action === 'API_CALL' && (target === 'logout' || target === 'LOGOUT')) ||
                             (action === 'NAVIGATE' && target && (target.toLowerCase().includes('logout') || target.toLowerCase().includes('signout'))) ||
                             (action === 'CLICK' && target && (target.toLowerCase().includes('logout') || target.toLowerCase().includes('signout')));

            if (isLogout) {
              console.log("🎙️ [HeyCityAssistant] Intercepted logout command. Stop listening.");
              updateContinuous(false);
              stopRecordingEarly();
            }

            const execResult = await actionExecutor.execute(actionObj, navigate);
            console.log(`🎬 [HeyCityAssistant] Jarvis executed successfully:`, execResult);
            
            if (isLogout) {
              setStatus('success');
              updateProcessing(false);
              speak("Logged out successfully.");
              return;
            }
          } catch (execErr) {
            console.error(`❌ [HeyCityAssistant] Jarvis executor error:`, execErr);
            const errMsg = execErr.message || '';
            if (errMsg.includes('AI is not connected') || errMsg.includes('API key')) {
              aiResponseSpeech = "AI is not connected. Please check API key.";
            } else {
              aiResponseSpeech = `I had trouble completing that. ${execErr.message}`;
            }
          }
        }
        
        aiAgentSuccess = true;
      }

      if (aiAgentSuccess) {
        setStatus('success');
        updateProcessing(false);
        speak(aiResponseSpeech);
      } else {
        // Fallback standard routing
        console.log("⚡ [HeyCityAssistant] Running local command fallback...");
        const intent = commandRouter.route(cleaned);
        if (intent) {
          await executeImmediateAction(intent);
        } else {
          // Conversational chatbot fallback
          const chatRes = await api.post('/chat', { message: cleaned });
          const reply = chatRes.data.reply || "Sorry, I couldn't catch that.";
          setStatus('success');
          updateProcessing(false);
          speak(reply);
        }
      }

    } catch (err) {
      console.error("❌ [HeyCityAssistant] Processing voice command failed:", err);
      updateProcessing(false);
      
      const errMsg = err.message || '';
      let failMessage = "Sorry, I had trouble transcribing your voice. Please try again.";
      if (errMsg.includes('AI is not connected') || errMsg.includes('API key')) {
        failMessage = "AI is not connected. Please check API key.";
      }
      
      setErrorMsg(failMessage);
      setStatus('error');
      speak(failMessage);
    }
  };

  const executeImmediateAction = async (intent) => {
    try {
      console.log(`🎬 [HeyCityAssistant] executing fallback action: ${intent}`);
      
      const normalized = (intent || '').toUpperCase().trim();
      const isLogout = normalized === 'LOGOUT' || normalized.includes('LOGOUT') || normalized.includes('SIGNOUT');
      
      if (isLogout) {
        console.log("🎙️ [HeyCityAssistant] Intercepted fallback logout. Stop listening.");
        updateContinuous(false);
        stopRecordingEarly();
      }

      const executionResult = await actionExecutor.execute(intent, navigate);
      let successFeedback = typeof executionResult === 'string' ? executionResult : "Action completed.";
      
      setStatus('success');
      speak(successFeedback);
    } catch (err) {
      console.error("❌ [HeyCityAssistant] Immediate fallback action failed:", err);
      setStatus('error');
      speak("Action failed.");
    } finally {
      updateProcessing(false);
    }
  };

  // Status visual styles configurations
  const getStatusStyles = () => {
    switch (status) {
      case 'listening':
        return {
          title: 'Listening...',
          badgeBg: 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.6)]',
          pulse: 'ring-4 ring-indigo-500/40 animate-pulse scale-105',
          icon: Mic,
          waveColor: 'bg-indigo-500'
        };
      case 'thinking':
        return {
          title: 'Thinking...',
          badgeBg: 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.6)]',
          pulse: 'animate-spin scale-105',
          icon: Loader2,
          waveColor: 'bg-amber-500'
        };
      case 'speaking':
        return {
          title: 'Speaking...',
          badgeBg: 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.6)]',
          pulse: 'ring-4 ring-emerald-500/40 scale-105 animate-bounce',
          icon: Volume2,
          waveColor: 'bg-emerald-500'
        };
      case 'error':
        return {
          title: 'Error',
          badgeBg: 'bg-rose-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]',
          pulse: 'animate-bounce scale-105',
          icon: AlertCircle,
          waveColor: 'bg-rose-500'
        };
      case 'idle':
      default:
        return {
          title: 'Voice Standby',
          badgeBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]',
          pulse: 'hover:scale-110 cursor-pointer',
          icon: Mic,
          waveColor: 'bg-blue-500'
        };
    }
  };

  const statusConfig = getStatusStyles();
  const StatusIcon = statusConfig.icon;

  const waveVariants = {
    animate: (i) => ({
      scaleY: [1, 2.5, 1],
      transition: {
        duration: 0.65,
        repeat: Infinity,
        delay: i * 0.1,
        ease: "easeInOut"
      }
    })
  };

  return (
    <div className="hey-city-voice-assistant fixed bottom-6 left-6 z-50 flex items-center gap-3 font-sans">
      
      {/* Screen Reader Assertive Live Announcer */}
      <div className="sr-only" aria-live="assertive">
        {announcerText}
      </div>

      {/* Floating Trigger FAB and Clean Beside-Mic Status Display */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full text-white flex items-center justify-center transition-all duration-300 transform relative ${statusConfig.badgeBg} ${statusConfig.pulse} border border-white/20 hover:scale-105`}
          style={{ 
            boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.4)', 
            borderRadius: '50%' 
          }}
          aria-label={`Hey City Voice Assistant. Status: ${statusConfig.title}. Alt+V to toggle.`}
        >
          {status === 'thinking' ? (
            <StatusIcon size={22} className="animate-spin" />
          ) : status === 'speaking' ? (
            <StatusIcon size={22} className="animate-pulse" />
          ) : (
            <StatusIcon size={22} />
          )}

          {status === 'idle' && (
            <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full p-0.5 shadow-md animate-pulse">
              <Sparkles size={8} className="text-white" />
            </span>
          )}
        </button>

        {/* Small Status Text beside Mic Button */}
        <AnimatePresence>
          {(status === 'listening' || status === 'thinking' || status === 'speaking' || status === 'error') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.88, x: -10 }}
              className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-2xl backdrop-blur-sm"
              style={{ borderRadius: '18px' }}
            >
              {status === 'listening' && (
                <div className="flex items-center gap-1 h-3 mr-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      custom={i}
                      variants={waveVariants}
                      animate="animate"
                      className="w-0.5 rounded-full bg-indigo-500"
                      style={{
                        height: '8px',
                        transformOrigin: 'center'
                      }}
                    />
                  ))}
                </div>
              )}
              
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                {status === 'listening' ? 'Listening...' : 
                 status === 'thinking' ? 'Thinking...' : 
                 status === 'speaking' ? 'Speaking...' : 
                 status === 'error' ? (errorMsg.includes('API key') ? 'AI is not connected. Please check API key.' : 'Error') : ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
