/**
 * Gemini Vision Service for Image Classification
 * Uses gemini-flash-latest with robust fallback architecture.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Validates the strict JSON format returned by Gemini
 * and maps it to the format currently expected by the frontend.
 */
const parseAndFormatAIResponse = (replyText, engine) => {
  try {
    const parsed = JSON.parse(replyText);
    
    // Strict validation of requested structure
    if (typeof parsed.isRelevant !== 'boolean') {
      throw new Error('Missing or invalid isRelevant boolean field');
    }
    
    const isRelevant = parsed.isRelevant;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    
    // Map to frontend-compatible format
    if (!isRelevant) {
      return {
        success: true,
        is_complaint: false,
        category: parsed.category === 'uncertain' ? 'uncertain' : 'not_a_complaint',
        detectedCategory: parsed.detectedIssue || 'None',
        confidence: confidence,
        severity: 'none',
        analysis: parsed.analysis || 'Image is not a valid civic complaint.',
        reason: parsed.analysis || 'Image is not a valid civic complaint.',
        engine
      };
    }

    return {
      success: true,
      is_complaint: true,
      category: parsed.detectedIssue || 'civic_issue',
      detectedCategory: parsed.detectedIssue || 'civic_issue',
      confidence: confidence,
      severity: parsed.severity || 'medium',
      analysis: parsed.analysis || 'Issue detected.',
      reason: parsed.analysis || 'Issue detected.',
      mappedCategory: parsed.category || 'civic_issue',
      mappedSubcategory: parsed.subcategory || 'other_civic',
      engine
    };
  } catch (e) {
    console.error(`⚠️ [VisionService] Response validation/parse error from ${engine}:`, e.message);
    throw new Error(`AI Provider response parsing failed: ${e.message}`);
  }
};

/**
 * Analyzes an image buffer using Gemini Vision
 */
async function detectIssueFromImage(fileBuffer, mimeType = 'image/jpeg', originalName = '') {
  const base64Image = fileBuffer.toString('base64');
  console.log(`🖼️ [VisionService] Converting image of type ${mimeType} to Base64 (${base64Image.length} chars)`);

  const promptText = `Analyze this image to determine if it is suitable for filing a public/civic complaint.

IMPORTANT RULES:
1. A passport-size/person portrait, selfie, food, product photo, normal building, scenery, or random screenshot without civic issue evidence is NOT a complaint. Set isRelevant to false.
2. If the image clearly shows corruption or bribery, classify it under category "corruption".
3. If the image is extremely blurry, ambiguous, or unclear, set isRelevant to false.
4. If it IS a valid complaint, set isRelevant to true, and assign the most appropriate category and subcategory.

You MUST return ONLY a strictly valid JSON object with EXACTLY this structure:
{
  "detectedIssue": "Short name of the issue detected, e.g., Pothole, Garbage",
  "category": "civic_issue, crime, corruption, fire, or hospital",
  "subcategory": "road_damage, garbage, water_supply, sewage, street_light, other_civic, etc.",
  "confidence": a number between 0.0 and 1.0,
  "severity": "low", "medium", "high", "critical", or "none",
  "isRelevant": true/false,
  "analysis": "A brief explanation of what the image shows."
}`;

  const startTime = Date.now();

  // ================= TIER 1: GEMINI VISION =================
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log('🤖 [VisionService] [TIER 1] Requesting Gemini Flash Latest...');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      
      const prompt = promptText + "\n\nPlease return strictly JSON. Do not include markdown formatting like ```json.";
      const imageParts = [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        }
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      let replyText = result.response.text().trim();
      
      // Clean markdown if Gemini still returns it
      if (replyText.startsWith('\`\`\`json')) {
        replyText = replyText.substring(7);
        if (replyText.endsWith('\`\`\`')) replyText = replyText.substring(0, replyText.length - 3);
      } else if (replyText.startsWith('\`\`\`')) {
        replyText = replyText.substring(3);
        if (replyText.endsWith('\`\`\`')) replyText = replyText.substring(0, replyText.length - 3);
      }
      
      console.log(`✅ [VisionService] [TIER 1] Gemini Vision response in ${Date.now() - startTime}ms:`, replyText);
      return parseAndFormatAIResponse(replyText.trim(), 'gemini-flash-latest');
    } catch (geminiErr) {
      console.error('⚠️ [VisionService] [TIER 1] Gemini request threw error:', geminiErr.message);
      throw new Error(`Gemini Vision API failed: ${geminiErr.message}`);
    }
  }

  // If no Gemini key is provided, we fail explicitly per requirements
  console.error('❌ [VisionService] GEMINI_API_KEY is not configured in .env.');
  throw new Error('AI Vision provider is not properly configured (Missing GEMINI_API_KEY).');
}

module.exports = {
  detectIssueFromImage,
  mapCategory: (c) => ({ category: c, subcategory: c }) // Dummy export for compatibility
};
