import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createLogger } from '../utils/logger.js';
import prisma from '../config/database.js';
import { summarizeArticle, scoreArticleRelevance } from './ai.service.js';

const logger = createLogger('Scraper');
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AI-Newsletter-Bot/1.0'
  }
});

/**
 * Fetched alle aktiven Quellen und sammelt neue Artikel
 */
export async function fetchAllSources() {
  try {
    const sources = await prisma.source.findMany({
      where: { isActive: true }
    });

    logger.info(`Fetching ${sources.length} active sources`);

    const results = await Promise.allSettled(
      sources.map(source => fetchSource(source))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Fetch completed: ${successful} successful, ${failed} failed`);

    return {
      total: sources.length,
      successful,
      failed
    };
  } catch (error) {
    logger.error('Error fetching all sources:', error);
    throw error;
  }
}

/**
 * Fetched Artikel von einer einzelnen Quelle
 */
export async function fetchSource(source) {
  try {
    logger.info(`Fetching source: ${source.name} (${source.type})`);

    let articles = [];

    switch (source.type) {
      case 'RSS':
        articles = await fetchRSSFeed(source);
        break;
      case 'WEBSITE':
        articles = await scrapeWebsite(source);
        break;
      case 'API':
        articles = await fetchFromAPI(source);
        break;
      default:
        logger.warn(`Unknown source type: ${source.type}`);
        return [];
    }

    // Speichere neue Artikel in der Datenbank
    const savedArticles = await saveArticles(articles, source.id);

    // Update lastFetched timestamp
    await prisma.source.update({
      where: { id: source.id },
      data: { lastFetched: new Date() }
    });

    logger.info(`Saved ${savedArticles.length} new articles from ${source.name}`);

    return savedArticles;
  } catch (error) {
    logger.error(`Error fetching source ${source.name}:`, error);
    throw error;
  }
}

/**
 * Fetched Artikel von einem RSS-Feed
 */
async function fetchRSSFeed(source) {
  try {
    const feed = await rssParser.parseURL(source.url);

    const articles = feed.items.map(item => ({
      title: item.title || 'Untitled',
      url: item.link,
      content: item.contentSnippet || item.content || item.summary || '',
      author: item.creator || item.author || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
    }));

    return articles;
  } catch (error) {
    logger.error(`Error parsing RSS feed ${source.url}:`, error);
    return [];
  }
}

/**
 * Scraped Artikel von einer Website
 */
async function scrapeWebsite(source) {
  try {
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Newsletter-Bot/1.0)'
      }
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Beispiel: Generisches Scraping von Artikeln
    // TODO: Hier können spezifische Selektoren für verschiedene Websites konfiguriert werden
    $('article, .post, .entry').each((i, elem) => {
      const title = $(elem).find('h1, h2, h3').first().text().trim();
      const link = $(elem).find('a').first().attr('href');
      const content = $(elem).find('p').text().trim();

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `${new URL(source.url).origin}${link}`,
          content: content.substring(0, 1000), // Limit content length
          publishedAt: new Date()
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Error scraping website ${source.url}:`, error);
    return [];
  }
}

/**
 * Fetched Artikel von einer API
 */
async function fetchFromAPI(source) {
  try {
    // Beispiel für generische API-Integration
    // TODO: Spezifische API-Integrationen können hier hinzugefügt werden
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AI-Newsletter-Bot/1.0'
      }
    });

    // Annahme: API gibt Array von Artikeln zurück
    const articles = response.data.articles || response.data.items || [];

    return articles.map(item => ({
      title: item.title || 'Untitled',
      url: item.url || item.link,
      content: item.content || item.description || '',
      author: item.author || null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date()
    }));
  } catch (error) {
    logger.error(`Error fetching from API ${source.url}:`, error);
    return [];
  }
}

/**
 * Speichert neue Artikel in der Datenbank
 */
async function saveArticles(articles, sourceId) {
  const saved = [];

  for (const article of articles) {
    try {
      // Prüfe ob Artikel bereits existiert
      const existing = await prisma.article.findUnique({
        where: { url: article.url }
      });

      if (existing) {
        logger.debug(`Article already exists: ${article.title}`);
        continue;
      }

      // Erstelle neuen Artikel
      const newArticle = await prisma.article.create({
        data: {
          sourceId,
          title: article.title,
          url: article.url,
          content: article.content,
          author: article.author,
          publishedAt: article.publishedAt
        },
        include: {
          source: true
        }
      });

      // Generiere Zusammenfassung und bewerte Relevanz im Hintergrund
      processArticleAsync(newArticle);

      saved.push(newArticle);
    } catch (error) {
      logger.error(`Error saving article ${article.title}:`, error);
    }
  }

  return saved;
}

/**
 * Verarbeitet einen Artikel asynchron (Zusammenfassung + Relevanz-Score)
 */
async function processArticleAsync(article) {
  try {
    // Generiere Zusammenfassung
    const summary = await summarizeArticle(article);

    // Bewerte Relevanz
    const relevanceScore = await scoreArticleRelevance(article);

    // Update Artikel in DB
    await prisma.article.update({
      where: { id: article.id },
      data: {
        summary,
        isProcessed: true,
        isIncluded: relevanceScore >= 7 // Auto-include if score is high
      }
    });

    logger.info(`Processed article: ${article.title} (score: ${relevanceScore})`);
  } catch (error) {
    logger.error(`Error processing article ${article.id}:`, error);
  }
}

export default {
  fetchAllSources,
  fetchSource
};
