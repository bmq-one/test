import express from 'express';
import prisma from '../config/database.js';

const router = express.Router();

/**
 * GET /api/articles
 * Holt alle Artikel mit Filtering und Pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sourceId,
      isProcessed,
      isIncluded,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      ...(sourceId && { sourceId }),
      ...(isProcessed !== undefined && { isProcessed: isProcessed === 'true' }),
      ...(isIncluded !== undefined && { isIncluded: isIncluded === 'true' }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          source: true,
          _count: {
            select: { newsletters: true }
          }
        },
        orderBy: {
          publishedAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.article.count({ where })
    ]);

    res.json({
      articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/articles/:id
 * Holt einen spezifischen Artikel
 */
router.get('/:id', async (req, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        newsletters: {
          include: {
            newsletter: true
          }
        }
      }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/articles/:id
 * Aktualisiert einen Artikel (z.B. isIncluded Flag)
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { isIncluded, summary } = req.body;

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(isIncluded !== undefined && { isIncluded }),
        ...(summary && { summary })
      }
    });

    res.json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/articles/:id
 * Löscht einen Artikel
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.article.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/articles/stats
 * Holt Statistiken über Artikel
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const [total, processed, included, recentCount] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { isProcessed: true } }),
      prisma.article.count({ where: { isIncluded: true } }),
      prisma.article.count({
        where: {
          fetchedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    res.json({
      total,
      processed,
      included,
      recentCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;
