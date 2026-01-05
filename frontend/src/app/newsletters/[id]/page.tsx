'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { newsletterApi } from '@/lib/api';
import NewsletterCard from '@/components/NewsletterCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function NewsletterDetailPage() {
  const params = useParams();
  const [newsletter, setNewsletter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchNewsletter(params.id as string);
    }
  }, [params.id]);

  const fetchNewsletter = async (id: string) => {
    try {
      setLoading(true);
      const response = await newsletterApi.getById(id);
      setNewsletter(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Newsletter nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !newsletter) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card bg-red-50 border border-red-200 text-red-700">
          <h2 className="text-xl font-bold mb-2">Fehler</h2>
          <p>{error || 'Newsletter konnte nicht geladen werden'}</p>
          <Link href="/newsletters" className="btn btn-primary mt-4 inline-block">
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/newsletters" className="btn btn-secondary mb-6 inline-block">
        ← Zurück zur Übersicht
      </Link>

      <NewsletterCard newsletter={newsletter} showFullContent />

      {/* Article Sources */}
      {newsletter.articles && newsletter.articles.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-xl font-bold mb-4">Quellen ({newsletter.articles.length})</h3>
          <div className="space-y-3">
            {newsletter.articles.map((item: any) => (
              <div key={item.id} className="border-l-4 border-primary-500 pl-4 py-2">
                <a
                  href={item.article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary-600 hover:underline"
                >
                  {item.article.title}
                </a>
                <p className="text-sm text-gray-600 mt-1">
                  Quelle: {item.article.source?.name || 'Unbekannt'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
