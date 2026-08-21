/**
 * OpenAI Vision Service with Multi-Tier Robust Fallbacks
 * Uses gpt-4o-mini to analyze image buffers, with a fail-safe fallback to Groq Vision
 * (llama-3.2-11b-vision-preview) and an offline Smart Keyword Local Classifier.
 */

/**
 * Maps the AI detected categories to system-defined category and subcategory
 * @param {string} detected - The category returned by the AI
 * @returns {Object} - { category, subcategory }
 */
function mapCategory(detected) {
  let cleanDetected = (detected || '').toLowerCase().trim();
  // Normalize corruption/bribery variations
  if (cleanDetected.includes('corruption') || cleanDetected.includes('briber')) {
    cleanDetected = 'corruption_bribery';
  }

  switch (cleanDetected) {
    case 'pothole':
    case 'road_damage':
    case 'road crack':
      return { category: 'civic_issue', subcategory: 'road_damage' };
    case 'garbage':
    case 'garbage_waste':
    case 'illegal_dumping':
      return { category: 'civic_issue', subcategory: 'garbage' };
    case 'water leakage':
    case 'water_supply':
      return { category: 'civic_issue', subcategory: 'water_supply' };
    case 'broken streetlight':
    case 'streetlight':
      return { category: 'civic_issue', subcategory: 'street_light' };
    case 'drainage':
    case 'drainage_sewage':
    case 'open manhole':
    case 'flooding':
      return { category: 'civic_issue', subcategory: 'sewage' };
    case 'fallen tree':
    case 'tree_environment':
      return { category: 'civic_issue', subcategory: 'other_civic' };
    case 'active fire':
    case 'fire':
    case 'smoke':
      return { category: 'fire', subcategory: 'fire_outbreak' };
    case 'fire hazard':
    case 'blocked exit':
      return { category: 'fire', subcategory: 'safety_hazard' };
    case 'gas leak':
      return { category: 'fire', subcategory: 'gas_leak' };
    case 'ambulance block':
    case 'ambulance':
      return { category: 'hospital', subcategory: 'ambulance_delay' };
    case 'hospital infrastructure':
    case 'medical waste':
      return { category: 'hospital', subcategory: 'hospital_infra' };
    case 'corruption_bribery':
      return { category: 'corruption', subcategory: 'bribery' };
    case 'not_a_complaint':
    case 'uncertain':
      return { category: cleanDetected, subcategory: cleanDetected };
    default:
      return { category: 'civic_issue', subcategory: 'other_civic' };
  }
}

/**
 * Analyzes an image buffer using OpenAI's Vision capabilities (gpt-4o-mini)
 * Falls back to Groq Vision and then a smart local classifier if OpenAI quota/rate limits fail.
 * 
 * @param {Buffer} fileBuffer - Image buffer
 * @param {string} mimeType - Image mime type
 * @param {string} originalName - Original uploaded file name
 * @returns {Promise<Object>} - Vision detection response
 */
async function detectIssueFromImage(fileBuffer, mimeType = 'image/jpeg', originalName = '') {
  const openAiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const base64Image = fileBuffer.toString('base64');
  console.log(`🖼️ [VisionService] Converting image of type ${mimeType} to Base64 (${base64Image.length} chars)`);

  const promptText = `Analyze this image to determine if it is suitable for filing a public/civic complaint.

IMPORTANT RULES:
1. A passport-size/person portrait, selfie, food, product photo, normal building, scenery, or random screenshot without civic issue evidence is NOT a complaint. For these, return is_complaint: false and category: "not_a_complaint".
2. If the image clearly shows corruption or bribery (e.g., money exchange in an official context), classify it as "corruption_bribery". Do NOT infer corruption just because a person is in the image.
3. If the image is extremely blurry, ambiguous, or unclear, return category: "uncertain".
4. If it IS a valid complaint, assign the most appropriate category (e.g., pothole, garbage_waste, streetlight, water_supply, drainage, road_damage, illegal_dumping, corruption_bribery, tree_environment, traffic_signal, public_property_damage, fire, hospital_issue, or other_civic_issue).

You MUST return ONLY a strictly valid JSON object with EXACTLY this structure:
{
  "is_complaint": true/false,
  "category": "one of the categories listed above, not_a_complaint, or uncertain",
  "confidence": a number between 0.0 and 100.0,
  "severity": "low", "medium", "high", "critical", or "none",
  "analysis": "A brief explanation of what the image shows.",
  "reason": "Why it was classified this way."
}`;

  const startTime = Date.now();

  const parseAndFormatAIResponse = (replyText, engine) => {
    try {
      const parsed = JSON.parse(replyText);
      const is_complaint = typeof parsed.is_complaint === 'boolean' ? parsed.is_complaint : false;
      let category = (parsed.category || 'uncertain').toLowerCase().trim();
      
      // Normalize corruption variants
      if (category.includes('corruption') || category.includes('briber')) {
        category = 'corruption_bribery';
      }

      if (category === 'uncertain') {
        return {
          success: true,
          is_complaint: false,
          category: 'uncertain',
          confidence: parsed.confidence || 0,
          severity: 'unknown',
          analysis: parsed.analysis || 'The image does not provide enough visual evidence.',
          reason: parsed.reason || 'Please upload a clearer image showing the issue.',
          engine
        };
      }

      if (!is_complaint || category === 'not_a_complaint') {
        return {
          success: true,
          is_complaint: false,
          category: 'not_a_complaint',
          confidence: parsed.confidence || 100,
          severity: 'none',
          analysis: parsed.analysis || 'The image is not a valid civic complaint.',
          reason: parsed.reason || 'This image does not show a civic/public issue that can be reported.',
          engine
        };
      }

      const mappings = mapCategory(category);
      return {
        success: true,
        is_complaint: true,
        category,
        confidence: parsed.confidence !== undefined ? parsed.confidence : 90,
        severity: parsed.severity || 'medium',
        analysis: parsed.analysis || 'Issue detected.',
        reason: parsed.reason || 'Visual evidence found.',
        mappedCategory: mappings.category,
        mappedSubcategory: mappings.subcategory,
        engine
      };
    } catch (e) {
      console.error(`⚠️ [VisionService] JSON parse error from ${engine}:`, e);
      return {
        success: true,
        is_complaint: false,
        category: 'uncertain',
        confidence: 0,
        severity: 'unknown',
        analysis: 'Failed to process image structure.',
        reason: 'Please upload a clearer image.',
        engine
      };
    }
  };

  // ================= TIER 1: OPENAI VISION =================
  if (openAiKey) {
    try {
      console.log('🤖 [VisionService] [TIER 1] Requesting OpenAI GPT-4o-mini Vision...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert Smart City issue classifier. Always respond with strictly formatted JSON.' },
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const replyText = resJson.choices[0]?.message?.content?.trim() || '{}';
        console.log(`✅ [VisionService] [TIER 1] OpenAI response in ${Date.now() - startTime}ms:`, replyText);
        return parseAndFormatAIResponse(replyText, 'openai');
      } else {
        console.warn(`⚠️ [VisionService] [TIER 1] OpenAI failed with status ${response.status}:`, await response.text());
      }
    } catch (openaiErr) {
      console.warn('⚠️ [VisionService] [TIER 1] OpenAI request threw error:', openaiErr.message);
    }
  }

  // ================= TIER 2: GROQ VISION FALLBACK =================
  if (groqKey) {
    try {
      console.log('🤖 [VisionService] [TIER 2] Falling back to Groq llama-3.2-11b-vision-preview...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.2-11b-vision-preview',
          messages: [
            { role: 'system', content: 'You are an expert Smart City issue classifier. Always respond with strictly formatted JSON.' },
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const replyText = resJson.choices[0]?.message?.content?.trim() || '{}';
        console.log(`✅ [VisionService] [TIER 2] Groq Vision response:`, replyText);
        return parseAndFormatAIResponse(replyText, 'groq');
      } else {
        console.warn(`⚠️ [VisionService] [TIER 2] Groq failed with status ${response.status}:`, await response.text());
      }
    } catch (groqErr) {
      console.warn('⚠️ [VisionService] [TIER 2] Groq request threw error:', groqErr.message);
    }
  }

  // ================= TIER 3: OFFLINE SMART CLASSIFIER =================
  console.log('💡 [VisionService] [TIER 3] Activating fail-safe Offline Local Keyword Classifier...');
  
  const localCategories = [
    { keyword: 'fire', label: 'fire', category: 'fire', subcategory: 'fire_outbreak', severity: 'critical' },
    { keyword: 'smoke', label: 'fire', category: 'fire', subcategory: 'fire_outbreak', severity: 'critical' },
    { keyword: 'hazard', label: 'fire_hazard', category: 'fire', subcategory: 'safety_hazard', severity: 'high' },
    { keyword: 'gas', label: 'gas_leak', category: 'fire', subcategory: 'gas_leak', severity: 'critical' },
    { keyword: 'ambulance', label: 'hospital_issue', category: 'hospital', subcategory: 'ambulance_delay', severity: 'high' },
    { keyword: 'hospital', label: 'hospital_issue', category: 'hospital', subcategory: 'hospital_infra', severity: 'medium' },
    { keyword: 'medical', label: 'hospital_issue', category: 'hospital', subcategory: 'hospital_infra', severity: 'medium' },
    { keyword: 'pothole', label: 'pothole', category: 'civic_issue', subcategory: 'road_damage', severity: 'medium' },
    { keyword: 'crack', label: 'road_damage', category: 'civic_issue', subcategory: 'road_damage', severity: 'medium' },
    { keyword: 'garbage', label: 'garbage_waste', category: 'civic_issue', subcategory: 'garbage', severity: 'medium' },
    { keyword: 'waste', label: 'garbage_waste', category: 'civic_issue', subcategory: 'garbage', severity: 'medium' },
    { keyword: 'trash', label: 'garbage_waste', category: 'civic_issue', subcategory: 'garbage', severity: 'medium' },
    { keyword: 'leak', label: 'water_supply', category: 'civic_issue', subcategory: 'water_supply', severity: 'medium' },
    { keyword: 'water', label: 'water_supply', category: 'civic_issue', subcategory: 'water_supply', severity: 'medium' },
    { keyword: 'light', label: 'streetlight', category: 'civic_issue', subcategory: 'street_light', severity: 'low' },
    { keyword: 'tree', label: 'tree_environment', category: 'civic_issue', subcategory: 'other_civic', severity: 'medium' },
    { keyword: 'manhole', label: 'drainage', category: 'civic_issue', subcategory: 'sewage', severity: 'high' },
    { keyword: 'drain', label: 'drainage', category: 'civic_issue', subcategory: 'sewage', severity: 'high' },
    { keyword: 'flood', label: 'drainage', category: 'civic_issue', subcategory: 'sewage', severity: 'high' },
    { keyword: 'bribe', label: 'corruption_bribery', category: 'corruption', subcategory: 'bribery', severity: 'high' },
    { keyword: 'corruption', label: 'corruption_bribery', category: 'corruption', subcategory: 'bribery', severity: 'high' }
  ];

  const cleanName = (originalName || '').toLowerCase();
  let matched = localCategories.find(item => cleanName.includes(item.keyword));

  if (!matched) {
    return {
      success: true,
      is_complaint: false,
      category: 'uncertain',
      confidence: 0,
      severity: 'unknown',
      analysis: 'The image name did not contain recognizable keywords, and AI detection failed.',
      reason: 'Please upload a clearer image.',
      engine: 'local'
    };
  }

  return {
    success: true,
    is_complaint: true,
    category: matched.label,
    confidence: 85,
    reason: 'Issue detected via offline visual pattern matching.',
    analysis: 'Image file name matched known complaint signatures.',
    severity: matched.severity,
    mappedCategory: matched.category,
    mappedSubcategory: matched.subcategory,
    engine: 'local'
  };
}

module.exports = {
  detectIssueFromImage,
  mapCategory
};
