const {
  sendMessage,
  getConversationHistory,
  clearConversationHistory,
  getSuggestions,
} = require('../services/geminiChatService');

/**
 * Send a message to the chatbot
 * POST /api/chatbot/message
 */
const sendChatMessage = async (req, res) => {
  const receiveTime = Date.now();
  console.log(`⏱️ [BACKEND] Request received at: ${new Date(receiveTime).toISOString()}`);
  try {
    const { message, mode } = req.body;
    const userId = req.user?.id || req.body.userId || 'anonymous';

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long (max 5000 characters)',
      });
    }

    const response = await sendMessage(message, userId, mode);

    console.log(`⏱️ [BACKEND] Controller finished processing in ${Date.now() - receiveTime}ms`);

    res.status(200).json({
      success: true,
      reply: response, // Fulfills "Return response as: { reply: 'answer text' }"
      data: {
        userMessage: message,
        assistantResponse: response,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process message',
    });
  }
};

/**
 * Get conversation history for the user
 * GET /api/chatbot/history
 */
const getChatHistory = (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || 'anonymous';
    const history = getConversationHistory(userId);

    res.status(200).json({
      success: true,
      message: 'Conversation history retrieved',
      data: {
        userId,
        history,
        totalMessages: history.length,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation history',
    });
  }
};

/**
 * Clear conversation history
 * DELETE /api/chatbot/history
 */
const clearChatHistory = (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'anonymous';
    clearConversationHistory(userId);

    res.status(200).json({
      success: true,
      message: 'Conversation history cleared',
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversation history',
    });
  }
};

/**
 * Get AI suggestions for a complaint
 * POST /api/chatbot/suggest
 */
const getSuggestionForComplaint = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Complaint description cannot be empty',
      });
    }

    if (description.length > 3000) {
      return res.status(400).json({
        success: false,
        message: 'Description is too long (max 3000 characters)',
      });
    }

    const suggestions = await getSuggestions(description);

    res.status(200).json({
      success: true,
      message: 'Suggestions generated',
      data: suggestions,
    });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate suggestions',
    });
  }
};

/**
 * Get chatbot status
 * GET /api/chatbot/status
 */
const getChatbotStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chatbot is operational',
    data: {
      status: 'active',
      model: 'Gemini Pro',
      features: ['messaging', 'history', 'suggestions'],
      version: '1.0.0',
    },
  });
};

module.exports = {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  getSuggestionForComplaint,
  getChatbotStatus,
};
