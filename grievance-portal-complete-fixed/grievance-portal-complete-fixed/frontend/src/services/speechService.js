/**
 * speechService.js
 * Clean implementation of Web Speech API for Speech Recognition (STT) and Speech Synthesis (TTS).
 */

// Clean and normalize voice transcripts
export const cleanTranscript = (rawText) => {
  if (!rawText) return '';
  
  let text = rawText.toLowerCase().trim();
  
  // Strip common conversational fillers and wake words
  const fillers = [
    /\bhey jarvis\b/gi,
    /\bjarvis\b/gi,
    /\bhey city\b/gi,
    /\bcity\b/gi,
    /\bplease\b/gi,
    /\bcan you\b/gi,
    /\bcould you\b/gi,
    /\bplease click\b/gi
  ];
  
  for (const pattern of fillers) {
    text = text.replace(pattern, '');
  }
  
  // Flatten repeated adjacent words (e.g. "click click" -> "click")
  const words = text.split(/\s+/);
  const uniqueWords = [];
  for (const word of words) {
    if (uniqueWords.length === 0 || uniqueWords[uniqueWords.length - 1] !== word) {
      uniqueWords.push(word);
    }
  }
  
  return uniqueWords.join(' ').trim();
};

export const speechService = {
  recognition: null,
  utteranceRef: null,

  /**
   * Initializes browser SpeechRecognition instance
   */
  initRecognition({ onStart, onResult, onError, onEnd }) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("⚠️ Web Speech API SpeechRecognition is not supported in this browser.");
      return false;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-IN'; // Mixed English/Telugu noise-tolerant Indian accent
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      console.log("🎙️ [STT] Recognition started...");
      if (onStart) onStart();
    };

    rec.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const rawText = result[0].transcript;
      const confidence = result[0].confidence;
      console.log(`🎙️ [STT] Speech result: "${rawText}" | Confidence: ${confidence}`);
      
      const cleaned = cleanTranscript(rawText);
      if (onResult) {
        onResult({ rawText, cleaned, confidence });
      }
    };

    rec.onerror = (e) => {
      console.error("🎙️ [STT] Error occurred:", e.error);
      if (onError) onError(e.error);
    };

    rec.onend = () => {
      console.log("🎙️ [STT] Recognition ended.");
      if (onEnd) onEnd();
    };

    this.recognition = rec;
    return true;
  },

  /**
   * Starts microphone listening
   */
  startListening() {
    if (!this.recognition) {
      console.warn("🎙️ [STT] Recognition not initialized.");
      return;
    }
    try {
      this.recognition.start();
    } catch (err) {
      console.warn("🎙️ [STT] Recognition start bypass (already running or blocked):", err.message);
    }
  },

  /**
   * Stops microphone listening
   */
  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn("🎙️ [STT] Failed to stop recognition:", err.message);
      }
    }
  },

  /**
   * Speaks a reply using browser SpeechSynthesis (TTS)
   * Prevents garbage collection and returns promise completing on speech end.
   */
  speak(text, lang = 'en') {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn("📢 [TTS] Browser does not support speech synthesis.");
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        this.utteranceRef = utterance; // Strong reference to prevent garbage collection bug!

        const voices = window.speechSynthesis.getVoices();
        let preferredVoice;
        if (lang === 'te') {
          preferredVoice = voices.find(v => v.lang.startsWith('te-IN') || v.lang.includes('Telugu') || v.lang.includes('telugu'));
        }
        if (!preferredVoice) {
          preferredVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.includes('India') || v.lang.includes('india'));
        }
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.rate = 0.95;

        // Safety timeout to prevent infinite await if browser SpeechSynthesis gets stuck
        let timeoutId = setTimeout(() => {
          console.warn("📢 [TTS] Speech synthesis timed out. Forcing resolve.");
          window.speechSynthesis.cancel();
          resolve();
        }, 6000);

        utterance.onend = () => {
          console.log("📢 [TTS] Speech completed.");
          clearTimeout(timeoutId);
          resolve();
        };

        utterance.onerror = (e) => {
          console.error("📢 [TTS] Speech error:", e);
          clearTimeout(timeoutId);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("📢 [TTS] Speak failed:", err);
        resolve();
      }
    });
  }
};

export default speechService;
