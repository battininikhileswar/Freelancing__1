/**
 * Groq Voice Service
 * Handles Whisper (Speech-to-Text) transcription using Groq API.
 */

/**
 * Transcribes audio using Groq Whisper API
 * @param {Buffer} fileBuffer - Audio file buffer
 * @param {string} mimeType - File MIME type (e.g. audio/webm or audio/wav)
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(fileBuffer, mimeType = 'audio/webm') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env file');
  }

  // Create native Blob and FormData (supported natively in Node.js 18+)
  const fileBlob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  
  // Set file extension based on mimeType
  const fileExt = mimeType.includes('wav') ? 'wav' : 'webm';
  formData.append('file', fileBlob, `recording.${fileExt}`);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');
  formData.append('prompt', 'Voice command or email address like admin@grievanceportal.gov.in, citizen@example.com, ps.guntur@ap.gov.in, acb.guntur@ap.gov.in.');



  console.log(`🎙️ [Groq Whisper] Uploading audio buffer (${fileBuffer.length} bytes, type: ${mimeType}) to Groq...`);
  
  const startTime = Date.now();
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
      // Note: Do NOT set Content-Type header manually; fetch + FormData does it automatically with boundary
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ [Groq Whisper] Error response:', errText);
    throw new Error(`Groq Whisper transcription failed: ${response.statusText} (${response.status})`);
  }

  const data = await response.json();
  console.log(`✅ [Groq Whisper] Transcription completed in ${Date.now() - startTime}ms. Result: "${data.text}"`);
  
  if (!data.text) return '';
  const normalized = normalizeSymbols(data.text.trim());
  console.log(`🔄 [Groq Whisper] Normalized Result: "${normalized}"`);
  return normalized;
}

/**
 * Normalizes spoken representations of symbols like "@" and "." in email addresses.
 */
function normalizeSymbols(text) {
  if (!text) return '';
  
  let result = text;
  
  // Replace Telugu "అట్ ది రేట్" or "అట్ దిరేట్"
  result = result.replace(/అట్\s*ది\s*రేట్/g, '@');
  result = result.replace(/అట్\s*దిరేట్/g, '@');
  
  // Replace English spoken variations of "@"
  result = result.replace(/\bat\s+the\s+rate\s+of\b/gi, '@');
  result = result.replace(/\bat\s+the\s+rate\b/gi, '@');
  result = result.replace(/\bat\s+rate\b/gi, '@');
  result = result.replace(/\badd\s+the\s+rate\s+of\b/gi, '@');
  result = result.replace(/\badd\s+the\s+rate\b/gi, '@');
  result = result.replace(/\badd\s+rate\b/gi, '@');
  
  // Replace spaces around "@"
  result = result.replace(/\s*@\s*/g, '@');
  
  // Replace spoken variations of dots in email context
  // e.g. letters/numbers on both sides, and has "dot" later or ".gov"/".in"/".com"
  if (result.includes(' dot ') || result.includes('.') || result.match(/\b(com|in|org|gov|edu|net)\b/i)) {
    result = result.replace(/(\w+)\s+(at|add)\s+(\w+)/gi, '$1@$3');
    result = result.replace(/\s+dot\s+/gi, '.');
    result = result.replace(/\s*\.\s*/g, '.');
  }
  
  return result;
}

module.exports = {
  transcribeAudio
};
