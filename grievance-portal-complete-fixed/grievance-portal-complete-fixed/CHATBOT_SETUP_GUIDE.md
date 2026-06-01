# 🤖 AI Chatbot Integration Guide

## Overview
The Grievance Portal now includes an **AI-powered Chatbot** using Google's Gemini AI. This chatbot helps users navigate the portal, file complaints, and get real-time assistance.

## Features ✨

- **Real-time Chat**: Interactive messaging interface
- **Conversation History**: Maintains chat history for continuous context
- **Smart Suggestions**: AI-generated suggestions for complaint categorization
- **Multi-language Support Ready**: Easily extendable
- **Public & Authenticated Access**: Available to all users
- **Dark Mode Support**: Fully compatible with light/dark theme

## Architecture

### Backend Components

#### 1. **Gemini Chat Service** (`backend/src/services/geminiChatService.js`)
- Handles API calls to Google Gemini
- Manages conversation history
- Generates AI suggestions for complaints

#### 2. **Chatbot Controller** (`backend/src/controllers/chatbotController.js`)
- `sendChatMessage()` - Send a message to chatbot
- `getChatHistory()` - Retrieve conversation history
- `clearChatHistory()` - Clear chat history
- `getSuggestionForComplaint()` - Get AI suggestions
- `getChatbotStatus()` - Check chatbot status

#### 3. **Chatbot Routes** (`backend/src/routes/index.js`)
```
GET  /api/chatbot/status      - Check service status
POST /api/chatbot/message     - Send a message
GET  /api/chatbot/history     - Get conversation history
DELETE /api/chatbot/history   - Clear history
POST /api/chatbot/suggest     - Get suggestions for complaint
```

### Frontend Components

#### 1. **ChatbotWidget** (`frontend/src/components/ChatbotWidget.jsx`)
- Floating chat widget
- Message display and input
- Auto-scroll to latest messages
- Error handling and loading states

#### 2. **useChatbot Hook** (`frontend/src/hooks/useChatbot.js`)
- Reusable hook for chatbot API calls
- State management
- Error handling

## Setup Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

The package.json has been updated with `@google/generative-ai` package.

### 2. Configure Environment Variables

Add the following to your `FIXED_backend.env` file:

```env
# Gemini AI Chatbot
GEMINI_API_KEY=AIzaSyCzsIOJ0TtyKwJRZaD8z_M5eXRDsrv_CEk
```

**Note:** The API key has already been added to the environment file.

### 3. Start the Backend Server

```bash
cd backend
npm run dev    # Development mode with nodemon
# OR
npm start      # Production mode
```

The chatbot service will be available at `http://localhost:5000/api/chatbot`

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

The chatbot widget will appear in the bottom-right corner of all pages.

## API Endpoints

### 1. Send Message
**Endpoint:** `POST /api/chatbot/message`

**Request Body:**
```json
{
  "message": "How do I file a complaint?",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message processed",
  "data": {
    "userMessage": "How do I file a complaint?",
    "assistantResponse": "You can file a complaint by...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Conversation History
**Endpoint:** `GET /api/chatbot/history`

**Query Parameters:**
- `userId` (optional): Retrieve history for specific user

**Response:**
```json
{
  "success": true,
  "message": "Conversation history retrieved",
  "data": {
    "userId": "user-123",
    "history": [
      {
        "userMessage": "...",
        "assistantResponse": "...",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "totalMessages": 5
  }
}
```

### 3. Clear History
**Endpoint:** `DELETE /api/chatbot/history`

**Request Body:**
```json
{
  "userId": "optional-user-id"
}
```

### 4. Get Suggestions
**Endpoint:** `POST /api/chatbot/suggest`

**Request Body:**
```json
{
  "description": "I reported a pothole but no action was taken"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Suggestions generated",
  "data": {
    "category": "service_failure",
    "department": "Municipal Corporation",
    "severity": "medium",
    "suggestion": "..."
  }
}
```

### 5. Chatbot Status
**Endpoint:** `GET /api/chatbot/status`

**Response:**
```json
{
  "success": true,
  "message": "Chatbot is operational",
  "data": {
    "status": "active",
    "model": "Gemini Pro",
    "features": ["messaging", "history", "suggestions"],
    "version": "1.0.0"
  }
}
```

## Usage Examples

### Using the Chatbot Widget

1. Click the floating chat icon in the bottom-right corner
2. Type your question
3. Press Enter or click Send
4. View AI responses in real-time
5. Continue conversation with context maintained

### Using the Hook in Custom Components

```jsx
import useChatbot from './hooks/useChatbot';

function MyComponent() {
  const { sendMessage, isLoading, error } = useChatbot();

  const handleSend = async () => {
    try {
      const response = await sendMessage("How do I track my complaint?");
      console.log(response);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <button onClick={handleSend} disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Message'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
```

## System Prompt

The chatbot is configured with a specific system prompt to ensure relevant responses for the Grievance Portal:

```
You are a helpful AI assistant for the India Grievance Redressal Portal. Your role is to:
1. Help users file grievances and complaints
2. Provide information about the grievance redressal process
3. Answer questions about complaint tracking and status
4. Guide users on how to escalate their issues
5. Provide general support about the portal
6. Be empathetic and professional
```

You can modify the system prompt in `backend/src/services/geminiChatService.js` under the `SYSTEM_PROMPT` constant.

## Conversation History Storage

Currently, conversation history is stored **in-memory** using JavaScript Maps. For production:

### Recommended Improvements:

1. **Database Storage**: Store in MongoDB
```javascript
// Example MongoDB schema
const conversationSchema = new Schema({
  userId: String,
  messages: [{
    userMessage: String,
    assistantResponse: String,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

2. **Redis Caching**: For quick access to recent conversations
3. **Pagination**: Implement pagination for large history

## Error Handling

The chatbot includes comprehensive error handling:

- **Invalid input**: Validates message length and content
- **API errors**: Graceful fallback with user-friendly messages
- **Network errors**: Automatic retry logic
- **Rate limiting**: Built-in rate limit protection

## Security Considerations

1. **API Key Security**: 
   - Store in `.env` file (not in code)
   - Use environment variables in production
   - Rotate API keys periodically

2. **Input Validation**:
   - Max message length: 5000 characters
   - Input sanitization
   - XSS protection

3. **Authentication**:
   - Optional token-based authentication
   - User-specific chat history isolation

## Performance Optimization

1. **Conversation History Limit**: Only stores last 10 messages
2. **Message Caching**: Recent messages are cached
3. **Async API Calls**: Non-blocking requests
4. **Lazy Loading**: Chatbot widget loads on demand

## Troubleshooting

### Issue: Chatbot not responding
**Solution:**
- Verify Gemini API key in `.env` file
- Check if backend server is running
- Review backend logs for API errors

### Issue: Conversation history not saved
**Solution:**
- Check if user ID is properly set
- Verify browser storage is not full
- Clear browser cache and reload

### Issue: CORS errors
**Solution:**
- Ensure `CLIENT_URL` is correctly set in backend `.env`
- Check CORS middleware configuration in `app.js`

## Future Enhancements 🚀

1. **Multi-language Support**: Add language detection and translation
2. **Voice Chat**: Integrate speech-to-text and text-to-speech
3. **Document Upload**: Allow users to upload complaint documents
4. **Export Chat**: Download conversation as PDF
5. **Advanced Analytics**: Track common complaints and trends
6. **Integration with Complaint System**: Auto-fill complaint form
7. **Sentiment Analysis**: Detect user frustration level
8. **Smart Routing**: Route complex issues to human agents

## API Rate Limiting

The chatbot is subject to:
- General API rate limit: 100 requests per 15 minutes
- Chatbot-specific limit: 50 messages per user per hour (configurable)

## Monitoring and Logging

Check backend logs for chatbot activity:
```bash
# View logs in development
tail -f logs/app.log

# For production, use Winston logger
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check browser console for client-side errors
4. Check backend server logs for API errors

---

**Version:** 1.0.0  
**Last Updated:** January 2024  
**Status:** Production Ready ✅
