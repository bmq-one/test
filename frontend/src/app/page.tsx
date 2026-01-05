'use client';

import { useEffect, useState } from 'react';
import { newsletterApi } from '@/lib/api';
import NewsletterCard from '@/components/NewsletterCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function HomePage() {
  const [latestNewsletter, setLatestNewsletter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestNewsletter();
  }, []);

  const fetchLatestNewsletter = async () => {
    try {
      setLoading(true);
      const response = await newsletterApi.getLatest();
      setLatestNewsletter(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden des Newsletters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
          🤖 AI Newsletter
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Dein persönlicher Newsletter über künstliche Intelligenz - automatisch kuratiert,
          mit persönlichem Stil und immer auf dem neuesten Stand.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="card text-center">
          <div className="text-4xl mb-3">📰</div>
          <h3 className="font-bold text-lg mb-2">Automatisch Kuratiert</h3>
          <p className="text-gray-600 text-sm">
            Sammelt automatisch die besten AI-News aus verschiedenen Quellen
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="font-bold text-lg mb-2">Persönlicher Stil</h3>
          <p className="text-gray-600 text-sm">
            KI-generierter Content mit deinem individuellen Schreibstil
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-bold text-lg mb-2">Zielgruppen-Optimiert</h3>
          <p className="text-gray-600 text-sm">
            Perfekt zugeschnitten auf AI-Enthusiasten und Entwickler
          </p>
        </div>
      </div>

      {/* Latest Newsletter */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Neuester Newsletter</h2>
          <Link href="/newsletters" className="btn btn-secondary">
            Alle Newsletter →
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="card bg-red-50 border border-red-200 text-red-700">
            <p>{error}</p>
            <p className="text-sm mt-2">
              Möglicherweise wurde noch kein Newsletter erstellt.
              <Link href="/admin" className="underline ml-1">Zum Admin-Bereich</Link>
            </p>
          </div>
        )}

        {!loading && !error && latestNewsletter && (
          <NewsletterCard newsletter={latestNewsletter} showFullContent />
        )}

        {!loading && !error && !latestNewsletter && (
          <div className="card text-center py-12 bg-gray-50">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold mb-2">Noch keine Newsletter vorhanden</h3>
            <p className="text-gray-600 mb-4">
              Erstelle deinen ersten Newsletter im Admin-Bereich
            </p>
            <Link href="/admin" className="btn btn-primary">
              Zum Admin-Bereich
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
