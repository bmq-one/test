import { createLogger } from '../utils/logger.js';
import prisma from '../config/database.js';
import { generateNewsletter } from './ai.service.js';
import { marked } from 'marked';

const logger = createLogger('Newsletter');

/**
 * Erstellt einen neuen Newsletter aus den besten unverarbeiteten Artikeln
 */
export async function createNewsletter(options = {}) {
  try {
    const {
      maxArticles = parseInt(process.env.MAX_ARTICLES_PER_NEWSLETTER) || 10,
      autoPublish = false
    } = options;

    logger.info('Creating new newsletter...');

    // Hole die besten Artikel, die noch nicht in einem Newsletter sind
    const articles = await prisma.article.findMany({
      where: {
        isProcessed: true,
        isIncluded: true,
        newsletters: {
          none: {}
        }
      },
      include: {
        source: true
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: maxArticles
    });

    if (articles.length === 0) {
      logger.warn('No articles available for newsletter');
      return null;
    }

    logger.info(`Generating newsletter with ${articles.length} articles`);

    // Generiere Newsletter-Content mit AI
    const content = await generateNewsletter(articles);

    // Konvertiere Markdown zu HTML
    const htmlContent = marked(content);

    // Erstelle Newsletter in DB
    const newsletter = await prisma.newsletter.create({
      data: {
        title: generateNewsletterTitle(),
        content,
        htmlContent,
        status: autoPublish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: autoPublish ? new Date() : null
      }
    });

    // Verknüpfe Artikel mit Newsletter
    await Promise.all(
      articles.map((article, index) =>
        prisma.newsletterArticle.create({
          data: {
            newsletterId: newsletter.id,
            articleId: article.id,
            order: index
          }
        })
      )
    );

    logger.info(`Newsletter created successfully: ${newsletter.id}`);

    return await getNewsletterById(newsletter.id);
  } catch (error) {
    logger.error('Error creating newsletter:', error);
    throw error;
  }
}

/**
 * Generiert einen Titel für den Newsletter basierend auf dem aktuellen Datum
 */
function generateNewsletterTitle() {
  const date = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = date.toLocaleDateString('de-DE', options);

  return `AI Newsletter - ${dateStr}`;
}

/**
 * Holt alle Newsletter (mit Pagination)
 */
export async function getNewsletters(options = {}) {
  const {
    page = 1,
    limit = 10,
    status = null
  } = options;

  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [newsletters, total] = await Promise.all([
    prisma.newsletter.findMany({
      where,
      include: {
        articles: {
          include: {
            article: {
              include: {
                source: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.newsletter.count({ where })
  ]);

  return {
    newsletters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Holt einen einzelnen Newsletter anhand der ID
 */
export async function getNewsletterById(id) {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    include: {
      articles: {
        include: {
          article: {
            include: {
              source: true
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  });

  if (!newsletter) {
    throw new Error('Newsletter not found');
  }

  return newsletter;
}

/**
 * Holt den neuesten veröffentlichten Newsletter
 */
export async function getLatestNewsletter() {
  const newsletter = await prisma.newsletter.findFirst({
    where: {
      status: 'PUBLISHED'
    },
    include: {
      articles: {
        include: {
          article: {
            include: {
              source: true
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }
    },
    orderBy: {
      publishedAt: 'desc'
    }
  });

  return newsletter;
}

/**
 * Veröffentlicht einen Draft-Newsletter
 */
export async function publishNewsletter(id) {
  const newsletter = await prisma.newsletter.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  });

  logger.info(`Newsletter published: ${id}`);

  return newsletter;
}

/**
 * Archiviert einen Newsletter
 */
export async function archiveNewsletter(id) {
  const newsletter = await prisma.newsletter.update({
    where: { id },
    data: {
      status: 'ARCHIVED'
    }
  });

  logger.info(`Newsletter archived: ${id}`);

  return newsletter;
}

/**
 * Löscht einen Newsletter
 */
export async function deleteNewsletter(id) {
  await prisma.newsletter.delete({
    where: { id }
  });

  logger.info(`Newsletter deleted: ${id}`);
}

export default {
  createNewsletter,
  getNewsletters,
  getNewsletterById,
  getLatestNewsletter,
  publishNewsletter,
  archiveNewsletter,
  deleteNewsletter
};
