console.log('Starting server.js');
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { logger } = require('./middleware/errorHandler');
const cron = require('node-cron');
const { processEscalations } = require('./services/escalationService');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// ======= WebSocket Setup =======
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io available in routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Join complaint room for real-time updates
  socket.on('join_complaint', (complaintId) => {
    socket.join(`complaint_${complaintId}`);
    logger.info(`Client ${socket.id} joined complaint room: ${complaintId}`);
  });

  // Join user room for notifications
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  // Authority joins their dashboard room
  socket.on('join_authority', (authorityId) => {
    socket.join(`authority_${authorityId}`);
    logger.info(`Authority ${authorityId} connected to dashboard`);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// ======= Escalation Cron Job — runs every hour =======
cron.schedule('0 * * * *', async () => {
  try {
    const count = await processEscalations(io);
    if (count > 0) logger.info(`⚡ Escalation cron: ${count} complaints processed`);
  } catch (error) {
    logger.error('Escalation cron error:', error);
  }
});

// ======= Start Server =======
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`📡 WebSocket server active`);
  logger.info(`🔗 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
});

module.exports = { server, io };
