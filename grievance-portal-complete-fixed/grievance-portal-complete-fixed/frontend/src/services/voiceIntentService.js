/**
 * voiceIntentService.js
 * Communicates with the backend voice intent endpoint to fetch structured JSON actions.
 */

import api from '../utils/api';

export const voiceIntentService = {
  /**
   * Sends transcribed query and page context parameters to backend intent service.
   * Suppresses automated toasts using { silent: true } to preserve custom status states.
   */
  async getActionFromSpeech(transcript, currentPath, userRole) {
    try {
      // Gather condensed visible context
      const getVisibleContext = () => {
        try {
          const interactive = Array.from(document.querySelectorAll('button, a, input, textarea, select, label'));
          const condensedElements = interactive.filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          }).map(el => {
            const tag = el.tagName.toLowerCase();
            const text = (el.textContent || el.value || el.placeholder || '').trim().replace(/\s+/g, ' ');
            return `${tag.toUpperCase()}: "${text.substring(0, 30)}"`;
          });
          return condensedElements.slice(0, 20).join(', ');
        } catch (e) {
          return '';
        }
      };

      const visibleContext = getVisibleContext();

      console.log("🧠 [IntentService] Querying AI voice intent endpoint with transcript:", transcript);

      const res = await api.post('/voice/intent', {
        transcript,
        currentPath,
        userRole,
        visibleContext
      }, {
        silent: true // Prevents global axios interceptor from popping red toast alerts
      });

      return res.data;

    } catch (err) {
      console.warn("⚠️ [IntentService] AI intent lookup failed. Bypassing to error fallback JSON.", err.message);
      return {
        action: "ASK_CLARIFICATION",
        target: "",
        value: "",
        reply: "AI is not connected. Please check API key.",
        confidence: 0
      };
    }
  }
};

export default voiceIntentService;
