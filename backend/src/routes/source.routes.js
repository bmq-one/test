import express from 'express';
import prisma from '../config/database.js';
import { fetchSource } from '../services/scraper.service.js';
import { triggerArticleFetch } from '../services/cron.service.js';

const router = express.Router();

/**
 * GET /api/sources
 * Holt alle Quellen
 */
router.get('/', async (req, res, next) => {
  try {
    const sources = await prisma.source.findMany({
      include: {
        _count: {
          select: { articles: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(sources);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sources/:id
 * Holt eine spezifische Quelle
 */
router.get('/:id', async (req, res, next) => {
  try {
    const source = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: {
        articles: {
          take: 10,
          orderBy: {
            publishedAt: 'desc'
          }
        }
      }
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(source);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sources
 * Erstellt eine neue Quelle
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, url, type, category, isActive } = req.body;

    const source = await prisma.source.create({
      data: {
        name,
        url,
        type,
        category,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json(source);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sources/:id
 * Aktualisiert eine Quelle
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, url, type, category, isActive } = req.body;

    const source = await prisma.source.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(type && { type }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(source);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sources/:id
 * Löscht eine Quelle
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.source.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sources/:id/fetch
 * Manueller Fetch einer einzelnen Quelle
 */
router.post('/:id/fetch', async (req, res, next) => {
  try {
    const source = await prisma.source.findUnique({
      where: { id: req.params.id }
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const articles = await fetchSource(source);

    res.json({
      message: 'Source fetched successfully',
      articlesCount: articles.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sources/fetch-all
 * Manueller Fetch aller Quellen
 */
router.post('/fetch-all', async (req, res, next) => {
  try {
    const result = await triggerArticleFetch();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
