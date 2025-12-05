// server/src/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimit');
const { originCheck } = require('./middlewares/csrfMiddleware');

// Initialize Express app
const app = express();

// Environment variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ======================
// Security Middleware
// ======================

// Helmet for comprehensive security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  // Prevent clickjacking
  xFrameOptions: { action: 'deny' },
  // Prevent MIME type sniffing
  xContentTypeOptions: true,
  // Enable XSS filter
  xXssProtection: true,
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // HSTS (enable in production)
  hsts: NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  // Permissions policy
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// Additional security headers
app.use((_req, res, next) => {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Remove X-Powered-By header (already done by helmet but extra safety)
  res.removeHeader('X-Powered-By');
  next();
});

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production'
    ? FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ======================
// Body Parsing Middleware
// ======================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// Logging Middleware
// ======================

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ======================
// Rate Limiting
// ======================

app.use('/api', generalLimiter);

// ======================
// Request Timestamp
// ======================

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ======================
// Static Files (Uploads)
// ======================

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ======================
// CSRF Protection
// ======================

app.use('/api', originCheck);

// ======================
// API Routes
// ======================

app.use('/api', routes);

// ======================
// Root Route
// ======================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to LoanSphere API',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      auth: '/api/auth',
      customers: '/api/customers',
      loanProducts: '/api/loan-products',
      loanAccounts: '/api/loan-accounts',
      payments: '/api/payments',
      reports: '/api/reports',
    },
  });
});

// ======================
// Error Handling
// ======================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ======================
// Database Connection & Server Start
// ======================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    app.listen(PORT, () => {
      console.log('═'.repeat(50));
      console.log(`🚀 LoanSphere Server Started`);
      console.log('═'.repeat(50));
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Server URL: http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
      console.log('═'.repeat(50));
      console.log('Available Endpoints:');
      console.log('  GET  /api/health       - Health check');
      console.log('  POST /api/auth/login   - Login');
      console.log('  POST /api/auth/register- Register');
      console.log('  GET  /api/customers    - List customers');
      console.log('  GET  /api/loan-products- List products');
      console.log('  GET  /api/loan-accounts- List loans');
      console.log('  GET  /api/reports/dashboard - Dashboard');
      console.log('═'.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
