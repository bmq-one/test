import db from './json-database.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Database');

// Test database connection
export async function initDatabase() {
  try {
    await db.$connect();
    logger.info('JSON Database initialized');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
  logger.info('Database connection closed');
});

export default db;
