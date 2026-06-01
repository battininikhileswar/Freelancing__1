# 🤖 Jarvis-Style Next.js AI Voice Assistant

A complete, production-ready, client-side active Jarvis voice assistant built for **Next.js (App Router)** and **React**.

---

## 📁 File Structure

```text
nextjs-jarvis-assistant/
├── .env.local                  # Anthropic Claude API Key configuration
├── app/
│   └── api/
│       └── jarvis/
│           └── route.js        # Secure server-side Claude API Route
├── components/
│   └── JarvisVoice.jsx         # Beautiful Interactive Orb widget & Voice HUD
└── README.md                   # Setup Guide
```

---

## 🛠️ Step 1: Install Dependencies

To install the lightweight styles and layout helpers, run:

```bash
npm install lucide-react framer-motion
```

*Note: The project uses native browser API structures (Web Speech API and SpeechSynthesis API) and standard `fetch` on the backend, so **no heavy external voice SDKs** are required.*

---

## 🛠️ Step 2: Configure Environment Variables

Create (or update) the `.env.local` file at the root of your Next.js project:

```env
# Anthropic Claude API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

---

## 🛠️ Step 3: Add Jarvis to Your Page/Layout

To add Jarvis globally to all pages of your Next.js application, import and register it in your main root layout `app/layout.js` (or a specific page):

```jsx
import JarvisVoice from '@/components/JarvisVoice';
import '@/app/globals.css'; // Ensure TailwindCSS is loaded

export const metadata = {
  title: 'My Website',
  description: 'AI Voice Assistant enabled website',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen">
        {/* Main Content */}
        {children}

        {/* Jarvis AI Assistant Orb Widget */}
        <JarvisVoice />
      </body>
    </html>
  );
}
```

---

## 🤖 Features & Interactive HUD States

1. **Floating Core Trigger:**
   * Bottom right corner floating circular orb.
   * Clicking the orb activates/deactivates Jarvis with a futuristic **high-tech sound chime**.
2. **Wake Word Active Standby:**
   * Constantly listens in the background for the wake word **`"Hey Jarvis"`** or **`"Jarvis"`**.
   * When detected, plays a **distinct chime**, transitions into **glowing orange/yellow active core**, and starts listening for your prompt.
3. **Claude 3.5 Sonnet Brain Integration:**
   * Safely posts questions to the server-side API `/api/jarvis/route.js`.
   * Securely uses the pre-configured Claude API key.
   * System prompt constraints ensure Jarvis responds in a calm, professional tone starting with *"Sir,"* restricted to 2-3 spoken sentences.
4. **Natural SpeechSynthesis Voice:**
   * Locates and locks onto a high-quality male voice (British/American).
   * Calibrates pitch to `0.92` (dignified calm tone) and rate to `1.02` (elegant pacing).
5. **Interactive UI Orb States:**
   * **`idle`** : Cyan pulsing standby core.
   * **`listening`** : Active amber pulsing glow.
   * **`thinking`** : Deep violet swirling computing wave.
   * **`speaking`** : Vibrant emerald pulsing audio wave.
6. **Futuristic HUD Transcript Panel:**
   * Sliding text HUD panel outputs what the user spoke and Jarvis's exact Claude-generated response in real time.
