const express = require('express');
const router = express.Router();

// Import controllers
const { register, login, googleLogin, getProfile, updateProfile, changePassword, refreshToken, getNotifications, markNotificationRead } = require('../controllers/authController');
const { markAllNotificationsRead } = require('../controllers/notificationController');
const { submitComplaint, trackComplaint, getMyComplaints, getComplaintDetail, getAssignedComplaints, updateComplaintStatus, getAnalytics, getHeatmapData, checkDuplicateComplaint } = require('../controllers/complaintController');
const { getAllUsers, createAuthority, getAllComplaints, reassignComplaint, toggleUserStatus, getAllAuthorities, getFullAnalytics } = require('../controllers/adminController');
const { sendChatMessage, getChatHistory, clearChatHistory, getSuggestionForComplaint, getChatbotStatus } = require('../controllers/chatbotController');
const { detectComplaintIssue } = require('../controllers/aiController');

// Import middleware
const { verifyToken, authorize, optionalAuth, ROLES } = require('../middleware/auth');
const { registerValidator, loginValidator, complaintValidator, statusUpdateValidator } = require('../middleware/validate');
const { upload } = require('../config/cloudinary');

// ============= AUTH ROUTES =============
const jwt = require('jsonwebtoken');
const authRouter = express.Router();
authRouter.post('/register', registerValidator, register);
authRouter.post('/login', loginValidator, login);
authRouter.post('/google-login', googleLogin);
authRouter.post('/refresh', refreshToken);
authRouter.get('/profile', verifyToken, getProfile);
authRouter.put('/profile', verifyToken, updateProfile);
authRouter.put('/change-password', verifyToken, changePassword);
authRouter.get('/notifications', verifyToken, getNotifications);
authRouter.put('/notifications/read-all', verifyToken, markAllNotificationsRead);
authRouter.put('/notifications/:id/read', verifyToken, markNotificationRead);

// Demo Admin Login Endpoint
authRouter.post('/demo-admin-login', async (req, res) => {
  console.log("👉 [demo-admin-login] Attempting login");
  try {
    const demoEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@grievanceportal.gov.in';
    const demoPassword = process.env.DEMO_ADMIN_PASSWORD || 'Admin@1234';

    const { email, password } = req.body;
    console.log(`👉 [demo-admin-login] email: "${email}"`);

    if (email !== demoEmail || password !== demoPassword) {
      console.log("❌ [demo-admin-login] Invalid demo credentials");
      return res.status(401).json({ success: false, message: 'Invalid demo administrator credentials.' });
    }

    // Dynamically retrieve the real admin user ID from the database
    const { getDb, COLLECTIONS } = require('../config/firebase');
    const db = getDb();
    let adminUserId = 'users-1780026159389-7ggnttd0n'; // Fallback
    let adminName = 'Super Admin';

    try {
      const snapshot = await db
        .collection(COLLECTIONS.USERS)
        .where('email', '==', demoEmail.toLowerCase())
        .limit(1)
        .get();

      if (!snapshot.empty) {
        adminUserId = snapshot.docs[0].id;
        adminName = snapshot.docs[0].data().name || 'Super Admin';
        console.log(`🔍 [demo-admin-login] Found real admin in DB with ID: ${adminUserId}`);
      } else {
        console.warn(`⚠️ [demo-admin-login] Admin user not found in DB, using fallback ID: ${adminUserId}`);
      }
    } catch (dbErr) {
      console.error("❌ [demo-admin-login] DB lookup error, using fallback ID:", dbErr.message);
    }

    // Generate JWT tokens
    const token = jwt.sign(
      { userId: adminUserId, role: 'super_admin' },
      process.env.JWT_SECRET || 'a8f3k9m2n8p5q1r4s6t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8_secret',
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: adminUserId },
      process.env.JWT_REFRESH_SECRET || 'a7f3k9m2n8p5q1r4s6t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8_refresh',
      { expiresIn: '30d' }
    );

    const adminData = {
      id: adminUserId,
      name: adminName,
      email: demoEmail,
      role: 'super_admin'
    };

    console.log("✅ [demo-admin-login] Login successful");
    console.log("API response:", { success: true, token, refreshToken, user: adminData });

    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: adminData
    });
  } catch (error) {
    console.error("❌ [demo-admin-login] Error:", error);
    return res.status(500).json({ success: false, message: 'Server error during demo login.' });
  }
});

// ============= COMPLAINT ROUTES =============
const complaintRouter = express.Router();

// Public tracking
complaintRouter.get('/track/:complaintId', trackComplaint);
complaintRouter.get('/heatmap', getHeatmapData);

// Submit complaint (optional auth for anonymous)
complaintRouter.post('/', optionalAuth, upload.array('attachments', 5), complaintValidator, submitComplaint);

// AI Photo Issue Detection
complaintRouter.post('/detect-issue', optionalAuth, upload.single('image'), detectComplaintIssue);

// Check duplicate complaint
complaintRouter.post('/check-duplicate', optionalAuth, checkDuplicateComplaint);

// Citizen routes
complaintRouter.get('/my', verifyToken, authorize(ROLES.CITIZEN), getMyComplaints);
complaintRouter.get('/:id', verifyToken, getComplaintDetail);

// Authority routes
complaintRouter.get('/authority/assigned', verifyToken, authorize(ROLES.PS_OFFICER, ROLES.ACB_OFFICER, ROLES.MUNICIPAL_OFFICER, ROLES.FIRE_OFFICER, ROLES.HOSPITAL_OFFICER, ROLES.SUPER_ADMIN), getAssignedComplaints);
complaintRouter.put('/:id/status', verifyToken, authorize(ROLES.PS_OFFICER, ROLES.ACB_OFFICER, ROLES.MUNICIPAL_OFFICER, ROLES.FIRE_OFFICER, ROLES.HOSPITAL_OFFICER, ROLES.SUPER_ADMIN), upload.array('proofs', 3), statusUpdateValidator, updateComplaintStatus);

// Admin analytics
complaintRouter.get('/admin/analytics', verifyToken, authorize(ROLES.SUPER_ADMIN), getAnalytics);

// ============= ADMIN ROUTES =============
const adminRouter = express.Router();
adminRouter.use(verifyToken, authorize(ROLES.SUPER_ADMIN));

adminRouter.get('/users', getAllUsers);
adminRouter.post('/authorities', createAuthority);
adminRouter.put('/users/:id/toggle', toggleUserStatus);
adminRouter.get('/complaints', getAllComplaints);
adminRouter.put('/complaints/:id/reassign', reassignComplaint);
adminRouter.get('/authorities', getAllAuthorities);
adminRouter.get('/analytics', getFullAnalytics);

// Escalation endpoints
const { escalationHandler } = require('../controllers/escalationController');
adminRouter.get('/escalations/stats', escalationHandler);
adminRouter.post('/escalations/manual', escalationHandler);

// ============= CHATBOT ROUTES =============
const chatbotRouter = express.Router();

// Chatbot endpoints (public and authenticated)
chatbotRouter.get('/status', getChatbotStatus);
chatbotRouter.post('/message', sendChatMessage);
chatbotRouter.get('/history', getChatHistory);
chatbotRouter.delete('/history', clearChatHistory);
chatbotRouter.post('/suggest', getSuggestionForComplaint);

// ============= MOUNT ROUTES =============
const { handleVoiceChat } = require('../controllers/openaiVoiceController');
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage() });

// ============= REPUTATION ROUTES =============
const reputationRouter = express.Router();
const { getMyReputation, getLeaderboard } = require('../controllers/reputationController');
reputationRouter.get('/me', verifyToken, getMyReputation);
reputationRouter.get('/leaderboard', verifyToken, getLeaderboard);

const { handleGroqTranscribe } = require('../controllers/groqVoiceController');
const { handleUnderstandCommand } = require('../controllers/groqVoiceAgentController');
const { handleVoiceIntent } = require('../controllers/voiceIntentController');

router.use('/auth', authRouter);
router.use('/complaints', complaintRouter);
router.use('/admin', adminRouter);
router.use('/chatbot', chatbotRouter);
router.use('/reputation', reputationRouter);
router.post('/openai-voice/chat', memoryUpload.single('file'), handleVoiceChat);
router.post('/voice/transcribe', memoryUpload.single('file'), handleGroqTranscribe);
router.post('/voice/understand-command', handleUnderstandCommand);
router.post('/voice/intent', handleVoiceIntent);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Grievance Portal API is running.', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// GET /api/test
router.get('/test', (req, res) => {
  res.json({ message: "Backend working" });
});

// Import sendMessage from geminiChatService
const { sendMessage } = require('../services/geminiChatService');

// POST /api/voice-ai
router.post('/voice-ai', async (req, res) => {
  const receiveTime = Date.now();
  console.log(`⏱️ [BACKEND] voice-ai request received at: ${new Date(receiveTime).toISOString()}`);
  
  try {
    // 4. Accept both message and question
    const userMessage = req.body.message || req.body.question;
    console.log(`⏱️ [BACKEND] Received message: "${userMessage}"`);

    // 2. If message is empty
    if (!userMessage || userMessage.trim().length === 0) {
      console.log('⏱️ [BACKEND] Empty message received');
      return res.status(200).json({ reply: "Please say something." });
    }

    const cleanText = userMessage.toLowerCase().trim();

    // 1. Instant greetings
    if (cleanText === 'hi' || cleanText === 'hello' || cleanText === 'hey') {
      console.log(`⏱️ [BACKEND] Instant greeting matched locally: ${cleanText}`);
      return res.status(200).json({ reply: "Hi, how can I help?" });
    }

    if (cleanText === 'how are you') {
      console.log(`⏱️ [BACKEND] Instant how are you matched: ${cleanText}`);
      return res.status(200).json({ reply: "I'm doing great, thank you." });
    }

    if (cleanText === 'thank you' || cleanText === 'thanks') {
      console.log(`⏱️ [BACKEND] Instant greeting matched locally: ${cleanText}`);
      return res.status(200).json({ reply: "You're welcome." });
    }

    if (cleanText === 'ok') {
      console.log(`⏱️ [BACKEND] Instant ok matched: ${cleanText}`);
      return res.status(200).json({ reply: "Okay." });
    }

    // 3. Call Gemini
    console.log(`⏱️ [BACKEND] Calling Gemini AI for message: "${userMessage}"`);
    const replyText = await sendMessage(userMessage, 'anonymous', 'voice');
    console.log(`⏱️ [BACKEND] Gemini AI response received: "${replyText}"`);

    // 14. Return proper JSON response in every case
    return res.status(200).json({ reply: replyText });
  } catch (error) {
    // 8. Add console.log for Gemini errors
    console.error('⏱️ [BACKEND] Gemini error:', error);
    return res.status(500).json({ reply: "Sorry, I encountered an error communicating with my AI brain. Please try again." });
  }
});

// POST /api/chat
router.post('/chat', async (req, res) => {
  const receiveTime = Date.now();
  console.log(`⏱️ [BACKEND] Chatbot request received at: ${new Date(receiveTime).toISOString()}`);
  
  try {
    const userMessage = req.body.message || req.body.question;
    console.log(`⏱️ [BACKEND] Received chat message: "${userMessage}"`);

    if (!userMessage || userMessage.trim().length === 0) {
      return res.status(200).json({ reply: "Please type something." });
    }

    const cleanText = userMessage.toLowerCase().trim();

    // 2. Add fast basic replies without API
    if (cleanText === 'hi' || cleanText === 'hello' || cleanText === 'hey') {
      console.log('💬 Chatbot greeting matched instantly on backend');
      return res.status(200).json({ reply: "Hi, how can I help?" });
    }

    if (cleanText === 'how are you') {
      console.log('💬 Chatbot how are you matched instantly on backend');
      return res.status(200).json({ reply: "I'm doing great, thank you." });
    }

    if (cleanText === 'thank you' || cleanText === 'thanks') {
      console.log('💬 Chatbot thanks matched instantly on backend');
      return res.status(200).json({ reply: "You're welcome." });
    }

    if (cleanText === 'ok') {
      console.log('💬 Chatbot ok matched instantly on backend');
      return res.status(200).json({ reply: "Okay." });
    }

    // Call Gemini with caching, fallbacks, and smart city guidelines
    console.log(`⏱️ [BACKEND] Calling Gemini AI for chat: "${userMessage}"`);
    const replyText = await sendMessage(userMessage, 'anonymous', 'chat');
    console.log(`⏱️ [BACKEND] Gemini AI chat response received: "${replyText}"`);

    return res.status(200).json({ reply: replyText });
  } catch (error) {
    console.error('⏱️ [BACKEND] Chat error:', error);
    return res.status(500).json({ reply: "Sorry, I encountered an error communicating with my AI brain. Please try again." });
  }
});

module.exports = router;
