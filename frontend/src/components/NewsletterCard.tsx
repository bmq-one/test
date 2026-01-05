'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface NewsletterCardProps {
  newsletter: any;
  showFullContent?: boolean;
}

export default function NewsletterCard({ newsletter, showFullContent = false }: NewsletterCardProps) {
  const publishedDate = newsletter.publishedAt
    ? format(new Date(newsletter.publishedAt), 'dd. MMMM yyyy', { locale: de })
    : 'Nicht veröffentlicht';

  return (
    <article className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">{newsletter.title}</h2>
          <p className="text-sm text-gray-500">
            Veröffentlicht am {publishedDate}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            newsletter.status === 'PUBLISHED'
              ? 'bg-green-100 text-green-800'
              : newsletter.status === 'DRAFT'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {newsletter.status === 'PUBLISHED'
            ? 'Veröffentlicht'
            : newsletter.status === 'DRAFT'
            ? 'Entwurf'
            : 'Archiviert'}
        </span>
      </div>

      {showFullContent ? (
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown>{newsletter.content}</ReactMarkdown>
        </div>
      ) : (
        <div>
          <div className="prose max-w-none mb-4">
            <ReactMarkdown>
              {newsletter.content.substring(0, 300) + '...'}
            </ReactMarkdown>
          </div>
          <Link
            href={`/newsletters/${newsletter.id}`}
            className="btn btn-primary inline-block"
          >
            Weiterlesen →
          </Link>
        </div>
      )}

      {newsletter.articles && newsletter.articles.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-600">
            📰 Enthält {newsletter.articles.length} Artikel
          </p>
        </div>
      )}
    </article>
  );
}
