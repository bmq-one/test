'use client';

import { useState, useEffect } from 'react';
import { newsletterApi, sourcesApi, articlesApi } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, sourcesRes] = await Promise.all([
        articlesApi.getStats(),
        sourcesApi.getAll()
      ]);
      setStats(statsRes.data);
      setSources(sourcesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewsletter = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      await newsletterApi.generate({ autoPublish: false });
      setMessage({ type: 'success', text: 'Newsletter erfolgreich erstellt!' });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Fehler beim Erstellen des Newsletters'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleFetchArticles = async () => {
    try {
      setFetching(true);
      setMessage(null);
      const response = await sourcesApi.fetchAll();
      setMessage({
        type: 'success',
        text: `Erfolgreich! ${response.data.successful} von ${response.data.total} Quellen geladen.`
      });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: 'Fehler beim Laden der Artikel'
      });
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      {/* Messages */}
      {message && (
        <div
          className={`card mb-6 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">📰 Newsletter erstellen</h2>
          <p className="text-gray-600 mb-4">
            Generiere einen neuen Newsletter aus den aktuellen Artikeln.
          </p>
          <button
            onClick={handleGenerateNewsletter}
            disabled={generating}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {generating ? 'Wird erstellt...' : 'Newsletter generieren'}
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">🔄 Artikel abrufen</h2>
          <p className="text-gray-600 mb-4">
            Lade neue Artikel von allen aktiven Quellen.
          </p>
          <button
            onClick={handleFetchArticles}
            disabled={fetching}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {fetching ? 'Wird geladen...' : 'Artikel abrufen'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">{stats.total}</div>
            <div className="text-sm text-gray-600">Gesamt Artikel</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.processed}</div>
            <div className="text-sm text-gray-600">Verarbeitet</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.included}</div>
            <div className="text-sm text-gray-600">Im Newsletter</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.recentCount}</div>
            <div className="text-sm text-gray-600">Letzte 24h</div>
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Quellen ({sources.length})</h2>
          <Link href="/admin/sources" className="btn btn-secondary">
            Quellen verwalten
          </Link>
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p>Noch keine Quellen konfiguriert.</p>
            <Link href="/admin/sources" className="btn btn-primary mt-4 inline-block">
              Erste Quelle hinzufügen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source: any) => (
              <div
                key={source.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{source.name}</h3>
                  <p className="text-sm text-gray-600">{source.url}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {source.type}
                    </span>
                    {source.category && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        {source.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {source._count?.articles || 0} Artikel
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      source.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {source.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
