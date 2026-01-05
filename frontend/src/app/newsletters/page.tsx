'use client';

import { useState, useEffect } from 'react';
import { newsletterApi } from '@/lib/api';
import NewsletterCard from '@/components/NewsletterCard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchNewsletters(currentPage);
  }, [currentPage]);

  const fetchNewsletters = async (page: number) => {
    try {
      setLoading(true);
      const response = await newsletterApi.getAll({ page, limit: 10, status: 'PUBLISHED' });
      setNewsletters(response.data.newsletters);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Alle Newsletter</h1>
        <p className="text-gray-600">
          Durchsuche alle veröffentlichten AI-Newsletter
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : newsletters.length === 0 ? (
        <div className="card text-center py-12 bg-gray-50">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold mb-2">Noch keine Newsletter vorhanden</h3>
          <p className="text-gray-600">
            Es wurden noch keine Newsletter veröffentlicht.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {newsletters.map((newsletter) => (
              <NewsletterCard key={newsletter.id} newsletter={newsletter} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Zurück
              </button>
              <span className="flex items-center px-4">
                Seite {currentPage} von {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
