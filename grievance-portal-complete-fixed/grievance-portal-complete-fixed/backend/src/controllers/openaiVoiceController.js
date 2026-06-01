const { transcribeAudio, generateResponse, generateSpeech } = require('../services/openaiVoiceService');

/**
 * Handle OpenAI Voice Assistant Conversational chat request
 * Processes uploaded audio, transcribes it, gets GPT reply, generates TTS,
 * and returns it all in a single ultra-low-latency response.
 * 
 * POST /api/openai-voice/chat
 */
const handleVoiceChat = async (req, res) => {
  try {
    // 1. Verify audio file was uploaded successfully
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio recording file is required (form field: "file")'
      });
    }

    console.log(`🎙️ [VoiceController] Received uploaded file: ${req.file.originalname} (${req.file.size} bytes, mime: ${req.file.mimetype})`);

    // 2. Parse conversation history from request body if available
    let history = [];
    if (req.body.history) {
      try {
        history = typeof req.body.history === 'string' ? JSON.parse(req.body.history) : req.body.history;
      } catch (parseErr) {
        console.warn('⚠️ [VoiceController] Failed to parse history from request, defaulting to empty array.');
      }
    }

    // 3. Step 1: Speech-To-Text Transcription (Whisper)
    let transcript = '';
    try {
      transcript = await transcribeAudio(req.file.buffer, req.file.mimetype);
    } catch (whisperErr) {
      console.error('❌ [VoiceController] Whisper transcription error:', whisperErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to transcribe your audio message. Please check your mic or try again.',
        error: whisperErr.message
      });
    }

    // 4. Handle cases where Whisper returns empty text
    if (!transcript || transcript.trim().length === 0) {
      console.log('🔇 [VoiceController] Silence detected (transcription empty).');
      
      // Synthesize a silent/prompt-to-speak message
      const promptText = "I couldn't hear you clearly. Please tap the button and try speaking again.";
      const base64Audio = await generateSpeech(promptText).catch(() => null);

      return res.status(200).json({
        success: true,
        transcript: '',
        reply: promptText,
        audio: base64Audio,
        action: 'prompt_retry'
      });
    }

    // 5. Step 2: Chat completion response generation (GPT-4o-mini)
    let replyText = '';
    try {
      replyText = await generateResponse(transcript, history);
    } catch (gptErr) {
      console.error('❌ [VoiceController] GPT Response generation error:', gptErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate a text response. Please try again.',
        error: gptErr.message
      });
    }

    // 6. Step 3: Text-To-Speech Synthesis (OpenAI TTS)
    let base64Audio = '';
    try {
      base64Audio = await generateSpeech(replyText);
    } catch (ttsErr) {
      console.error('❌ [VoiceController] Text-to-Speech synthesis error:', ttsErr);
      // Even if speech synthesis fails, return the texts so the frontend can fallback to browser SpeechSynthesis
      return res.status(200).json({
        success: true,
        transcript: transcript,
        reply: replyText,
        audio: null,
        warning: 'TTS failed. Falling back to browser audio synthesis.'
      });
    }

    // 7. Check if user transcription matches any specific voice navigation commands
    // This allows the frontend to trigger programmatic UI navigation based on metadata
    const cleanText = transcript.toLowerCase().trim();
    let triggerAction = null;
    
    if (cleanText.includes('report issue') || cleanText.includes('file complaint') || cleanText.includes('new complaint') || cleanText.includes('submit complaint')) {
      triggerAction = 'navigate_report';
    } else if (cleanText.includes('track complaint') || cleanText.includes('track my complaint') || cleanText.includes('complaint tracking') || cleanText.includes('track status')) {
      triggerAction = 'navigate_track';
    } else if (cleanText.includes('open dashboard') || cleanText.includes('dashboard') || cleanText.includes('my complaints')) {
      triggerAction = 'navigate_dashboard';
    } else if (cleanText.includes('go back') || cleanText.includes('previous screen') || cleanText.includes('return back')) {
      triggerAction = 'navigate_back';
    } else if (cleanText.includes('read current page') || cleanText.includes('read page') || cleanText.includes('read screen') || cleanText.includes('speak page')) {
      triggerAction = 'action_read_page';
    }

    // 8. Return comprehensive payload for ultra-low latency playback
    return res.status(200).json({
      success: true,
      transcript: transcript,
      reply: replyText,
      audio: base64Audio,
      action: triggerAction
    });

  } catch (error) {
    console.error('❌ [VoiceController] Fatal Voice Assistant error:', error);
    res.status(500).json({
      success: false,
      message: 'Conversational Voice Brain encountered a critical error.',
      error: error.message
    });
  }
};

module.exports = {
  handleVoiceChat
};
