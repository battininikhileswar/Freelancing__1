/**
 * VoiceAssistant.jsx
 * clean rebuild of global floating Voice Assistant Widget.
 * Sleek claymorphic UI containing floating mic button and a dynamic status pill beside it.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { speechService } from '../services/speechService';
import { voiceIntentService } from '../services/voiceIntentService';
import { voiceActionExecutor } from '../services/voiceActionExecutor';

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR'
  const [isContinuous, setIsContinuous] = useState(false);
  const [announcerText, setAnnouncerText] = useState('');

  const statusRef = useRef(status);
  const isContinuousRef = useRef(isContinuous);

  // Keep refs updated to prevent stale closures
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  // Alt + V to toggle mic listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toggleVoiceAssistant();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isContinuous]);

  // Clean shutdown on logout
  const handleSystemLogout = () => {
    console.log("🎙️ [VoiceAssistant] Intercepted logout sequence. Shutting down mic listener.");
    setIsContinuous(false);
    isContinuousRef.current = false;
    speechService.stopListening();
    window.speechSynthesis.cancel();
    setStatus('IDLE');
  };

  // Initialize Speech Services on Mount
  useEffect(() => {
    const success = speechService.initRecognition({
      onStart: () => {
        setStatus('LISTENING');
        setAnnouncerText('Voice assistant is listening...');
      },
      onResult: async ({ rawText, cleaned, confidence }) => {
        if (!cleaned || (confidence !== undefined && confidence > 0 && confidence < 0.35)) {
          console.warn(`🎙️ [VoiceAssistant] Low confidence (${confidence}) transcript rejected: "${rawText}"`);
          setStatus('ERROR');
          await speechService.speak("Sorry, please repeat once.");
          restartListeningLoop();
          return;
        }

        // Clean text checks
        if (cleaned.trim().length === 0) {
          restartListeningLoop();
          return;
        }

        // Trigger Thinking state
        setStatus('THINKING');
        setAnnouncerText('AI is processing voice command...');

        // Fetch user context
        const user = useAuthStore.getState().user;
        const userRole = user?.role || 'guest';
        const currentPath = window.location.pathname;

        // Fetch intent action
        const actionObj = await voiceIntentService.getActionFromSpeech(cleaned, currentPath, userRole);
        
        console.log("🎙️ [VoiceAssistant] Intent action returned:", actionObj);

        // Intercept logout intent early
        const isLogout = actionObj.action === 'LOGOUT' || 
                         (actionObj.target && (actionObj.target.toLowerCase().includes('logout') || actionObj.target.toLowerCase().includes('signout')));

        if (isLogout) {
          handleSystemLogout();
        }

        // Execute GUI action safely
        let executionFeedback = actionObj.reply || "Action completed.";
        try {
          if (actionObj.action && actionObj.action !== 'CHAT' && actionObj.action !== 'ASK_CLARIFICATION') {
            const execResult = await voiceActionExecutor.execute(actionObj, navigate);
            if (typeof execResult === 'string' && execResult.trim().length > 0) {
              executionFeedback = execResult;
            }
          }
        } catch (execErr) {
          console.error("🎙️ [VoiceAssistant] Executor error:", execErr.message);
          executionFeedback = actionObj.reply || `I had trouble completing that: ${execErr.message}`;
        }

        // Speak reply feedback
        setStatus('SPEAKING');
        setAnnouncerText(`AI speaking: ${executionFeedback}`);
        await speechService.speak(executionFeedback);

        // Resume listener or back to IDLE
        restartListeningLoop();
      },
      onError: (err) => {
        console.warn("🎙️ [VoiceAssistant] Mic error handler:", err);
        if (err === 'no-speech') {
          restartListeningLoop();
        } else {
          setStatus('ERROR');
          setAnnouncerText('Microphone error occurred.');
          // Auto fall back to IDLE in a few seconds on fatal mic blockages
          setTimeout(() => {
            if (statusRef.current === 'ERROR') {
              setStatus('IDLE');
            }
          }, 3000);
        }
      },
      onEnd: () => {
        // Speech ended
        if (statusRef.current === 'LISTENING') {
          restartListeningLoop();
        }
      }
    });

    if (!success) {
      console.warn("🎙️ [VoiceAssistant] Initial speech recognition setup failed.");
    }

    return () => {
      speechService.stopListening();
      window.speechSynthesis.cancel();
    };
  }, []);

  const restartListeningLoop = () => {
    if (isContinuousRef.current) {
      setStatus('LISTENING');
      setTimeout(() => {
        if (isContinuousRef.current && statusRef.current !== 'THINKING' && statusRef.current !== 'SPEAKING') {
          speechService.startListening();
        }
      }, 350);
    } else {
      setStatus('IDLE');
    }
  };

  const toggleVoiceAssistant = () => {
    if (status !== 'IDLE') {
      setIsContinuous(false);
      isContinuousRef.current = false;
      speechService.stopListening();
      window.speechSynthesis.cancel();
      setStatus('IDLE');
    } else {
      window.speechSynthesis.cancel();
      setIsContinuous(true);
      isContinuousRef.current = true;
      speechService.startListening();
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'LISTENING':
        return {
          title: 'Listening...',
          badgeBg: 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.6)]',
          pulse: 'ring-4 ring-indigo-500/40 animate-pulse scale-105',
          icon: Mic,
        };
      case 'THINKING':
        return {
          title: 'Thinking...',
          badgeBg: 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.6)]',
          pulse: 'animate-spin scale-105',
          icon: Loader2,
        };
      case 'SPEAKING':
        return {
          title: 'Speaking...',
          badgeBg: 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.6)]',
          pulse: 'ring-4 ring-emerald-500/40 scale-105 animate-bounce',
          icon: Volume2,
        };
      case 'ERROR':
        return {
          title: 'Error',
          badgeBg: 'bg-rose-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]',
          pulse: 'animate-bounce scale-105',
          icon: AlertCircle,
        };
      case 'IDLE':
      default:
        return {
          title: 'Voice Standby',
          badgeBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]',
          pulse: 'hover:scale-110 cursor-pointer',
          icon: MicOff,
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="hey-city-voice-assistant fixed bottom-6 left-6 z-50 flex items-center gap-3 font-sans">
      
      {/* Screen Reader Live Assistive Announcer */}
      <div className="sr-only" aria-live="assertive">
        {announcerText}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleVoiceAssistant}
          className={`w-14 h-14 rounded-full text-white flex items-center justify-center transition-all duration-300 transform relative ${config.badgeBg} ${config.pulse} border border-white/20 hover:scale-105`}
          style={{ 
            boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.4)', 
            borderRadius: '50%' 
          }}
          aria-label={`Voice Assistant. Status: ${config.title}. Alt+V to toggle.`}
        >
          <StatusIcon size={22} className={status === 'THINKING' ? 'animate-spin' : ''} />

          {status === 'IDLE' && (
            <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full p-0.5 shadow-md animate-pulse">
              <Sparkles size={8} className="text-white" />
            </span>
          )}
        </button>

        {/* Sleek Minimalist Status Pill */}
        <AnimatePresence>
          {(status === 'LISTENING' || status === 'THINKING' || status === 'SPEAKING' || status === 'ERROR') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.88, x: -10 }}
              className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl px-4 py-2 flex items-center shadow-2xl backdrop-blur-sm"
              style={{ borderRadius: '18px' }}
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                {status === 'LISTENING' ? 'Listening...' : 
                 status === 'THINKING' ? 'Thinking...' : 
                 status === 'SPEAKING' ? 'Speaking...' : 
                 status === 'ERROR' ? 'Error' : ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
