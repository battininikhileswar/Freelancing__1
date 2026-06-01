const { generateClaudeCompletion } = require('./anthropicService');

/**
 * Groq AI Chatbot Service for Grievance Portal
 * (Replaces Google Gemini API to provide fast Llama 3.3 dynamic responses)
 */

// Conversation history storage
const conversationHistory = new Map();

// Query cache map
const queryCache = new Map();

/**
 * Helper to call Groq Chat Completions API with a list of fallback models
 */
async function generateContentWithFallback(systemInstruction, userPrompt, history = [], jsonMode = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not configured in .env file');
  }

  // Model names in order of preference
  const modelNames = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768'
  ];
  
  let lastError = null;

  // Format messages array for OpenAI-compatible chat completions format
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  // Add conversation history
  if (history && history.length > 0) {
    history.forEach(msg => {
      messages.push({ role: 'user', content: msg.userMessage });
      messages.push({ role: 'assistant', content: msg.assistantResponse });
    });
  }

  // Add the current user prompt
  messages.push({ role: 'user', content: userPrompt });

  for (const modelName of modelNames) {
    try {
      console.log(`Trying Groq model: ${modelName}...`);
      
      const payload = {
        model: modelName,
        messages: messages,
        max_tokens: jsonMode ? 300 : 150,
        temperature: 0.4
      };

      // Enable JSON mode if requested
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status} Error`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content;
      if (!text) {
        throw new Error('Empty response received from Groq completions');
      }

      console.log(`✅ Successfully generated content using Groq ${modelName}`);
      return text.trim();
    } catch (err) {
      console.warn(`⚠️ Groq model ${modelName} failed:`, err.message || err);
      lastError = err;
      
      // Sleep slightly to let any rate limits or socket queues clear
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  throw lastError || new Error('All Groq fallback models failed');
}

/**
 * Send a message to Groq API and get a response
 * (Maintains signature and exports identical to old Gemini service to prevent breaking imports)
 */
async function sendMessage(userMessage, userId = 'anonymous', mode = 'chat') {
  try {
    const cleanText = userMessage.toLowerCase().trim();

    // Cache lookup for repeat queries
    if (queryCache.has(cleanText)) {
      console.log(`🚀 [BACKEND] Cache hit for: "${userMessage}"`);
      return queryCache.get(cleanText);
    }

    // Initialize conversation history if not exists
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, []);
    }

    const history = conversationHistory.get(userId);

    // Friendly, general assistant that is specialized in Smart City issues but can answer any basic questions like Gemini/Groq
    const systemInstruction = `You are the prestigious, highly professional administrative Conversational Chatbot Assistant for the Smart City Issue Tracker (Jan Shakti Portal), operating under the Government of India.
Represent the portal with the highest standards of decorum, polite efficiency, and formal administrative language.
Follow these rules strictly:
1. Tone: Exceedingly professional, polite, helpful, and authoritative.
2. Response length: 1 to 2 concise, polished sentences. Max 25-30 words.
3. Language: Mix clean, polite Telugu when the citizen writes in Telugu.
4. Navigating Guidance: If the user requests to perform an action (such as logging in, registering, viewing the heatmap, or submitting a grievance), politely explain how they can perform it manually (e.g., by selecting the 'LOGIN' or 'REGISTER' buttons on the top right navigation bar).
5. Shortcut Command Triggers: Tautly inform them they can also input clean text commands (such as 'login', 'register', 'map', 'home', or 'dashboard') directly into this text terminal for automated redirection.
6. Decoupled Experience: Keep text conversational assistance completely decoupled from the voice assistant. Do NOT direct users to voice buttons.`;


    // Limit chat history to latest 8 messages (4 exchanges)
    const recentHistory = history.slice(-4);

    const startTime = Date.now();
    console.log(`⏱️ [BACKEND] Claude API completions request start: ${new Date(startTime).toISOString()}`);

    // Call completions using Claude
    const text = await generateClaudeCompletion(systemInstruction, userMessage, false);

    const endTime = Date.now();
    console.log(`⏱️ [BACKEND] Claude response time: ${endTime - startTime}ms`);

    // Store in conversation history
    history.push({
      userMessage,
      assistantResponse: text,
      timestamp: new Date(),
    });

    // Keep only last 10 exchanges in persistent memory
    if (history.length > 10) {
      history.shift();
    }

    // Save in cache
    queryCache.set(cleanText, text);

    return text;
  } catch (error) {
    console.error('⚠️ [BACKEND] Groq API Error:', error.message);
    console.log('🤖 [BACKEND] Falling back to robust offline mock AI responder...');
    
    const cleanText = userMessage.toLowerCase().trim();
    let simulatedReply = "Apologies, the live AI gateway is currently operating in local diagnostics mode. Please verify the system keys to restore live dynamic Llama 3.3 completions.";
    
    // Intelligent local fallback answers
    if (cleanText.includes('pothole') || cleanText.includes('road')) {
      simulatedReply = "To report a road hazard or pothole, navigate to the 'Report Issue' console, locate the coordinates on the interactive map, and upload visual evidence. Sanitation teams are bound to repair within 48 hours.";
    } else if (cleanText.includes('garbage') || cleanText.includes('trash') || cleanText.includes('waste')) {
      simulatedReply = "Public waste accumulation reports are directly dispatched to local sanitation boards. Standard cleanup operations are executed within 24 hours.";
    } else if (cleanText.includes('light') || cleanText.includes('streetlight') || cleanText.includes('electricity')) {
      simulatedReply = "Streetlight malfunctions are handled by the municipal public works division. Maintenance works are resolved within a 48-hour SLA.";
    } else if (cleanText.includes('drain') || cleanText.includes('drainage') || cleanText.includes('sewer')) {
      simulatedReply = "Drainage overflows are marked as high-urgency distress points. Field technicians are dispatched immediately to mitigate public blockages.";
    } else if (cleanText.includes('leak') || cleanText.includes('water')) {
      simulatedReply = "Water supply leakage reports are routed to the public water resource management board. Remedial actions are initiated within 12 hours.";
    } else if (cleanText.includes('status') || cleanText.includes('track') || cleanText.includes('complaint')) {
      simulatedReply = "You may track the live progression of registered grievances by selecting the 'Track Complaint' option or visiting your command dashboard.";
    } else if (cleanText.includes('photo') || cleanText.includes('upload') || cleanText.includes('image')) {
      simulatedReply = "Uploading clear photographic evidence is highly recommended to accelerate authority verification and trigger automated routing pipelines.";
    } else if (cleanText.includes('location') || cleanText.includes('map') || cleanText.includes('gps')) {
      simulatedReply = "Our coordinate telemetry system reverse-geocodes your GPS location, providing municipal maintenance crews with precise dispatch coordinates.";
    } else if (cleanText.includes('dashboard') || cleanText.includes('admin')) {
      simulatedReply = "The central dashboard provides comprehensive telemetry, complaint reassignments, and automated escalation logs for administrators.";
    } else if (cleanText.includes('notification') || cleanText.includes('alert')) {
      simulatedReply = "You will receive secure real-time alerts via SMS, email, and web sockets whenever your grievance status is updated by authorities.";
    } else if (cleanText === 'hi' || cleanText === 'hello' || cleanText === 'hey') {
      simulatedReply = "Greetings! I am the Jan Shakti Cognitive AI Assistant. How may I facilitate your administrative query today?";
    } else if (cleanText.includes('help')) {
      simulatedReply = "I am equipped to guide you through filing public grievances, tracking active records, or analyzing our live telemetry heatmap.";
    } else if (cleanText.includes('name') || cleanText.includes('who are you')) {
      simulatedReply = "I am the prestigious Smart City Grievance Assistant, powered by advanced local reasoning.";
    }
    
    if (!cleanText.includes('pothole') && !cleanText.includes('garbage') && !cleanText.includes('light') && 
        !cleanText.includes('drain') && !cleanText.includes('leak') && !cleanText.includes('status') && 
        !cleanText.includes('hi') && !cleanText === 'hello') {
      simulatedReply += "\n\n⚠️ (System Status: Local diagnostic fallback active. Check GROQ_API_KEY in backend .env to restore global LLM completions.)";
    }

    const history = conversationHistory.get(userId) || [];
    history.push({
      userMessage,
      assistantResponse: simulatedReply,
      timestamp: new Date(),
    });
    
    queryCache.set(cleanText, simulatedReply);
    return simulatedReply;
  }
}

/**
 * Get conversation history for a user
 */
function getConversationHistory(userId = 'anonymous') {
  return conversationHistory.get(userId) || [];
}

/**
 * Clear conversation history for a user
 */
function clearConversationHistory(userId = 'anonymous') {
  conversationHistory.delete(userId);
}

/**
 * Clear all conversation histories
 */
function clearAllConversationHistories() {
  conversationHistory.clear();
}

/**
 * Get AI suggestions for complaint category based on description
 * (Leverages Groq's extremely reliable JSON mode)
 */
async function getSuggestions(complaintDescription) {
  try {
    const systemInstruction = `You are a categorizing assistant. Classify the user's grievance description.
You MUST respond in clean JSON format with exactly three fields:
1. "category" (Must be exactly one of: "corruption", "service_failure", "harassment", "financial", "property", or "other")
2. "department" (Name of suggested department to handle this, e.g. "Public Works", "Sanitation", "Vigilance", etc.)
3. "severity" (Must be exactly: "low", "medium", or "high")

Example Response Format:
{
  "category": "corruption",
  "department": "Vigilance Bureau",
  "severity": "high"
}`;

    const text = await generateClaudeCompletion(systemInstruction, complaintDescription, true);

    try {
      const parsed = JSON.parse(text);
      if (parsed.category && parsed.department && parsed.severity) {
        return parsed;
      }
    } catch (parseError) {
      console.error('JSON parsing error in suggestions:', parseError);
      
      // Fallback extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return {
      category: 'other',
      department: 'General Administration',
      severity: 'medium',
      suggestion: text,
    };
  } catch (error) {
    console.error('Suggestion Generation Error:', error);
    return {
      category: 'other',
      department: 'General Administration',
      severity: 'medium',
      suggestion: 'Failed to generate dynamic suggestions.',
    };
  }
}

module.exports = {
  sendMessage,
  getConversationHistory,
  clearConversationHistory,
  clearAllConversationHistories,
  getSuggestions,
};
