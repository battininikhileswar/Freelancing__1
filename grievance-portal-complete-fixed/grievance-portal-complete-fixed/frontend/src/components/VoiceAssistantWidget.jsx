import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, Sparkles, X, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useTranslation } from '../utils/i18n';
import {
  VoiceRecognitionService,
  CommandRouter,
  ActionExecutor,
  TextToSpeechService
} from '../utils/voiceAssistantModules';
import toast from 'react-hot-toast';

export default function VoiceAssistantWidget() {
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [isEnabled, setIsEnabled] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  // Status: 'disabled' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [status, setStatus] = useState('disabled');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [announcerText, setAnnouncerText] = useState('');

  // Dialogue transcript history
  const [dialogue, setDialogue] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Hey City AI Assistant. Say "Hey City" or press Alt+V to talk, and I will perform actions inside the website.',
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    setDialogue(prev => {
      if (prev.length === 1 && prev[0].sender === 'bot') {
        return [{
          sender: 'bot',
          text: t('voice.welcome') || 'Hello! I am your Hey City AI Assistant. Say "Hey City" or press Alt+V to talk.',
          timestamp: prev[0].timestamp
        }];
      }
      return prev;
    });
  }, [t]);

  const wakeWordRecognitionRef = useRef(null);
  const commandRecognitionRef = useRef(null);
  const isEnabledRef = useRef(isEnabled);
  const statusRef = useRef(status);
  const chatEndRef = useRef(null);

  // Keep refs in sync to prevent stale closures inside recognition events
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue]);

  const announce = (text) => {
    setAnnouncerText('');
    setTimeout(() => {
      setAnnouncerText(text);
    }, 50);
  };

  // Keyboard shortcut listener: Alt + V to toggle/activate assistant
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        await handleMicTrigger();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize and load saved voice assistant state from localStorage
  useEffect(() => {
    const savedEnabled = localStorage.getItem('voiceAssistantEnabled') === 'true';
    if (savedEnabled) {
      setIsEnabled(true);
      setStatus('idle');
      announce("Voice Assistant active. Say Hey City or press Alt + V to talk.");
      setTimeout(() => {
        startWakeWordListening();
      }, 800);
    }
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    stopWakeWordListening();
    stopCommandListening();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Toggle Voice Assistant completely ON/OFF
  const handleEnableToggle = async () => {
    if (isEnabled) {
      cleanupAudio();
      setIsEnabled(false);
      setStatus('disabled');
      localStorage.setItem('voiceAssistantEnabled', 'false');
      announce("Voice assistant disabled.");
      toast.success("Voice Assistant disabled.");
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsEnabled(true);
        setStatus('idle');
        localStorage.setItem('voiceAssistantEnabled', 'true');
        announce("Voice assistant enabled. You can say 'Hey City' or press Alt + V to speak.");
        toast.success("Voice Assistant enabled! Say 'Hey City'");

        // Greet user
        const greetText = language === 'te' 
          ? "నమస్కారం! నేను మీ హే సిటీ సహాయకురాలిని. మీకు ఎలా సహాయపడగలను?" 
          : "Hello! I am Hey City. How can I help you today?";
        await speakText(greetText, language);
      } catch (err) {
        console.error("Microphone access denied:", err);
        setStatus('error');
        setErrorMsg("Microphone permission denied. Please allow mic access in your browser settings.");
        announce("Microphone permission denied.");
      }
    }
  };

  // Wrapper for TextToSpeechService
  const speakText = async (text, lang = 'en') => {
    stopWakeWordListening();
    await TextToSpeechService.speak(
      text,
      lang,
      () => setStatus('speaking'),
      () => {
        setStatus('idle');
        startWakeWordListening();
      }
    );
  };

  // Continuous background wake-word monitor using VoiceRecognitionService
  const startWakeWordListening = () => {
    if (!isEnabledRef.current || statusRef.current === 'disabled') return;

    stopWakeWordListening();

    try {
      const recognizer = VoiceRecognitionService.createRecognizer({
        continuous: true,
        lang: 'en-US',
        onResult: (event) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const text = event.results[i][0].transcript.toLowerCase().trim();
            console.log("👂 [Hey City Wake Word Hear]:", text);
            if (
              text.includes('hey city') || 
              text.includes('heycity') || 
              text.includes('హే సిటీ') || 
              (text.includes('hey') && text.includes('city')) ||
              text.includes('city')
            ) {
              if (wakeWordRecognitionRef.current) {
                wakeWordRecognitionRef.current.onend = null;
                wakeWordRecognitionRef.current.stop();
              }
              triggerWakeUp();
              break;
            }
          }
        },
        onError: (e) => {
          if (e.error !== 'no-speech') {
            console.warn("Wake word recognizer error:", e.error);
          }
        },
        onEnd: () => {
          if (isEnabledRef.current && statusRef.current === 'idle') {
            setTimeout(() => {
              startWakeWordListening();
            }, 300);
          }
        }
      });

      if (recognizer) {
        wakeWordRecognitionRef.current = recognizer;
        recognizer.start();
      }
    } catch (err) {
      console.error("Failed to start wake word recognizer:", err);
    }
  };

  const stopWakeWordListening = () => {
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.onend = null;
        wakeWordRecognitionRef.current.stop();
      } catch (e) {
        // Safe skip
      }
      wakeWordRecognitionRef.current = null;
    }
  };

  // Handles wake up response and initiates command capture
  const triggerWakeUp = async () => {
    cleanupAudio();
    setStatus('listening');

    const greet = language === 'te' ? "చెప్పండి, నేను వింటున్నాను." : "Yes, how can I help you?";
    setDialogue(prev => [
      ...prev,
      { sender: 'bot', text: greet, timestamp: new Date() }
    ]);

    await speakText(greet, language);
    startCommandListening();
  };

  // Command capture VoiceRecognitionService instance
  const startCommandListening = () => {
    cleanupAudio();

    try {
      const recognizer = VoiceRecognitionService.createRecognizer({
        continuous: false,
        lang: language === 'te' ? 'te-IN' : 'en-US',
        onResult: async (event) => {
          const query = event.results[0][0].transcript;
          setHeardText(query);
          await handleVoiceCommand(query);
        },
        onError: (e) => {
          console.error("Command recognition error:", e);
          setStatus('idle');
          startWakeWordListening();
        },
        onEnd: () => {
          if (statusRef.current === 'listening') {
            setStatus('idle');
            startWakeWordListening();
          }
        }
      });

      if (recognizer) {
        commandRecognitionRef.current = recognizer;
        recognizer.start();
        setStatus('listening');
        announce("Listening for your command.");
      }
    } catch (err) {
      console.error("Failed to start command recognizer:", err);
      setStatus('idle');
      startWakeWordListening();
    }
  };

  const stopCommandListening = () => {
    if (commandRecognitionRef.current) {
      try {
        commandRecognitionRef.current.stop();
      } catch (e) {
        // Safe skip
      }
      commandRecognitionRef.current = null;
    }
  };

  // Transcribed command processor using CommandRouter & ActionExecutor
  const handleVoiceCommand = async (query) => {
    setIsThinking(true);
    setStatus('thinking');
    announce("Thinking...");

    setDialogue(prev => [
      ...prev,
      { sender: 'user', text: query, timestamp: new Date() }
    ]);

    const match = CommandRouter.route(query);

    if (match) {
      setIsThinking(false);
      const feedbackText = language === 'te' ? match.feedback.te : match.feedback.en;
      
      setDialogue(prev => [
        ...prev,
        { sender: 'bot', text: feedbackText, timestamp: new Date() }
      ]);

      await speakText(feedbackText, language);
      await ActionExecutor.execute(match.action, navigate);
    } else {
      // Fallback: Query generative AI chatbot for a smart response
      try {
        const response = await api.post('/chat', { message: query });
        setIsThinking(false);
        const aiReply = response.data.reply || "Sorry, I couldn't catch that command. Say 'Hey City' and try saying 'report pothole' or 'login as admin'.";

        setDialogue(prev => [
          ...prev,
          { sender: 'bot', text: aiReply, timestamp: new Date() }
        ]);

        await speakText(aiReply, language);
      } catch (err) {
        console.error("AI Fallback error:", err);
        setIsThinking(false);
        const failText = "Sorry, I encountered an error processing your query. Please speak again.";
        setDialogue(prev => [
          ...prev,
          { sender: 'bot', text: failText, timestamp: new Date() }
        ]);
        await speakText(failText, language);
      }
    }

    setStatus('idle');
    startWakeWordListening();
  };

  // Keyboard shortcut or FAB click trigger action
  const handleMicTrigger = async () => {
    if (!isEnabledRef.current) {
      await handleEnableToggle();
      return;
    }

    if (statusRef.current === 'listening') {
      cleanupAudio();
      setStatus('idle');
      startWakeWordListening();
      announce("Mic closed.");
    } else {
      triggerWakeUp();
    }
  };

  // Status visual styles config
  const getStatusConfig = () => {
    switch (status) {
      case 'disabled':
        return {
          label: t('voice.toggle') || 'Enable Assistant',
          badgeColor: 'bg-slate-500/80 dark:bg-slate-700/80',
          pulseClass: '',
          icon: MicOff,
          waveColor: 'bg-slate-400'
        };
      case 'listening':
        return {
          label: 'Listening...',
          badgeColor: 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.6)]',
          pulseClass: 'ring-4 ring-indigo-500/40 animate-pulse scale-105',
          icon: Mic,
          waveColor: 'bg-indigo-500'
        };
      case 'thinking':
        return {
          label: 'Thinking...',
          badgeColor: 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.6)]',
          pulseClass: 'animate-spin scale-105',
          icon: Loader2,
          waveColor: 'bg-amber-500'
        };
      case 'speaking':
        return {
          label: 'Speaking...',
          badgeColor: 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.6)]',
          pulseClass: 'ring-4 ring-emerald-500/40 scale-105',
          icon: Volume2,
          waveColor: 'bg-emerald-500'
        };
      case 'error':
        return {
          label: 'Error',
          badgeColor: 'bg-rose-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]',
          pulseClass: 'animate-bounce',
          icon: AlertCircle,
          waveColor: 'bg-rose-500'
        };
      case 'idle':
      default:
        return {
          label: 'Voice Standby: Ready',
          badgeColor: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]',
          pulseClass: 'hover:scale-110 cursor-pointer',
          icon: Mic,
          waveColor: 'bg-blue-500'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const waveVariants = {
    animate: (i) => ({
      scaleY: [1, 2.5, 1],
      transition: {
        duration: 0.7,
        repeat: Infinity,
        delay: i * 0.12,
        ease: "easeInOut"
      }
    })
  };

  return (
    <div className="voice-assistant-widget fixed bottom-6 left-6 z-50 flex items-end gap-3 font-sans">
      
      {/* Screen Reader Assertive Live Announcer */}
      <div className="sr-only" aria-live="assertive" id="voice-assistant-announcer">
        {announcerText}
      </div>

      <AnimatePresence>
        {/* Dialogue interaction panel */}
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="absolute bottom-16 left-0 w-80 max-h-[420px] bg-white/85 dark:bg-slate-900/65 backdrop-blur-md border border-white dark:border-white/5 p-5 flex flex-col gap-4"
            aria-label="Hey City voice assistant dialog"
            style={{ borderRadius: '28px', boxShadow: 'var(--clay-shadow-lg)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm tracking-wide">
                <Sparkles size={16} className="text-amber-500 animate-pulse" /> Hey City Assistant
              </span>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                aria-label="Close dialogue panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Error alerts */}
            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl flex gap-2 items-start text-xs border border-rose-100 dark:border-rose-900/30">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Dialogue Transcript Window */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-slate-50 dark:bg-slate-950/50 rounded-2xl max-h-[220px] border border-slate-100 dark:border-slate-800/40" style={{ boxShadow: 'var(--clay-input)' }}>
              {dialogue.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs border ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none border-white/10 shadow-md'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border-white dark:border-white/5 rounded-tl-none'
                  }`} style={{ boxShadow: msg.sender === 'user' ? 'var(--clay-btn-primary)' : 'var(--clay-shadow-sm)' }}>
                    <p className="leading-relaxed font-semibold">{msg.text}</p>
                    <span className="text-[9px] block text-right mt-1 opacity-60 font-bold">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-white dark:border-white/5 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs flex items-center gap-2" style={{ boxShadow: 'var(--clay-shadow-sm)' }}>
                    <Loader2 size={12} className="animate-spin text-indigo-500" />
                    <span className="font-bold italic">Hey City is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Hearing preview */}
            {isEnabled && heardText && (
              <div className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 text-[10px] text-slate-600 dark:text-slate-300 italic font-semibold">
                <span className="font-bold block text-[8px] text-indigo-500 uppercase tracking-wider mb-0.5">Hearing:</span>
                "{heardText}"
              </div>
            )}

            {/* Quick Tips */}
            {isEnabled && (
              <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 font-bold">
                <HelpCircle size={11} className="text-slate-500" />
                <span>Say: <strong>"Hey City, report pothole"</strong></span>
              </div>
            )}

            {/* Action Enable Toggle */}
            <button
              onClick={handleEnableToggle}
              className={`w-full py-2.5 rounded-2xl font-bold transition flex items-center justify-center gap-2 text-xs border ${
                isEnabled
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-white border-slate-200 dark:border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg border-transparent'
              }`}
              style={{ boxShadow: isEnabled ? 'var(--clay-btn-secondary)' : 'var(--clay-btn-primary)' }}
              aria-label={isEnabled ? 'Disable Voice Assistant' : 'Enable Voice Assistant'}
            >
              {isEnabled ? <MicOff size={14} /> : <Mic size={14} />}
              {isEnabled ? 'Disable Voice Assistant' : 'Enable Voice Assistant'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating FAB trigger */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleMicTrigger}
          onDoubleClick={() => setShowPanel(prev => !prev)}
          className={`w-14 h-14 rounded-full text-white flex items-center justify-center transition-all duration-300 transform relative ${statusConfig.badgeColor} ${statusConfig.pulseClass} border border-white/20`}
          style={{ boxShadow: status === 'disabled' ? 'var(--clay-shadow-sm)' : 'var(--clay-btn-primary)', borderRadius: '50%' }}
          aria-haspopup="true"
          aria-expanded={showPanel}
          aria-label={`Hey City Voice Assistant. Status: ${statusConfig.label}. Double click to open interaction logs.`}
        >
          {status === 'thinking' ? (
            <StatusIcon size={22} className="animate-spin" />
          ) : status === 'speaking' ? (
            <StatusIcon size={22} className="animate-pulse" />
          ) : (
            <StatusIcon size={22} />
          )}

          {isEnabled && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full p-1 shadow-md animate-pulse">
              <Sparkles size={8} className="text-white" />
            </span>
          )}
        </button>

        {/* Audio Wave Visualizer display while active */}
        <AnimatePresence>
          {(status === 'listening' || status === 'speaking') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -10 }}
              onClick={() => setShowPanel(prev => !prev)}
              className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl px-3.5 py-2.5 flex items-center gap-3.5 shadow-2xl cursor-pointer backdrop-blur-sm"
              aria-label="Active voice wave display. Click to expand panel."
              style={{ borderRadius: '18px', boxShadow: 'var(--clay-shadow-md)' }}
            >
              <div className="flex items-center gap-1 h-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    custom={i}
                    variants={waveVariants}
                    animate="animate"
                    className={`w-1 rounded-full ${statusConfig.waveColor}`}
                    style={{
                      height: '10px',
                      transformOrigin: 'center'
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {status === 'listening' ? 'Listening...' : 'Speaking reply...'}
                </span>
                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                  Alt+V to toggle
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
