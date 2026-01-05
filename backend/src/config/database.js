import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Database');

// Create Prisma client instance
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' }
  ]
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
  });
}

prisma.$on('error', (e) => {
  logger.error(`Database error: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Database warning: ${e.message}`);
});

// Test database connection
export async function initDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
    return prisma;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
});

export default prisma;
