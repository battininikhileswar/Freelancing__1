const { generateClaudeCompletion } = require('../services/anthropicService');

/**
 * Jarvis Cognitive AI Voice Agent Brain (powered by Anthropic Claude 3.5 Sonnet / Resilient Fallbacks)
 * Inspects real-time screen paths, form fields, user roles, active complaint states, and page text
 * to orchestrate exact website operations dynamically with multi-turn confirmation safety controls.
 */
async function handleUnderstandCommand(req, res) {
  const { 
    transcript, 
    currentPath, 
    availableElements, 
    formFields, 
    userRole, 
    selectedComplaint, 
    pageText,
    lastCommand,
    lastIntent
  } = req.body;

  console.log(`🧠 [JarvisBrain] Analyzing user query:`);
  console.log(`   - Query: "${transcript}"`);
  console.log(`   - Route: "${currentPath}"`);
  console.log(`   - Role: "${userRole || 'guest'}"`);
  console.log(`   - Active Complaint: "${selectedComplaint || 'none'}"`);
  console.log(`   - Last Turn: command="${lastCommand || ''}", intent="${lastIntent || ''}"`);

  if (!transcript || transcript.trim() === '') {
    return res.status(200).json({
      success: true,
      action: "CHAT",
      target: "",
      value: "",
      reply: "I didn't catch that. Please speak louder.",
      confidence: 1.0
    });
  }

  const systemInstruction = `You are Jarvis, the state-of-the-art Cognitive AI Voice Agent Brain for the Smart City Issue Tracker website.
The user speaks a natural command (English, Telugu, or mixed mixed-speech).
Your job is to inspect the current page context and decide the exact single structured action to execute inside the website.

### Current Page Context:
- Route URL: "${currentPath}"
- User Role: "${userRole || 'guest'}" (Citizen can report & track. Authority can update/reassign assigned issues. Admin manages all data.)
- Active Complaint ID: "${selectedComplaint || 'none'}"
- Available Form Fields (Inputs/Selects/Textareas): ${JSON.stringify(formFields || [])}
- Interactive Visible Elements: ${JSON.stringify(availableElements || [])}
- Condensed Page Text: "${(pageText || '').substring(0, 1000)}"
- Last Interaction Memory: command="${lastCommand || ''}", intent="${lastIntent || ''}"

### Safety Rules (CRITICAL - DO NOT VIOLATE):
1. **Never delete data without user confirmation**. If user asks to delete, set action to "ASK_CLARIFICATION" and set reply to "Are you sure you want to delete this? Please confirm with yes."
2. **Never approve, reject, or update status/reassign without confirmation**. If they say "resolve this issue" or "assign to police department" and they have NOT just confirmed it (i.e. last interaction was not already an ask-clarification where they now said "yes" or "confirm"), set action to "ASK_CLARIFICATION" and reply with: "Please confirm if you want to update the status to [status] / reassign to [authority]."
3. **Never submit a form if required fields are missing**. Inspect the "required" attribute in the "Available Form Fields" list. If any required field is empty and they say "submit", set action to "ASK_CLARIFICATION" and reply with: "I cannot submit because [field name] is empty. Please fill it first."
4. **Action Confidence**: Compute a confidence score (0.0 to 1.0). If you are unsure or the command is highly ambiguous, or confidence is below 0.65, set action to "ASK_CLARIFICATION" and request help.
5. **Concise Spoken Replies**: Voice replies MUST be short, friendly, and fast (strictly 1 sentence, max 10 words). Use a premium English-Telugu mixed tone (e.g. "Opening report page", "Complaint details fill చేస్తున్నాను", "Status update చేయడానికి కన్ఫర్మ్ చేయండి").

### Output JSON Format:
You MUST respond strictly in clean JSON format with exactly five fields:
{
  "action": "NAVIGATE | CLICK | FILL_FORM | SUBMIT_FORM | FILTER | SEARCH | SORT | READ_PAGE | API_CALL | ASK_CLARIFICATION | CHAT",
  "target": "matching button text, input field name, or route path",
  "value": "data to fill (can be a plain string, or a JSON object of field-value pairs if filling multiple fields), or search query",
  "reply": "Short verbal voice reply (max 10 words, English + Telugu mixed mixed-speech)",
  "confidence": 0.95
}

### Action-mapping Guidelines:
- "I want to report garbage near my street" -> NAVIGATE to "/report?category=garbage" or CLICK "file complaint"
- "show me pending complaints" -> FILTER with value "pending"
- "open the map and find nearby issues" -> NAVIGATE to "/map"
- "change status to resolved" (if confirmed) -> CLICK/FILL_FORM or API_CALL
- "go back" -> CLICK matching "back" button or NAVIGATE back
- "read this page" -> READ_PAGE
- "what can I do here?" -> CHAT (explain available elements or page purpose)
- "click citizen" -> CLICK citizen button
- "search pothole" -> SEARCH with value "pothole"
- "sort by latest" -> SORT with value "latest"

Strict JSON only. No markdown formatting, no code blocks, no trailing comments.`;

  const userPrompt = `User Command: "${transcript}"`;

  try {
    const text = await generateClaudeCompletion(systemInstruction, userPrompt, true);
    
    // Parse response
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

    console.log(`🧠 [JarvisBrain] Structured Jarvis Action:`, parsed);
    return res.status(200).json({
      success: true,
      actionObj: parsed
    });

  } catch (err) {
    console.error(`❌ [JarvisBrain] Claude Jarvis Brain error:`, err);
    const errMsg = err.message || '';
    if (
      errMsg.includes('GROQ_API_KEY') || 
      errMsg.includes('API key') || 
      errMsg.includes('401') || 
      errMsg.includes('Unauthorized') || 
      errMsg.includes('Forbidden')
    ) {
      return res.status(200).json({
        success: true,
        actionObj: {
          action: "CHAT",
          target: "",
          value: "",
          reply: "AI is not connected. Please check API key.",
          confidence: 0.5
        }
      });
    }

    // Safe standard fallback in case of other errors
    return res.status(200).json({
      success: true,
      actionObj: {
        action: "CHAT",
        target: "",
        value: "",
        reply: "I am having trouble processing that right now. Could you please repeat?",
        confidence: 0.5
      }
    });
  }
}

module.exports = {
  handleUnderstandCommand
};
