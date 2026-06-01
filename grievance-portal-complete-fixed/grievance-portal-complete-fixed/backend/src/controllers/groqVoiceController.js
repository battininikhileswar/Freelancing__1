const { transcribeAudio } = require('../services/groqVoiceService');

async function handleGroqTranscribe(req, res) {
  try {
    if (!req.file) {
      console.warn("⚠️ [groqVoiceController] No audio file uploaded");
      return res.status(400).json({ success: false, error: 'No audio file uploaded' });
    }

    const text = await transcribeAudio(req.file.buffer, req.file.mimetype);
    return res.status(200).json({ success: true, transcript: text });
  } catch (error) {
    console.error('❌ [groqVoiceController] Transcription error:', error);
    const errMsg = error.message || '';
    if (
      errMsg.includes('GROQ_API_KEY') || 
      errMsg.includes('API key') || 
      errMsg.includes('401') || 
      errMsg.includes('Unauthorized') || 
      errMsg.includes('Forbidden')
    ) {
      return res.status(200).json({ 
        success: false, 
        isApiKeyError: true, 
        error: 'AI is not connected. Please check API key.' 
      });
    }
    return res.status(500).json({ success: false, error: 'Transcription failed' });
  }
}

module.exports = {
  handleGroqTranscribe
};
