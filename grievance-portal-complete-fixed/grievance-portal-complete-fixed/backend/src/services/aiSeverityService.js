/**
 * AI Severity Scoring Service with Multi-Tier Resilient Fallbacks
 * Analyzes complaint descriptions and categories using OpenAI (gpt-4o-mini),
 * falling back to Groq (llama-3.3-70b-versatile) and a Local offline rules engine.
 */

/**
 * Calculates severity score locally based on category, subcategory, and description keywords.
 * Triggered as Tier 3 fallback when all network APIs fail.
 * 
 * @param {string} category 
 * @param {string} subcategory 
 * @param {string} description 
 * @returns {Object} - { severity: 'Low'|'Medium'|'High'|'Emergency', reason: string }
 */
function calculateLocalSeverity(category, subcategory, description) {
  const desc = (description || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  const sub = (subcategory || '').toLowerCase();

  // EMERGENCY indicators: active threats, severe safety hazards, danger to life
  if (
    desc.includes('emergency') || 
    desc.includes('danger') || 
    desc.includes('fire') || 
    desc.includes('injury') || 
    desc.includes('accident') || 
    desc.includes('blood') ||
    desc.includes('murder') ||
    desc.includes('kidnap') ||
    sub === 'murder' || 
    sub === 'kidnapping' ||
    desc.includes('flooding') && desc.includes('rescue')
  ) {
    return {
      severity: 'Emergency',
      reason: 'Urgent threat to life, safety, or critical infrastructure identified locally.'
    };
  }

  // HIGH indicators: major structural hazards, active crimes, heavy disruption
  if (
    cat === 'crime' ||
    sub === 'theft' ||
    sub === 'assault' ||
    sub === 'bribery' ||
    desc.includes('theft') ||
    desc.includes('robbery') ||
    desc.includes('bribe') ||
    desc.includes('corruption') ||
    desc.includes('blackout') ||
    desc.includes('open manhole') ||
    sub === 'sewage' && desc.includes('overflow')
  ) {
    return {
      severity: 'High',
      reason: 'Active legal violation, critical public asset failure, or severe hazard detected locally.'
    };
  }

  // LOW indicators: minor cosmetic issues, low impact
  if (
    sub === 'park_maintenance' ||
    desc.includes('litter') ||
    desc.includes('pothole') && desc.includes('small') ||
    desc.includes('cosmetic') ||
    desc.includes('cleanliness')
  ) {
    return {
      severity: 'Low',
      reason: 'Routine civic maintenance or low-impact aesthetic issue identified.'
    };
  }

  // DEFAULT
  return {
    severity: 'Medium',
    reason: 'Standard public service disruption or civic issue classified under default rules.'
  };
}

/**
 * Analyzes and returns severity scoring for a complaint
 * 
 * @param {string} category 
 * @param {string} subcategory 
 * @param {string} description 
 * @returns {Promise<Object>} - { severity: 'Low'|'Medium'|'High'|'Emergency', reason: string }
 */
async function analyzeComplaintSeverity(category, subcategory, description) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const promptText = `Analyze this civic complaint and classify its severity level into exactly one of these 4 levels:
- Low (cosmetic issues, minor littering, park maintenance, small potholes with no safety risk)
- Medium (standard civic issues, routine water supply delays, waste bins filled but not overflowing)
- High (active crimes like theft/assault, corruption bribery, major sewer overflows, large open manholes, complete street blackouts)
- Emergency (active safety threats, life-threatening flooding, active fire, severe bodily injury, ongoing assault, major active accidents)

Complaint Category: "${category}"
Complaint Subcategory: "${subcategory}"
Complaint Description: "${description}"

You MUST return a JSON object with:
{
  "severity": "exactly one of: Low, Medium, High, Emergency",
  "reason": "a concise 1-sentence reasoning for the severity score"
}`;

  // ================= TIER 1: OPENAI VISION / COMPLETIONS =================
  if (openAiKey) {
    try {
      console.log('🤖 [SeverityService] [TIER 1] Calling OpenAI completions...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a Smart City civic severity analyzer. Classify complaints to direct urgent routing. Return strictly formatted JSON.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 150,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const replyText = resJson.choices[0]?.message?.content?.trim() || '{}';
        console.log('✅ [SeverityService] [TIER 1] OpenAI Response:', replyText);
        
        const parsed = JSON.parse(replyText);
        if (['Low', 'Medium', 'High', 'Emergency'].includes(parsed.severity)) {
          return {
            severity: parsed.severity,
            reason: parsed.reason || 'Classified by AI.',
            engine: 'openai'
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`⚠️ [SeverityService] [TIER 1] OpenAI failed with status ${response.status}:`, errText);
      }
    } catch (openaiErr) {
      console.warn('⚠️ [SeverityService] [TIER 1] OpenAI threw error:', openaiErr.message);
    }
  }

  // ================= TIER 2: GROQ FALLBACK =================
  if (groqKey) {
    try {
      console.log('🤖 [SeverityService] [TIER 2] Falling back to Groq llama-3.3-70b-versatile...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a Smart City civic severity analyzer. Classify complaints to direct urgent routing. Return strictly formatted JSON.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 150,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const replyText = resJson.choices[0]?.message?.content?.trim() || '{}';
        console.log('✅ [SeverityService] [TIER 2] Groq Response:', replyText);

        const parsed = JSON.parse(replyText);
        if (['Low', 'Medium', 'High', 'Emergency'].includes(parsed.severity)) {
          return {
            severity: parsed.severity,
            reason: parsed.reason || 'Classified by Groq AI.',
            engine: 'groq'
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`⚠️ [SeverityService] [TIER 2] Groq failed with status ${response.status}:`, errText);
      }
    } catch (groqErr) {
      console.warn('⚠️ [SeverityService] [TIER 2] Groq threw error:', groqErr.message);
    }
  }

  // ================= TIER 3: LOCAL FALLBACK =================
  console.log('💡 [SeverityService] [TIER 3] Falling back to Local Offline Rules...');
  const localResult = calculateLocalSeverity(category, subcategory, description);
  return {
    ...localResult,
    engine: 'local'
  };
}

module.exports = {
  analyzeComplaintSeverity,
  calculateLocalSeverity
};
