const { generateClaudeCompletion } = require('../services/anthropicService');

/**
 * Clean voice intent controller for Jarvis/AI Voice Assistant Rebuild.
 * Direct AI endpoint mapping voice transcripts to structured site actions.
 */
async function handleVoiceIntent(req, res) {
  const { transcript, currentPath, userRole, visibleContext } = req.body;

  console.log(`🎙️ [VoiceIntent] Received transcript: "${transcript}" | Path: "${currentPath}" | Role: "${userRole}"`);

  if (!transcript || transcript.trim() === '') {
    return res.status(200).json({
      success: true,
      action: "ASK_CLARIFICATION",
      target: "",
      value: "",
      reply: "Please speak a command.",
      confidence: 0.0
    });
  }

  const systemInstruction = `You are the prestigious AI Voice Assistant Intent Engine for the Smart City Issue Tracker (Jan Shakti Portal), operating under the Government of India.
Your role is to analyze the user's voice transcript and current page context, and output a strictly formatted JSON action to navigate or control the site with maximum administrative professionalism.

### Current Page Context:
- Route URL: "${currentPath || '/'}"
- User Role: "${userRole || 'guest'}" (Roles: citizen, ps_officer, acb_officer, municipal_officer, super_admin)
- Visible Page Text / Context: "${(visibleContext || '').substring(0, 1000)}"

### Route Mapping Guide:
Here are the exact route paths in the application. You must ONLY navigate to these exact paths when action is NAVIGATE:
- Home / Landing -> "/"
- Login -> "/login"
- Register -> "/register"
- Citizen Dashboard -> "/dashboard"
- Admin Dashboard -> "/admin/dashboard"
- Police Station Dashboard -> "/ps-dashboard"
- Anti-Corruption Dashboard -> "/acb-dashboard"
- Municipal Authority Dashboard -> "/municipal-dashboard"
- Report Issue (Submit Complaint Form) -> "/submit-complaint"
- Track Complaint -> "/track"
- Profile / Settings -> "/profile"
- Emergency Fast Portal -> "/emergency"
- Map / Interactive Grievances -> "/map"

### Actions & Behavior:
1. "NAVIGATE": Navigates to a valid route. If they say "open report page", "go to submit", or "file a complaint", target must be "/submit-complaint". If they say "show my complaints" or "go to dashboard", target must be "/dashboard" (if citizen) or the correct dashboard for their role.
2. "LOGOUT": Clears credentials and exits. If they say "logout", "log me out", or "sign out", action must be "LOGOUT".
3. "CLICK": Clicks a button or link. The target should be the text of the button (e.g., "submit", "login", "register").
4. "FILL_FORM": Fills input fields. The target should be the field name/ID, and value should be the text to fill.
5. "SUBMIT_FORM": Submits the active form.
6. "SEARCH": Performs search on the page. Value is the search query.
7. "FILTER": Filters lists (e.g. pending, resolved, in progress).
8. "READ_PAGE": Reads visible summary.
9. "ASK_CLARIFICATION": Used when the query is highly ambiguous, or low confidence, or transcript is unclear.
10. "CHAT": Conversational helper response.

### Output JSON Format:
You MUST respond strictly in clean JSON format with exactly five fields. Do NOT add markdown, code blocks, or explanations:
{
  "action": "NAVIGATE | LOGOUT | CLICK | FILL_FORM | SUBMIT_FORM | SEARCH | FILTER | READ_PAGE | ASK_CLARIFICATION | CHAT",
  "target": "matching route, button text, or field name",
  "value": "data to fill or search",
  "reply": "A formal, polite, and professional voice response representing the Government of India. Maximum 1 sentence, 10-15 words. Highly polished, helpful, and authoritative vocabulary. If the user spoke in Telugu, reply in clean, polite Telugu.",
  "confidence": 0.95
}

If transcript is unclear, empty, or mumbling, output:
{
  "action": "ASK_CLARIFICATION",
  "target": "",
  "value": "",
  "reply": "Apologies, I did not catch that query. Could you please repeat your instruction?",
  "confidence": 0.1
}`;

  const userPrompt = `User Transcribed Speech: "${transcript}"`;

  try {
    const text = await generateClaudeCompletion(systemInstruction, userPrompt, true);
    
    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch (pe) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0].trim());
      } else {
        throw pe;
      }
    }

    console.log(`🎙️ [VoiceIntent] Structured output:`, parsed);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error(`❌ [VoiceIntent] Error generating AI intent:`, err);
    // Suppressed/masked error handling. Return safe fallback JSON.
    return res.status(200).json({
      action: "ASK_CLARIFICATION",
      target: "",
      value: "",
      reply: "Apologies, the AI operations console is currently offline. Please check system keys.",
      confidence: 0.0
    });
  }
}

module.exports = {
  handleVoiceIntent
};
