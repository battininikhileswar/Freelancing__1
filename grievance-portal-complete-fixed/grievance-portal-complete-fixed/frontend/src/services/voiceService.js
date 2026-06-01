/**
 * voiceService.js
 * Encapsulates the Web Speech API recognition logic to start, stop, and capture vocal commands.
 * Supports dynamic language selection (Telugu/English) and onstart event propagation.
 */

let activeRecognizer = null;
let activeStream = null;

export const voiceService = {
  /**
   * Start listening for voice input
   * @param {function} onResult - callback (finalText, interimText)
   * @param {function} onError - callback (errorStr)
   * @param {function} onEnd - callback (finalText)
   * @param {string} language - user language ('te' | 'en' | 'hi' | 'ta')
   * @param {function} onStart - callback when recognition actually starts recording
   */
  startListening(onResult, onError, onEnd, language = 'en', onStart = () => {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log("❌ [voiceService] Speech recognition supported: false");
      onError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    console.log("✅ [voiceService] Speech recognition supported: true");
    this.stopListening();

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      
      // Map to correct regional speech recognition language
      if (language === 'te') {
        recognizer.lang = "te-IN"; // Pure Telugu
      } else if (language === 'hi') {
        recognizer.lang = "hi-IN"; // Hindi
      } else if (language === 'ta') {
        recognizer.lang = "ta-IN"; // Tamil
      } else {
        recognizer.lang = "en-IN"; // English-India (default)
      }
      
      console.log(`🎙️ [voiceService] Speech Recognition language set to: ${recognizer.lang}`);

      let finalTranscript = "";

      recognizer.onstart = () => {
        console.log("Recognition started");
        onStart(); // Trigger the callback exactly when capturing starts!
      };

      recognizer.onresult = (event) => {
        let interimTranscript = "";
        let currentFinal = "";
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (currentFinal) {
          finalTranscript += currentFinal;
        }

        const combinedFinal = finalTranscript.trim();
        console.log("Recognition result:", combinedFinal || interimTranscript);
        
        onResult(combinedFinal, interimTranscript.trim());
      };

      recognizer.onerror = (event) => {
        console.log("Recognition error:", event.error);
        onError(event.error);
      };

      recognizer.onend = () => {
        console.log("Recognition ended");
        onEnd(finalTranscript.trim());
      };

      activeRecognizer = recognizer;
      recognizer.start();
    } catch (err) {
      console.error("❌ [voiceService] Recognition start failure:", err);
      onError(err.message);
    }
  },

  /**
   * Stop active listening session
   */
  stopListening() {
    if (activeRecognizer) {
      try {
        activeRecognizer.stop();
      } catch (e) {
        // Safe skip
      }
      activeRecognizer = null;
    }
    if (activeStream) {
      try {
        activeStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        // Safe skip
      }
      activeStream = null;
    }
    console.log("🎙️ [voiceService] stopped listening");
  }
};

export default voiceService;
