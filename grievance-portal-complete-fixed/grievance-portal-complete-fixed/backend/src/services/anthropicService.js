/**
 * Anthropic Claude API Completion Service with Dynamic Groq Fallback
 * Directly interacts with the Anthropic Messages API using native global fetch.
 * Automatically falls back transparently to Groq Llama 3.3/3.1 if Anthropic credits are exhausted.
 */
async function generateClaudeCompletion(systemInstruction, userPrompt, jsonMode = false) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Try Anthropic Claude first
  if (anthropicKey) {
    const models = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022'
    ];

    for (const model of models) {
      try {
        console.log(`🤖 [anthropicService] Querying Claude model: ${model}...`);
        const payload = {
          model: model,
          max_tokens: jsonMode ? 450 : 250,
          system: systemInstruction,
          messages: [
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text;
          if (text) {
            console.log(`✅ [anthropicService] Successfully generated content using Claude ${model}`);
            return text.trim();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || '';
          console.warn(`⚠️ Claude model ${model} response error:`, errMsg);
          if (errMsg.toLowerCase().includes('credit balance') || errMsg.toLowerCase().includes('billing')) {
            console.warn(`🚨 Anthropic key is out of credits. Shifting to Groq fallback.`);
            break; // Stop querying Claude if credits are empty! Go straight to Groq!
          }
        }
      } catch (err) {
        console.warn(`⚠️ [anthropicService] Claude model ${model} failed:`, err.message);
      }
    }
  }

  // 2. Fall back transparently to Groq Llama 3.3/3.1
  if (groqKey) {
    console.log(`🤖 [anthropicService] Claude out of credits or unavailable. Falling back transparently to Groq...`);
    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];

    for (const modelName of groqModels) {
      try {
        console.log(`🤖 [anthropicService] Querying Groq model: ${modelName}...`);
        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: userPrompt });

        const payload = {
          model: modelName,
          messages: messages,
          max_tokens: jsonMode ? 450 : 250,
          temperature: 0.2
        };

        if (jsonMode) {
          payload.response_format = { type: "json_object" };
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices[0]?.message?.content;
          if (text) {
            console.log(`✅ [anthropicService] Successfully generated fallback content using Groq ${modelName}`);
            return text.trim();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`⚠️ Groq model ${modelName} response error:`, errData.error?.message);
        }
      } catch (err) {
        console.warn(`⚠️ [anthropicService] Groq model ${modelName} failed:`, err.message);
      }
    }
  }

  throw new Error('All Anthropic Claude and Groq fallback models failed');
}

module.exports = {
  generateClaudeCompletion
};
