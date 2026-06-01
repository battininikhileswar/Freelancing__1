import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';

const ChatbotWidget = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: t('bot.chat.welcome') || 'Hello! I am the Grievance Portal AI Assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    // Dynamically update welcome message when language changes
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1) {
        return [{
          id: 1,
          text: t('bot.chat.welcome'),
          sender: 'bot',
          timestamp: prev[0].timestamp
        }];
      }
      return prev;
    });
  }, [language]);

  useEffect(() => {
    const handleVoiceToggleChatbot = (e) => {
      if (e.detail?.open !== undefined) {
        setIsOpen(e.detail.open);
      }
    };
    window.addEventListener('voice-toggle-chatbot', handleVoiceToggleChatbot);
    return () => window.removeEventListener('voice-toggle-chatbot', handleVoiceToggleChatbot);
  }, []);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput('');
    setIsLoading(true);
    setError('');

    // Add user message to chat immediately
    const userMessage = {
      id: messages.length + 1,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Log Frontend Send Time
    const frontendSendTime = Date.now();
    console.log(`⏱️ [FRONTEND] Chatbot send time: ${new Date(frontendSendTime).toISOString()}`);

    const cleanText = messageText.toLowerCase().trim();

    // 2. Add instant local replies without Gemini
    const greetingMatches = {
      'hi': 'Hi, how can I help you?',
      'hello': 'Hello, how can I help you?',
      'hey': 'Hi, I am listening.',
      'thank you': 'You are welcome.',
      'thanks': 'You are welcome.',
      'who are you': 'I am your Smart City voice assistant.',
      'help': 'You can ask me to report issues, check status, open map, or ask general questions.'
    };

    if (greetingMatches[cleanText]) {
      console.log('💬 Chatbot greeting matched locally');
      setTimeout(() => {
        const botMessage = {
          id: messages.length + 2,
          text: greetingMatches[cleanText],
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 200);
      return;
    }

    // 3. Navigation commands should be instant without Gemini
    const homeCmds = ['home', 'go home', 'go back home', 'main page', 'landing page'];
    const loginCmds = ['login', 'go to login', 'sign in', 'sign-in', 'open login'];
    const reportCmds = ['report issue', 'file complaint', 'new complaint', 'register issue', 'submit complaint', 'report civic'];
    const mapCmds = ['map', 'open map', 'show map', 'view map'];
    const dashboardCmds = ['my complaints', 'check my complaints', 'view complaints', 'check complaints', 'dashboard', 'status', 'check status', 'complaint status'];
    const trackCmds = ['track', 'track by id', 'track complaint', 'track status', 'tracking', 'complaint tracking'];

    // Check if the query is an informational question rather than an imperative command
    const isQuestion = 
      cleanText.startsWith('why') || 
      cleanText.startsWith('how') || 
      cleanText.startsWith('what') || 
      cleanText.startsWith('who') || 
      cleanText.startsWith('where') || 
      cleanText.startsWith('when') ||
      cleanText.includes('?') ||
      cleanText.includes('explain') ||
      cleanText.includes('meaning of') ||
      cleanText.includes('reason for') ||
      cleanText.includes('why is') ||
      cleanText.includes('how does') ||
      cleanText.includes('can i') ||
      cleanText.includes('may i');

    const matchCommand = (cmds) => {
      if (isQuestion) return false; // Never intercept informational questions as direct navigation commands
      
      return cmds.some(cmd => {
        // Enforce strict boundary matching for single words to avoid false positive matches (like 'map' in 'heatmap')
        if (!cmd.includes(' ')) {
          const words = cleanText.split(/[\s,.\-!?]+/);
          return words.includes(cmd);
        }
        // For multi-word command phrases, simple substring check is safe
        return cleanText.includes(cmd);
      });
    };

    if (matchCommand(homeCmds)) {
      console.log('🗺️ Chatbot navigation matched locally: home');
      setTimeout(() => {
        navigate('/');
        const botMessage = {
          id: messages.length + 2,
          text: 'Going to the home page.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 250);
      return;
    }

    if (matchCommand(loginCmds)) {
      console.log('🗺️ Chatbot navigation matched locally: login');
      setTimeout(() => {
        navigate('/login');
        const botMessage = {
          id: messages.length + 2,
          text: 'Navigating to the login page.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 250);
      return;
    }

    if (matchCommand(reportCmds)) {
      console.log('🗺️ Chatbot navigation matched locally: report issue');
      setTimeout(() => {
        navigate('/submit-complaint');
        const botMessage = {
          id: messages.length + 2,
          text: 'Opening the complaint submission page.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 250);
      return;
    }

    if (matchCommand(mapCmds)) {
      console.log('🗺️ Chatbot navigation matched locally: map');
      setTimeout(() => {
        navigate('/submit-complaint');
        const botMessage = {
          id: messages.length + 2,
          text: 'Opening the complaint form with map view.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 250);
      return;
    }

    if (matchCommand(dashboardCmds)) {
      console.log('🗺️ Chatbot navigation matched locally: dashboard/status');
      setTimeout(() => {
        navigate('/dashboard');
        const botMessage = {
          id: messages.length + 2,
          text: 'Opening your dashboard to view your complaints.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 250);
      return;
    }

    if (matchCommand(trackCmds)) {
      console.log('🗺️ Chatbot navigation matched locally: track');
      setTimeout(() => {
        navigate('/track');
        const botMessage = {
          id: messages.length + 2,
          text: 'Opening the complaint tracking page.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 250);
      return;
    }

    // 11. Add request timeout: 8 seconds limit using AbortController
    const abortController = new AbortController();
    let timeoutTimer = setTimeout(() => {
      abortController.abort();
      setIsLoading(false);
      setError('Response is taking longer than usual. Please try again.');
      
      const timeoutText = 'Response is taking longer than usual. Please try again.';
      const botMessage = {
        id: messages.length + 2,
        text: timeoutText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 8000);

    try {
      const chatUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/chat` 
        : 'http://127.0.0.1:8000/api/chat';
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          userId: localStorage.getItem('userId') || 'anonymous',
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Log Frontend Response Received Time
      const frontendRecTime = Date.now();
      console.log(`⏱️ [FRONTEND] Chatbot response received time: ${new Date(frontendRecTime).toISOString()}. Latency: ${frontendRecTime - frontendSendTime}ms`);

      // Add bot response to chat
      const botMessage = {
        id: messages.length + 2,
        text: data.reply || data.answer || (data.data && data.data.assistantResponse) || 'Sorry, no response text returned.',
        sender: 'bot',
        timestamp: new Date(data.data?.timestamp || new Date()),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('⏱️ Chatbot Gemini request aborted due to 8s timeout.');
        return;
      }

      clearTimeout(timeoutTimer);
      setError('Failed to get response. Please try again.');
      console.error('Chat error:', err);

      const errorMessage = {
        id: messages.length + 2,
        text: 'Sorry, I encountered an error communicating with my AI brain. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans flex flex-col items-end gap-3.5">
      {/* Chat Window with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="bg-gradient-to-b from-[#f6f8fd]/95 to-[#ebf1fa]/95 dark:from-[#131929]/95 dark:to-[#0a0d17]/95 backdrop-blur-md border border-white dark:border-white/5 w-[380px] max-w-[calc(100vw-2rem)] h-[490px] flex flex-col relative z-50 overflow-hidden"
            style={{ borderRadius: '28px', boxShadow: 'var(--clay-shadow-lg)' }}
          >
            {/* Header */}
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-5 py-4 flex justify-between items-center border-b border-white/10 animate-fade-in" 
              style={{ 
                borderTopLeftRadius: '27px', 
                borderTopRightRadius: '27px', 
                boxShadow: 'inset 0 3px 6px rgba(255, 255, 255, 0.25), inset 0 -2px 4px rgba(0, 0, 0, 0.15)' 
              }}
            >
              <div>
                <h3 className="font-extrabold text-sm tracking-wide uppercase flex items-center gap-1.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-teal-300 animate-pulse" />
                  {t('bot.chat.title')}
                </h3>
                <p className="text-[10px] font-extrabold opacity-80 mt-0.5 tracking-wide">{t('bot.chat.subtitle')}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/10 hover:border-white/25 active:scale-90 transition-all text-white/95 hover:text-white"
                style={{ boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.1)' }}
                aria-label="Close Chatbot"
              >
                <X size={15} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-indigo-50/40 to-slate-50/40 dark:from-slate-950/20 dark:to-slate-900/20">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 text-xs border font-semibold leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 text-white border-indigo-400/20'
                        : 'bg-gradient-to-br from-white to-[#f4f7fe] dark:from-slate-800 dark:to-slate-800/90 text-slate-800 dark:text-slate-100 border-white dark:border-slate-700/20'
                    }`}
                    style={{ 
                      borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      boxShadow: msg.sender === 'user' ? 'var(--clay-btn-primary)' : 'var(--clay-shadow-sm)' 
                    }}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[8px] block text-right mt-1.5 opacity-60 font-bold">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Sequencing jumping dots typing loader */}
              {isLoading && (
                <div className="flex justify-start">
                  <div 
                    className="bg-gradient-to-br from-white to-[#f4f7fe] dark:from-slate-800 dark:to-slate-800/90 border border-white dark:border-slate-700/20 px-4 py-3 flex items-center gap-1.5 shadow-sm" 
                    style={{ 
                      borderRadius: '20px 20px 20px 4px',
                      boxShadow: 'var(--clay-shadow-sm)' 
                    }}
                  >
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        className="w-2 h-2 rounded-full bg-indigo-500/80"
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: dot * 0.15,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-100/50 dark:border-slate-800/40 p-4 bg-white/80 dark:bg-[#121828]/60 flex flex-col justify-end" style={{ borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px' }}>
              {error && (
                <div className="text-red-600 dark:text-red-400 text-xs mb-2.5 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200/20 font-semibold">
                  {error}
                </div>
              )}
              <div className="flex gap-2.5 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('bot.chat.placeholder')}
                  className="input px-5 py-3 flex-1 font-semibold rounded-2xl placeholder-slate-400 dark:placeholder-slate-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-indigo-500 to-indigo-600 border border-white/20 active:scale-[0.93] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex-shrink-0"
                  style={{ boxShadow: 'var(--clay-btn-primary)' }}
                  title={t('common.submit')}
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Toggle Button FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-full p-4 border border-white/20 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center"
          style={{ boxShadow: 'var(--clay-btn-primary)' }}
          title={t('bot.chat.toggle')}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
