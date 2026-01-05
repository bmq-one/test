import express from 'express';
import * as newsletterService from '../services/newsletter.service.js';
import { triggerNewsletterGeneration } from '../services/cron.service.js';

const router = express.Router();

/**
 * GET /api/newsletters
 * Holt alle Newsletter mit Pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await newsletterService.getNewsletters({
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/newsletters/latest
 * Holt den neuesten veröffentlichten Newsletter
 */
router.get('/latest', async (req, res, next) => {
  try {
    const newsletter = await newsletterService.getLatestNewsletter();

    if (!newsletter) {
      return res.status(404).json({ error: 'No published newsletters found' });
    }

    res.json(newsletter);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/newsletters/:id
 * Holt einen spezifischen Newsletter
 */
router.get('/:id', async (req, res, next) => {
  try {
    const newsletter = await newsletterService.getNewsletterById(req.params.id);
    res.json(newsletter);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/newsletters
 * Erstellt einen neuen Newsletter
 */
router.post('/', async (req, res, next) => {
  try {
    const { maxArticles, autoPublish } = req.body;

    const newsletter = await newsletterService.createNewsletter({
      maxArticles,
      autoPublish
    });

    if (!newsletter) {
      return res.status(400).json({ error: 'No articles available for newsletter' });
    }

    res.status(201).json(newsletter);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/newsletters/generate
 * Manueller Trigger für Newsletter-Generierung
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { maxArticles, autoPublish } = req.body;

    const newsletter = await triggerNewsletterGeneration({
      maxArticles,
      autoPublish
    });

    if (!newsletter) {
      return res.status(400).json({ error: 'No articles available for newsletter' });
    }

    res.status(201).json(newsletter);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/newsletters/:id/publish
 * Veröffentlicht einen Draft-Newsletter
 */
router.patch('/:id/publish', async (req, res, next) => {
  try {
    const newsletter = await newsletterService.publishNewsletter(req.params.id);
    res.json(newsletter);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/newsletters/:id/archive
 * Archiviert einen Newsletter
 */
router.patch('/:id/archive', async (req, res, next) => {
  try {
    const newsletter = await newsletterService.archiveNewsletter(req.params.id);
    res.json(newsletter);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/newsletters/:id
 * Löscht einen Newsletter
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await newsletterService.deleteNewsletter(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
