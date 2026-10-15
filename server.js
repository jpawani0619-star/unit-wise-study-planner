const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const scheduleRoutes = require('./src/routes/scheduleRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const { isWatsonxConfigured } = require('./src/services/watsonxService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    appName: 'AI-Based Unit-Wise Study Planner',
    timestamp: new Date().toISOString(),
    watsonxConfigured: isWatsonxConfigured(),
    activeMode: isWatsonxConfigured() ? 'watsonx' : 'demo'
  });
});

// API Routes
app.use('/api/schedule', scheduleRoutes);
app.use('/api/chat', chatRoutes);

// Catch-all route to serve index.html for single-page style navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start listening only when executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🎓 Study Planner Server is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🤖 AI Service Mode: ${isWatsonxConfigured() ? 'IBM watsonx.ai (Active)' : 'Demo Mode (Built-in Heuristic Advisor)'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
