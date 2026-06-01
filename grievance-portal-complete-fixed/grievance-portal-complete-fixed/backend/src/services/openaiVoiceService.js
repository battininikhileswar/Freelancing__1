/**
 * OpenAI Voice Service
 * Handles Whisper (Speech-to-Text) transcription, GPT-4o-mini completions,
 * and OpenAI TTS (Text-to-Speech) generation.
 */

/**
 * Transcribes audio using OpenAI Whisper API
 * @param {Buffer} fileBuffer - Audio file buffer
 * @param {string} mimeType - File MIME type (e.g. audio/webm or audio/wav)
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(fileBuffer, mimeType = 'audio/webm') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in .env file');
  }

  // Create native Blob and FormData (supported natively in Node.js 18+)
  const fileBlob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  
  // Set file extension based on mimeType
  const fileExt = mimeType.includes('wav') ? 'wav' : 'webm';
  formData.append('file', fileBlob, `recording.${fileExt}`);
  formData.append('model', 'whisper-1');

  console.log(`🎙️ [Whisper] Uploading audio buffer (${fileBuffer.length} bytes, type: ${mimeType}) to OpenAI...`);
  
  const startTime = Date.now();
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
      // Note: Do NOT set Content-Type header manually; fetch + FormData does it automatically with boundary
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ [Whisper] Error response:', errText);
    throw new Error(`Whisper transcription failed: ${response.statusText} (${response.status})`);
  }

  const data = await response.json();
  console.log(`✅ [Whisper] Transcription completed in ${Date.now() - startTime}ms. Result: "${data.text}"`);
  return data.text ? data.text.trim() : '';
}

/**
 * Generates an intelligent chat response using GPT-4o-mini
 * @param {string} userMessage - Transcribed query
 * @param {Array} history - Previous conversation history
 * @returns {Promise<string>} - AI text response
 */
async function generateResponse(userMessage, history = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in .env file');
  }

  // Specialized voice prompt designed to be highly conversational, helpful, and easily navigable for visually impaired users.
  const systemInstruction = `You are a conversational, helpful, and premium AI Voice Assistant for the Smart City Issue Tracker, designed specifically to assist visually impaired or blind users.
  
Your answers will be spoken out loud, so follow these guidelines:
1. Speak in a highly natural, warm, human-like, and conversational tone.
2. Keep replies brief, friendly, and clear (typically 1-3 short sentences). Avoid lists, complex symbols, bullet points, or markdown formatting, as it is difficult to read/speak nicely.
3. You can answer general conversational questions (like greetings, time, general facts) but you are specialized in city issues (like potholes, streetlights, sanitation, road damage, and sewage).
4. Inform the user they can navigate the website hands-free using these voice commands:
   - "report issue" (to open the complaint submission page)
   - "track complaint" (to open the complaint tracking page)
   - "open dashboard" (to view their complaints dashboard)
   - "read current page" (to read aloud everything on their current screen)
   - "go back" (to return to the previous screen)
5. If they mention any of these keywords or ask how to do them, guide them naturally and remind them the voice assistant can do it instantly if they say the voice command.
6. Support both English and Telugu queries seamlessly. If the user speaks in Telugu, respond in helpful, warm Telugu. If English, respond in English.`;

  const messages = [
    { role: 'system', content: systemInstruction }
  ];

  // Add conversation history (up to latest 8 messages / 4 exchanges)
  if (history && history.length > 0) {
    const recentHistory = history.slice(-8);
    recentHistory.forEach(msg => {
      messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
    });
  }

  // Add current prompt
  messages.push({ role: 'user', content: userMessage });

  console.log(`🧠 [GPT] Requesting completion for: "${userMessage}"...`);
  const startTime = Date.now();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 150,
      temperature: 0.5
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ [GPT] Error response:', errText);
    throw new Error(`GPT chat completion failed: ${response.statusText}`);
  }

  const data = await response.json();
  const replyText = data.choices[0]?.message?.content?.trim() || '';
  console.log(`✅ [GPT] Completion completed in ${Date.now() - startTime}ms. Reply: "${replyText}"`);
  return replyText;
}

/**
 * Generates natural-sounding speech from text using OpenAI TTS API
 * @param {string} text - Text to convert to voice
 * @returns {Promise<string>} - Base64 encoded MP3 audio stream
 */
async function generateSpeech(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in .env file');
  }

  console.log(`🔊 [TTS] Synthesizing speech for text: "${text.substring(0, 60)}..."`);
  const startTime = Date.now();

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'nova', // Premium warm/helpful voice (can also use 'alloy' or 'shimmer')
      response_format: 'mp3'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ [TTS] Error response:', errText);
    throw new Error(`TTS synthesis failed: ${response.statusText}`);
  }

  // Convert binary stream to ArrayBuffer and then Base64
  const audioArrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');
  
  console.log(`✅ [TTS] Speech synthesized successfully in ${Date.now() - startTime}ms. (Base64 size: ${base64Audio.length} bytes)`);
  return base64Audio;
}

module.exports = {
  transcribeAudio,
  generateResponse,
  generateSpeech
};
