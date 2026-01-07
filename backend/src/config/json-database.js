import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    sources: [],
    articles: [],
    newsletters: [],
    newsletterArticles: [],
    config: []
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Read database
function readDB() {
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

// Write database
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate unique ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Simple JSON Database Client
const db = {
  source: {
    findMany: async (options = {}) => {
      const data = readDB();
      let sources = data.sources;

      if (options.where) {
        sources = sources.filter(source => {
          return Object.entries(options.where).every(([key, value]) => source[key] === value);
        });
      }

      if (options.include?._count) {
        sources = sources.map(source => ({
          ...source,
          _count: {
            articles: data.articles.filter(a => a.sourceId === source.id).length
          }
        }));
      }

      return sources;
    },

    findUnique: async (options) => {
      const data = readDB();
      const source = data.sources.find(s => s.id === options.where.id);

      if (options.include?.articles) {
        const articles = data.articles
          .filter(a => a.sourceId === source.id)
          .slice(0, 10)
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        return { ...source, articles };
      }

      return source;
    },

    create: async (options) => {
      const data = readDB();
      const source = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastFetched: null,
        ...options.data
      };
      data.sources.push(source);
      writeDB(data);
      return source;
    },

    update: async (options) => {
      const data = readDB();
      const index = data.sources.findIndex(s => s.id === options.where.id);
      if (index === -1) throw new Error('Source not found');

      data.sources[index] = {
        ...data.sources[index],
        ...options.data,
        updatedAt: new Date().toISOString()
      };
      writeDB(data);
      return data.sources[index];
    },

    delete: async (options) => {
      const data = readDB();
      const index = data.sources.findIndex(s => s.id === options.where.id);
      if (index === -1) throw new Error('Source not found');

      const source = data.sources[index];
      data.sources.splice(index, 1);
      // Also delete related articles
      data.articles = data.articles.filter(a => a.sourceId !== source.id);
      writeDB(data);
      return source;
    }
  },

  article: {
    findMany: async (options = {}) => {
      const data = readDB();
      let articles = data.articles;

      if (options.where) {
        articles = articles.filter(article => {
          return Object.entries(options.where).every(([key, value]) => {
            if (key === 'newsletters' && value.none) {
              const hasNewsletter = data.newsletterArticles.some(na => na.articleId === article.id);
              return !hasNewsletter;
            }
            if (typeof value === 'object' && value.contains) {
              return article[key]?.toLowerCase().includes(value.contains.toLowerCase());
            }
            return article[key] === value;
          });
        });
      }

      if (options.include?.source) {
        articles = articles.map(article => ({
          ...article,
          source: data.sources.find(s => s.id === article.sourceId)
        }));
      }

      if (options.include?._count) {
        articles = articles.map(article => ({
          ...article,
          _count: {
            newsletters: data.newsletterArticles.filter(na => na.articleId === article.id).length
          }
        }));
      }

      if (options.orderBy) {
        const [key, order] = Object.entries(options.orderBy)[0];
        articles.sort((a, b) => {
          const aVal = new Date(a[key]);
          const bVal = new Date(b[key]);
          return order === 'desc' ? bVal - aVal : aVal - bVal;
        });
      }

      if (options.take) {
        articles = articles.slice(0, options.take);
      }

      if (options.skip) {
        articles = articles.slice(options.skip);
      }

      return articles;
    },

    findUnique: async (options) => {
      const data = readDB();
      const article = data.articles.find(a =>
        options.where.id ? a.id === options.where.id : a.url === options.where.url
      );

      if (options.include?.source && article) {
        article.source = data.sources.find(s => s.id === article.sourceId);
      }

      return article;
    },

    create: async (options) => {
      const data = readDB();
      const article = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        isProcessed: false,
        isIncluded: false,
        ...options.data
      };
      data.articles.push(article);
      writeDB(data);

      if (options.include?.source) {
        article.source = data.sources.find(s => s.id === article.sourceId);
      }

      return article;
    },

    update: async (options) => {
      const data = readDB();
      const index = data.articles.findIndex(a => a.id === options.where.id);
      if (index === -1) throw new Error('Article not found');

      data.articles[index] = {
        ...data.articles[index],
        ...options.data,
        updatedAt: new Date().toISOString()
      };
      writeDB(data);
      return data.articles[index];
    },

    delete: async (options) => {
      const data = readDB();
      const index = data.articles.findIndex(a => a.id === options.where.id);
      if (index === -1) throw new Error('Article not found');

      const article = data.articles[index];
      data.articles.splice(index, 1);
      writeDB(data);
      return article;
    },

    count: async (options = {}) => {
      const data = readDB();
      let articles = data.articles;

      if (options.where) {
        articles = articles.filter(article => {
          return Object.entries(options.where).every(([key, value]) => {
            if (key === 'fetchedAt' && value.gte) {
              return new Date(article.fetchedAt) >= new Date(value.gte);
            }
            return article[key] === value;
          });
        });
      }

      return articles.length;
    }
  },

  newsletter: {
    findMany: async (options = {}) => {
      const data = readDB();
      let newsletters = data.newsletters;

      if (options.where) {
        newsletters = newsletters.filter(newsletter => {
          return Object.entries(options.where).every(([key, value]) => newsletter[key] === value);
        });
      }

      if (options.include?.articles) {
        newsletters = newsletters.map(newsletter => ({
          ...newsletter,
          articles: data.newsletterArticles
            .filter(na => na.newsletterId === newsletter.id)
            .map(na => ({
              ...na,
              article: {
                ...data.articles.find(a => a.id === na.articleId),
                source: data.sources.find(s => s.id === data.articles.find(a => a.id === na.articleId)?.sourceId)
              }
            }))
            .sort((a, b) => a.order - b.order)
        }));
      }

      if (options.orderBy) {
        const [key, order] = Object.entries(options.orderBy)[0];
        newsletters.sort((a, b) => {
          const aVal = new Date(a[key] || 0);
          const bVal = new Date(b[key] || 0);
          return order === 'desc' ? bVal - aVal : aVal - bVal;
        });
      }

      if (options.skip) {
        newsletters = newsletters.slice(options.skip);
      }

      if (options.take) {
        newsletters = newsletters.slice(0, options.take);
      }

      return newsletters;
    },

    findFirst: async (options) => {
      const newsletters = await db.newsletter.findMany(options);
      return newsletters[0] || null;
    },

    findUnique: async (options) => {
      const data = readDB();
      const newsletter = data.newsletters.find(n => n.id === options.where.id);

      if (options.include?.articles && newsletter) {
        newsletter.articles = data.newsletterArticles
          .filter(na => na.newsletterId === newsletter.id)
          .map(na => ({
            ...na,
            article: {
              ...data.articles.find(a => a.id === na.articleId),
              source: data.sources.find(s => s.id === data.articles.find(a => a.id === na.articleId)?.sourceId)
            }
          }))
          .sort((a, b) => a.order - b.order);
      }

      return newsletter;
    },

    create: async (options) => {
      const data = readDB();
      const newsletter = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: null,
        status: 'DRAFT',
        ...options.data
      };
      data.newsletters.push(newsletter);
      writeDB(data);
      return newsletter;
    },

    update: async (options) => {
      const data = readDB();
      const index = data.newsletters.findIndex(n => n.id === options.where.id);
      if (index === -1) throw new Error('Newsletter not found');

      data.newsletters[index] = {
        ...data.newsletters[index],
        ...options.data,
        updatedAt: new Date().toISOString()
      };
      writeDB(data);
      return data.newsletters[index];
    },

    delete: async (options) => {
      const data = readDB();
      const index = data.newsletters.findIndex(n => n.id === options.where.id);
      if (index === -1) throw new Error('Newsletter not found');

      const newsletter = data.newsletters[index];
      data.newsletters.splice(index, 1);
      // Also delete related newsletterArticles
      data.newsletterArticles = data.newsletterArticles.filter(na => na.newsletterId !== newsletter.id);
      writeDB(data);
      return newsletter;
    },

    count: async (options = {}) => {
      const data = readDB();
      let newsletters = data.newsletters;

      if (options.where) {
        newsletters = newsletters.filter(newsletter => {
          return Object.entries(options.where).every(([key, value]) => newsletter[key] === value);
        });
      }

      return newsletters.length;
    }
  },

  newsletterArticle: {
    create: async (options) => {
      const data = readDB();
      const na = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        ...options.data
      };
      data.newsletterArticles.push(na);
      writeDB(data);
      return na;
    }
  },

  config: {
    findMany: async (options = {}) => {
      const data = readDB();
      let configs = data.config;

      if (options.where?.key?.in) {
        configs = configs.filter(c => options.where.key.in.includes(c.key));
      }

      return configs;
    }
  },

  $connect: async () => {
    // No-op for JSON DB
  },

  $disconnect: async () => {
    // No-op for JSON DB
  }
};

export default db;
