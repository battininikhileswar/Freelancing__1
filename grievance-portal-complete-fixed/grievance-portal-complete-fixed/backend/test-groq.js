require('dotenv').config();

async function testGroqWhisper() {
  const apiKey = process.env.GROQ_API_KEY;
  console.log("🔑 GROQ_API_KEY loaded:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");
  
  if (!apiKey) {
    console.error("❌ Key not found!");
    return;
  }

  // Create a 1-second silent WebM buffer or dummy file buffer
  const fileBuffer = Buffer.alloc(1000); // 1000 bytes dummy buffer
  const mimeType = 'audio/webm';

  try {
    const fileBlob = new Blob([fileBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', fileBlob, 'recording.webm');
    formData.append('model', 'whisper-large-v3-turbo');

    console.log("🎙️ Sending transcription request...");
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    console.log("📡 Response status:", response.status, response.statusText);
    const text = await response.text();
    console.log("📡 Response body:", text);
  } catch (err) {
    console.error("❌ Request failed with error:", err);
  }
}

testGroqWhisper();
