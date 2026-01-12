import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Case } from '../types';

const API_BASE = '/api';

function ComplianceDashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCases();
  }, [filter]);

  const loadCases = async () => {
    setLoading(true);
    setError('');

    try {
      const url = filter
        ? `${API_BASE}/compliance/cases?status=${filter}`
        : `${API_BASE}/compliance/cases`;

      const response = await fetch(url);

      if (!response.ok) throw new Error('Fehler beim Laden der Fälle');

      const data = await response.json();
      setCases(data);
    } catch (err) {
      setError('Fehler beim Laden der Fälle');
    } finally {
      setLoading(false);
    }
  };

  const sendComplianceMessage = async () => {
    if (!message.trim() || !selectedCase) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/compliance/cases/${selectedCase.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        }
      );

      if (!response.ok) throw new Error('Fehler beim Senden der Nachricht');

      setMessage('');
      await loadCases();

      // Aktualisiere den ausgewählten Fall
      const updatedCase = cases.find((c) => c.id === selectedCase.id);
      if (updatedCase) {
        setSelectedCase(updatedCase);
      }
    } catch (err) {
      setError('Fehler beim Senden der Nachricht');
    } finally {
      setLoading(false);
    }
  };

  const closeCase = async (caseId: number) => {
    if (!confirm('Möchten Sie diesen Fall wirklich schließen?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/compliance/cases/${caseId}/close`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Fehler beim Schließen des Falls');

      await loadCases();
      setSelectedCase(null);
    } catch (err) {
      setError('Fehler beim Schließen des Falls');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (category?: string) => {
    if (!category) return null;

    const labels = {
      green: '🟢 GRÜN',
      yellow: '🟡 GELB',
      red: '🔴 ROT',
    };

    return (
      <span className={`risk-badge risk-${category}`}>
        {labels[category as keyof typeof labels]}
      </span>
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      analyzing: 'In Analyse',
      green: 'Grün - Unproblematisch',
      yellow: 'Gelb - Prüfung erforderlich',
      red: 'Rot - Hohes Risiko',
      closed: 'Geschlossen',
    };

    return labels[status] || status;
  };

  const filteredCases = cases;

  const redCases = cases.filter((c) => c.risk_category === 'red').length;
  const yellowCases = cases.filter((c) => c.risk_category === 'yellow').length;
  const greenCases = cases.filter((c) => c.risk_category === 'green').length;

  return (
    <div className="portal-container">
      <div className="portal-content">
        <Link to="/" className="back-button">← Zurück</Link>

        <h1>👔 Compliance-Dashboard</h1>
        <p className="subtitle">Übersicht aller Whistleblowing-Meldungen</p>

        <div className="info-box" style={{ marginBottom: '20px' }}>
          <h3>📊 Statistik</h3>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <div>
              <strong>Gesamt:</strong> {cases.length}
            </div>
            <div>
              <strong>🔴 Rot:</strong> {redCases}
            </div>
            <div>
              <strong>🟡 Gelb:</strong> {yellowCases}
            </div>
            <div>
              <strong>🟢 Grün:</strong> {greenCases}
            </div>
          </div>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === null ? 'active' : ''}`}
            onClick={() => setFilter(null)}
          >
            Alle
          </button>
          <button
            className={`filter-btn ${filter === 'red' ? 'active' : ''}`}
            onClick={() => setFilter('red')}
          >
            🔴 Rot
          </button>
          <button
            className={`filter-btn ${filter === 'yellow' ? 'active' : ''}`}
            onClick={() => setFilter('yellow')}
          >
            🟡 Gelb
          </button>
          <button
            className={`filter-btn ${filter === 'green' ? 'active' : ''}`}
            onClick={() => setFilter('green')}
          >
            🟢 Grün
          </button>
          <button
            className={`filter-btn ${filter === 'closed' ? 'active' : ''}`}
            onClick={() => setFilter('closed')}
          >
            Geschlossen
          </button>
        </div>

        {loading && <p>Lädt...</p>}
        {error && <div className="error-message">{error}</div>}

        <div>
          {filteredCases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="case-card"
              onClick={() => setSelectedCase(caseItem)}
            >
              <div className="case-header">
                <div>
                  <strong>Fall #{caseItem.id}</strong>
                  {' - '}
                  {new Date(caseItem.created_at).toLocaleDateString('de-DE')}
                </div>
                {getRiskBadge(caseItem.risk_category)}
              </div>
              <p>
                <strong>Status:</strong> {getStatusLabel(caseItem.status)}
              </p>
              <p style={{ marginTop: '10px', color: '#666' }}>
                {caseItem.initial_report.substring(0, 150)}
                {caseItem.initial_report.length > 150 ? '...' : ''}
              </p>
            </div>
          ))}

          {filteredCases.length === 0 && !loading && (
            <div className="info-box">
              <p>Keine Fälle gefunden.</p>
            </div>
          )}
        </div>

        {selectedCase && (
          <div className="modal" onClick={() => setSelectedCase(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Fall #{selectedCase.id}</h2>
                <button className="close-btn" onClick={() => setSelectedCase(null)}>
                  Schließen
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p>
                  <strong>Erstellt:</strong>{' '}
                  {new Date(selectedCase.created_at).toLocaleString('de-DE')}
                </p>
                <p>
                  <strong>Status:</strong> {getStatusLabel(selectedCase.status)}
                </p>
                {selectedCase.risk_category && (
                  <div>{getRiskBadge(selectedCase.risk_category)}</div>
                )}
              </div>

              <div className="message-box">
                <h3>Meldung</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedCase.initial_report}</p>
              </div>

              {selectedCase.ai_assessment && (
                <div className="message-box">
                  <h3>🤖 KI-Bewertung</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{selectedCase.ai_assessment}</p>
                </div>
              )}

              <div className="message-box">
                <h3>Kommunikation</h3>
                {selectedCase.messages.map((msg) => (
                  <div key={msg.id} className={`message message-${msg.sender}`}>
                    <div className="message-header">
                      {msg.sender === 'whistleblower' && '👤 Whistleblower'}
                      {msg.sender === 'ai' && '🤖 KI-System'}
                      {msg.sender === 'compliance' && '👔 Compliance'}
                      {' - '}
                      {new Date(msg.created_at).toLocaleString('de-DE')}
                    </div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))}
              </div>

              {selectedCase.status !== 'closed' && (
                <div style={{ marginTop: '20px' }}>
                  <h3>Antwort senden</h3>
                  <textarea
                    placeholder="Ihre Nachricht an den Whistleblower..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={loading}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={sendComplianceMessage} disabled={loading}>
                      {loading ? 'Wird gesendet...' : 'Nachricht senden'}
                    </button>
                    <button
                      onClick={() => closeCase(selectedCase.id)}
                      disabled={loading}
                      style={{ background: '#f44336' }}
                    >
                      Fall schließen
                    </button>
                  </div>
                </div>
              )}

              {selectedCase.status === 'closed' && (
                <div className="info-box" style={{ marginTop: '20px' }}>
                  <h3>✓ Fall geschlossen</h3>
                  <p>
                    Dieser Fall wurde am{' '}
                    {selectedCase.closed_at
                      ? new Date(selectedCase.closed_at).toLocaleString('de-DE')
                      : 'unbekannt'}{' '}
                    geschlossen.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplianceDashboard;
