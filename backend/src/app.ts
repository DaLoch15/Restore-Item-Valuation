import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import folderRoutes from './routes/folders';
import photoRoutes from './routes/photos';
import folderPhotoRoutes from './routes/folderPhotos';
import analysisRoutes from './routes/analysis';
import webhookRoutes from './routes/webhooks';
import inventoryRoutes from './routes/inventory';
import reportRoutes from './routes/reports';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());

// Global rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
}));

// Body parsing - 50mb limit for photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/folders/:folderId/photos', folderPhotoRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
