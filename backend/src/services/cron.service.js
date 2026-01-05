import cron from 'node-cron';
import { createLogger } from '../utils/logger.js';
import { fetchAllSources } from './scraper.service.js';
import { createNewsletter } from './newsletter.service.js';

const logger = createLogger('Cron');

/**
 * Startet alle Cron-Jobs für automatische Updates
 */
export function startCronJobs() {
  logger.info('Initializing cron jobs...');

  // Job 1: Fetch new articles every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running scheduled task: Fetch articles');
    try {
      await fetchAllSources();
      logger.info('Scheduled article fetch completed');
    } catch (error) {
      logger.error('Error in scheduled article fetch:', error);
    }
  });

  // Job 2: Generate newsletter based on frequency (daily by default)
  const frequency = process.env.NEWSLETTER_FREQUENCY || 'daily';

  let newsletterSchedule;
  switch (frequency) {
    case 'hourly': // Nur für Tests
      newsletterSchedule = '0 * * * *';
      break;
    case 'daily':
      newsletterSchedule = '0 8 * * *'; // Jeden Tag um 8:00 Uhr
      break;
    case 'weekly':
      newsletterSchedule = '0 8 * * 1'; // Jeden Montag um 8:00 Uhr
      break;
    case 'biweekly':
      newsletterSchedule = '0 8 */14 * *'; // Alle 14 Tage um 8:00 Uhr
      break;
    default:
      newsletterSchedule = '0 8 * * *'; // Daily default
  }

  cron.schedule(newsletterSchedule, async () => {
    logger.info('Running scheduled task: Generate newsletter');
    try {
      const newsletter = await createNewsletter({ autoPublish: true });
      if (newsletter) {
        logger.info(`Scheduled newsletter created: ${newsletter.id}`);
      } else {
        logger.info('No articles available for newsletter generation');
      }
    } catch (error) {
      logger.error('Error in scheduled newsletter generation:', error);
    }
  });

  logger.info(`Cron jobs started. Newsletter frequency: ${frequency}`);
}

/**
 * Manueller Trigger für Article Fetch (für Testing/Admin)
 */
export async function triggerArticleFetch() {
  logger.info('Manual trigger: Fetching articles');
  return await fetchAllSources();
}

/**
 * Manueller Trigger für Newsletter-Generierung (für Testing/Admin)
 */
export async function triggerNewsletterGeneration(options = {}) {
  logger.info('Manual trigger: Generating newsletter');
  return await createNewsletter(options);
}

export default {
  startCronJobs,
  triggerArticleFetch,
  triggerNewsletterGeneration
};
