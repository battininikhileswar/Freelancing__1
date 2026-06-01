import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { question } = await request.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Question is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('❌ Missing ANTHROPIC_API_KEY in server environment variables.');
      return NextResponse.json(
        { success: false, message: 'Server configuration error. Anthropic API key is missing.' },
        { status: 500 }
      );
    }

    console.log(`📡 [Jarvis API] Sending prompt to Claude: "${question}"`);

    // Call the Anthropic Messages API using standard fetch
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: "You are Jarvis, an AI assistant for this website. You answer questions about the website and its content. You are smart, calm, elegant, and professional like Iron Man's Jarvis. You must keep replies short (2-3 sentences max) since they are spoken aloud. You MUST start every single reply with the word 'Sir,'.",
        messages: [
          { role: 'user', content: question }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Anthropic API returned an error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Error communicating with Anthropic API.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const replyText = data.content?.[0]?.text || "Sir, I had trouble formulating a response.";

    console.log(`✅ [Jarvis API] Received reply: "${replyText}"`);

    return NextResponse.json({
      success: true,
      reply: replyText
    });

  } catch (error) {
    console.error('❌ Server error in Jarvis route:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
