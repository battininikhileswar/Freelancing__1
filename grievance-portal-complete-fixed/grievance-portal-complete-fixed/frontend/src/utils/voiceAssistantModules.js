import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import toast from 'react-hot-toast';

// ==========================================
// 5. DemoAdminLoginAPI
// ==========================================
export const DemoAdminLoginAPI = {
  /**
   * Securely logs in as super admin using operational demo credentials
   */
  async loginAsAdmin() {
    try {
      const { login } = useAuthStore.getState();
      const user = await login('admin@grievanceportal.gov.in', 'Admin@1234');
      toast.success("Demo Admin login successful!");
      return { success: true, user };
    } catch (err) {
      console.error("DemoAdminLoginAPI error:", err);
      toast.error("Demo Admin login failed.");
      return { success: false, error: err.message };
    }
  }
};

// ==========================================
// 2. CommandRouter
// ==========================================
export const CommandRouter = {
  commands: [
    {
      name: 'login_admin',
      patterns: [/login.*admin/i, /sign.*in.*admin/i, /అడ్మిన్.*లాగిన్/i, /అడ్మిన్.*లాగిన్.*చేయి/i, /admin.*login/i],
      action: () => ({ type: 'login_admin' }),
      feedback: {
        en: 'Logging in as administrator using demo credentials.',
        te: 'డెమో ఆధారాలను ఉపయోగించి అడ్మిన్‌గా లాగిన్ అవుతోంది.'
      }
    },
    {
      name: 'navigate_admin_dashboard',
      patterns: [/admin.*dashboard/i, /open.*admin.*dashboard/i, /అడ్మిన్.*డాష్.*బోర్డ్/i],
      action: () => ({ type: 'navigate', path: '/admin' }),
      feedback: {
        en: 'Opening Admin Dashboard.',
        te: 'అడ్మిన్ డాష్‌బోర్డ్ తెరవబడుతోంది.'
      }
    },
    {
      name: 'report_pothole',
      patterns: [/report.*pothole/i, /file.*pothole/i, /pothole.*issue/i, /రోడ్డు.*గుంత/i, /గుంత.*సమస్య/i, /గుంత.*ఫిర్యాదు/i],
      action: () => ({ type: 'report_issue', category: 'civic_issue', subcategory: 'pothole' }),
      feedback: {
        en: 'Opening report page and selecting pothole category.',
        te: 'ఫిర్యాదు పేజీని తెరిచి రోడ్డు గుంతల విభాగాన్ని ఎంచుకుంటోంది.'
      }
    },
    {
      name: 'report_garbage',
      patterns: [/report.*garbage/i, /garbage.*issue/i, /garbage.*complaint/i, /చెత్త.*సమస్య/i, /చెత్త.*ఫిర్యాదు/i],
      action: () => ({ type: 'report_issue', category: 'civic_issue', subcategory: 'garbage' }),
      feedback: {
        en: 'Opening report page and selecting garbage category.',
        te: 'ఫిర్యాదు పేజీని తెరిచి చెత్త సమస్య విభాగాన్ని ఎంచుకుంటోంది.'
      }
    },
    {
      name: 'open_map',
      patterns: [/open.*map/i, /show.*map/i, /view.*map/i, /maps/i, /మ్యాప్.*ఓపెన్/i, /మ్యాప్.*చూపించు/i],
      action: () => ({ type: 'open_map' }),
      feedback: {
        en: 'Opening the interactive smart city map.',
        te: 'స్మార్ట్ సిటీ మ్యాప్‌ను తెరుస్తోంది.'
      }
    },
    {
      name: 'show_my_complaints',
      patterns: [/show.*complaints/i, /open.*complaints/i, /view.*complaints/i, /my.*complaints/i, /complaint.*status/i, /నా.*ఫిర్యాదులు/i, /కంప్లైంట్స్/i],
      action: () => ({ type: 'navigate', path: '/dashboard' }),
      feedback: {
        en: 'Opening your active complaints dashboard.',
        te: 'మీ క్రియాశీల ఫిర్యాదుల డాష్‌బోర్డ్‌ను తెరుస్తోంది.'
      }
    },
    {
      name: 'change_lang_telugu',
      patterns: [/change.*language.*telugu/i, /switch.*telugu/i, /telugu.*language/i, /తెలుగు/i, /తెలుగు.*భాష/i],
      action: () => ({ type: 'change_language', lang: 'te' }),
      feedback: {
        en: 'Switching website language to Telugu.',
        te: 'వెబ్‌సైట్ భాషను తెలుగుకు మారుస్తోంది.'
      }
    },
    {
      name: 'change_lang_english',
      patterns: [/change.*language.*english/i, /switch.*english/i, /english.*language/i, /ఇంగ్లీష్/i, /ఆంగ్లం/i],
      action: () => ({ type: 'change_language', lang: 'en' }),
      feedback: {
        en: 'Switching website language to English.',
        te: 'వెబ్‌సైట్ భాషను ఇంగ్లీష్‌కు మారుస్తోంది.'
      }
    },
    {
      name: 'dark_mode_on',
      patterns: [/dark.*mode.*on/i, /enable.*dark.*mode/i, /turn.*on.*dark.*mode/i, /dark.*mode/i, /డార్క్.*మోడ్/i, /డార్క్.*మోడ్.*ఆన్/i],
      action: () => ({ type: 'dark_mode', enabled: true }),
      feedback: {
        en: 'Switching to dark mode.',
        te: 'డార్క్ మోడ్‌ను సక్రియం చేస్తోంది.'
      }
    },
    {
      name: 'light_mode_on',
      patterns: [/light.*mode.*on/i, /enable.*light.*mode/i, /turn.*on.*light.*mode/i, /light.*mode/i, /లైట్.*మోడ్/i, /లైట్.*మోడ్.*ఆన్/i],
      action: () => ({ type: 'dark_mode', enabled: false }),
      feedback: {
        en: 'Switching to light mode.',
        te: 'లైట్ మోడ్‌ను సక్రియం చేస్తోంది.'
      }
    },
    {
      name: 'logout',
      patterns: [/logout/i, /sign.*out/i, /లాగౌట్/i, /లాగౌట్.*చెయ్/i],
      action: () => ({ type: 'logout' }),
      feedback: {
        en: 'Logging you out of the portal.',
        te: 'పోర్టల్ నుండి మిమ్మల్ని లాగౌట్ చేస్తోంది.'
      }
    },
    {
      name: 'go_home',
      patterns: [/go.*home/i, /open.*home/i, /home.*page/i, /హోమ్/i, /హోమ్.*వెళ్ళు/i],
      action: () => ({ type: 'navigate', path: '/' }),
      feedback: {
        en: 'Going back to the homepage.',
        te: 'హోమ్ పేజీకి తిరిగి వెళుతోంది.'
      }
    },
    {
      name: 'open_chatbot',
      patterns: [/open.*chatbot/i, /show.*chatbot/i, /open.*chat/i, /chatbot/i, /చాట్.*బాట్/i, /చాట్.*బాట్.*ఓపెన్/i],
      action: () => ({ type: 'chatbot', open: true }),
      feedback: {
        en: 'Opening the interactive smart city chatbot helper.',
        te: 'చాట్‌బాట్‌ను తెరుస్తోంది.'
      }
    },
    {
      name: 'close_chatbot',
      patterns: [/close.*chatbot/i, /hide.*chatbot/i, /close.*chat/i, /చాట్.*బాట్.*మూసివేయి/i, /చాట్.*బాట్.*క్లోజ్/i],
      action: () => ({ type: 'chatbot', open: false }),
      feedback: {
        en: 'Closing the chatbot helper.',
        te: 'చాట్‌బాట్‌ను మూసివేస్తోంది.'
      }
    }
  ],

  /**
   * Route query text to matching command configuration
   */
  route(query) {
    if (!query) return null;
    const clean = query.trim().toLowerCase();

    for (const cmd of this.commands) {
      for (const pat of cmd.patterns) {
        if (pat.test(clean)) {
          return {
            name: cmd.name,
            action: cmd.action(),
            feedback: cmd.feedback
          };
        }
      }
    }
    return null;
  }
};

// ==========================================
// 3. ActionExecutor
// ==========================================
export const ActionExecutor = {
  /**
   * Automates and triggers direct actions inside the React website
   */
  async execute(action, navigate) {
    console.log("🚀 [ActionExecutor] Automating action:", action);

    switch (action.type) {
      case 'login_admin':
        const res = await DemoAdminLoginAPI.loginAsAdmin();
        if (res.success) {
          navigate('/admin');
        }
        break;

      case 'navigate':
        navigate(action.path);
        break;

      case 'report_issue':
        localStorage.setItem('voice_preselect_category', action.category);
        localStorage.setItem('voice_preselect_subcategory', action.subcategory);
        navigate('/submit-complaint');
        break;

      case 'open_map':
        navigate('/emergency');
        break;

      case 'change_language':
        const { setLanguage } = useThemeStore.getState();
        setLanguage(action.lang);
        break;

      case 'dark_mode':
        const { theme, toggleTheme } = useThemeStore.getState();
        if (action.enabled && theme !== 'dark') toggleTheme();
        if (!action.enabled && theme === 'dark') toggleTheme();
        break;

      case 'logout':
        const { logout } = useAuthStore.getState();
        logout();
        toast.success("Successfully logged out.");
        navigate('/');
        break;

      case 'chatbot':
        window.dispatchEvent(new CustomEvent('voice-toggle-chatbot', { detail: { open: action.open } }));
        break;

      default:
        console.warn("Unknown action type:", action.type);
        break;
    }
  }
};

// ==========================================
// 4. TextToSpeechService
// ==========================================
export const TextToSpeechService = {
  /**
   * Speaks back a message using native browser speech synthesis
   */
  speak(text, lang = 'en', onStart = () => {}, onEnd = () => {}) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'te' ? 'te-IN' : 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.includes(lang === 'te' ? 'te-IN' : 'en-US') || v.lang.includes('te'));
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onstart = () => {
        onStart();
      };

      utterance.onend = () => {
        onEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn("TTS error:", e);
        onEnd();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
};

// ==========================================
// 1. VoiceRecognitionService
// ==========================================
export const VoiceRecognitionService = {
  /**
   * Instantiates a custom Speech Recognition session
   */
  createRecognizer({ continuous = false, lang = 'en-US', onResult = () => {}, onError = () => {}, onEnd = () => {} }) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition is not supported in this browser.");
      return null;
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = continuous;
    recognizer.interimResults = !continuous; // Interim results for wake-word continuous detection
    recognizer.lang = lang;

    recognizer.onresult = (event) => {
      onResult(event);
    };

    recognizer.onerror = (event) => {
      onError(event);
    };

    recognizer.onend = () => {
      onEnd();
    };

    return recognizer;
  }
};
