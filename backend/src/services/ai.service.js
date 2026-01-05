import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';
import prisma from '../config/database.js';

const logger = createLogger('AI-Service');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Holt die AI-Stil-Konfiguration aus der Datenbank
 */
async function getStyleConfig() {
  try {
    const configs = await prisma.config.findMany({
      where: {
        key: {
          in: ['ai_tone', 'ai_target_audience', 'ai_writing_style', 'ai_length_preference']
        }
      }
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    return {
      tone: configMap.ai_tone || process.env.AI_TONE || 'professional but accessible',
      targetAudience: configMap.ai_target_audience || process.env.AI_TARGET_AUDIENCE || 'AI enthusiasts and developers',
      writingStyle: configMap.ai_writing_style || 'clear, engaging, informative',
      lengthPreference: configMap.ai_length_preference || 'concise but comprehensive'
    };
  } catch (error) {
    logger.warn('Could not fetch style config, using defaults:', error.message);
    return {
      tone: process.env.AI_TONE || 'professional but accessible',
      targetAudience: process.env.AI_TARGET_AUDIENCE || 'AI enthusiasts and developers',
      writingStyle: 'clear, engaging, informative',
      lengthPreference: 'concise but comprehensive'
    };
  }
}

/**
 * Generiert eine Zusammenfassung für einen Artikel
 */
export async function summarizeArticle(article) {
  try {
    const styleConfig = await getStyleConfig();

    const prompt = `Fasse diesen Artikel über künstliche Intelligenz zusammen:

Titel: ${article.title}
Inhalt: ${article.content}

Schreibe die Zusammenfassung in einem ${styleConfig.tone} Ton für ${styleConfig.targetAudience}.
Die Zusammenfassung sollte ${styleConfig.lengthPreference} sein (2-3 Sätze).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Experte für künstliche Intelligenz und schreibst prägnante, informative Zusammenfassungen.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const summary = completion.choices[0].message.content.trim();
    logger.info(`Generated summary for article: ${article.title}`);

    return summary;
  } catch (error) {
    logger.error('Error generating article summary:', error);
    throw error;
  }
}

/**
 * Generiert einen Newsletter aus mehreren Artikeln
 */
export async function generateNewsletter(articles, title = null) {
  try {
    const styleConfig = await getStyleConfig();

    // Erstelle eine Liste der Artikel mit Zusammenfassungen
    const articlesList = articles.map((article, index) => {
      return `${index + 1}. **${article.title}**
   Quelle: ${article.source?.name || 'Unbekannt'}
   Zusammenfassung: ${article.summary || article.content?.substring(0, 200) + '...'}
   Link: ${article.url}`;
    }).join('\n\n');

    const prompt = `Erstelle einen Newsletter über künstliche Intelligenz basierend auf diesen Artikeln:

${articlesList}

Anforderungen:
- Ton: ${styleConfig.tone}
- Zielgruppe: ${styleConfig.targetAudience}
- Stil: ${styleConfig.writingStyle}
- Länge: ${styleConfig.lengthPreference}

Der Newsletter sollte:
1. Eine einleitende Übersicht über die wichtigsten Themen dieser Woche
2. Die Artikel in logischer Reihenfolge präsentieren (nach Wichtigkeit/Thema gruppiert)
3. Jeden Artikel mit einem kurzen Kommentar oder Einordnung versehen
4. Mit einem Ausblick oder Call-to-Action enden

Schreibe den Newsletter in Markdown-Format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Newsletter-Autor im Bereich künstliche Intelligenz. Dein Schreibstil ist informativ, zugänglich und bringt komplexe Themen auf den Punkt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const newsletterContent = completion.choices[0].message.content.trim();
    logger.info('Generated newsletter successfully');

    return newsletterContent;
  } catch (error) {
    logger.error('Error generating newsletter:', error);
    throw error;
  }
}

/**
 * Bewertet die Relevanz eines Artikels für den Newsletter
 */
export async function scoreArticleRelevance(article) {
  try {
    const prompt = `Bewerte die Relevanz dieses Artikels für einen AI-Newsletter auf einer Skala von 1-10:

Titel: ${article.title}
Inhalt: ${article.content?.substring(0, 500)}...

Berücksichtige:
- Neuigkeitswert
- Relevanz für AI-Community
- Qualität der Information
- Einzigartigkeit

Antworte nur mit einer Zahl von 1-10.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = parseInt(completion.choices[0].message.content.trim());
    return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
  } catch (error) {
    logger.error('Error scoring article relevance:', error);
    return 5; // Default score
  }
}

export default {
  summarizeArticle,
  generateNewsletter,
  scoreArticleRelevance
};
