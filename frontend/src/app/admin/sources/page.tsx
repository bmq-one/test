'use client';

import { useState, useEffect } from 'react';
import { sourcesApi } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function SourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'RSS' as 'RSS' | 'WEBSITE' | 'API',
    category: '',
    isActive: true
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await sourcesApi.getAll();
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sourcesApi.create(formData);
      setShowForm(false);
      setFormData({
        name: '',
        url: '',
        type: 'RSS',
        category: '',
        isActive: true
      });
      fetchSources();
    } catch (error) {
      console.error('Error creating source:', error);
      alert('Fehler beim Erstellen der Quelle');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchtest du diese Quelle wirklich löschen?')) return;

    try {
      await sourcesApi.delete(id);
      fetchSources();
    } catch (error) {
      console.error('Error deleting source:', error);
      alert('Fehler beim Löschen der Quelle');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await sourcesApi.update(id, { isActive: !isActive });
      fetchSources();
    } catch (error) {
      console.error('Error updating source:', error);
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/admin" className="text-primary-600 hover:underline mb-2 inline-block">
            ← Zurück zum Dashboard
          </Link>
          <h1 className="text-4xl font-bold">Quellen verwalten</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Abbrechen' : '+ Neue Quelle'}
        </button>
      </div>

      {/* Add Source Form */}
      {showForm && (
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-6">Neue Quelle hinzufügen</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="z.B. OpenAI Blog"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">URL *</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input"
                placeholder="https://..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Typ *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input"
                >
                  <option value="RSS">RSS Feed</option>
                  <option value="WEBSITE">Website</option>
                  <option value="API">API</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kategorie</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                  placeholder="z.B. AI Research"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm">Sofort aktivieren</label>
            </div>

            <button type="submit" className="btn btn-primary">
              Quelle hinzufügen
            </button>
          </form>
        </div>
      )}

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📡</div>
          <h3 className="text-xl font-bold mb-2">Noch keine Quellen</h3>
          <p className="text-gray-600">Füge deine erste Quelle hinzu, um loszulegen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => (
            <div key={source.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{source.name}</h3>
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
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline text-sm"
                  >
                    {source.url}
                  </a>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {source.type}
                    </span>
                    {source.category && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        {source.category}
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                      {source._count?.articles || 0} Artikel
                    </span>
                  </div>
                  {source.lastFetched && (
                    <p className="text-xs text-gray-500 mt-2">
                      Zuletzt aktualisiert: {new Date(source.lastFetched).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(source.id, source.isActive)}
                    className="btn btn-secondary text-sm"
                  >
                    {source.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="btn btn-danger text-sm"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
