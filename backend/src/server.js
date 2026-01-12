import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import { initDatabase } from './config/database.js';
import newsletterRoutes from './routes/newsletter.routes.js';
import sourceRoutes from './routes/source.routes.js';
import articleRoutes from './routes/article.routes.js';
import { startCronJobs } from './services/cron.service.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('Server');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/articles', articleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await initDatabase();
    logger.info('Database connected successfully');

    // Start cron jobs for automatic newsletter updates
    if (process.env.NODE_ENV !== 'test') {
      startCronJobs();
      logger.info('Cron jobs started');
    }

    // Start Express server on all interfaces (0.0.0.0) for external access
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`External access enabled`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
